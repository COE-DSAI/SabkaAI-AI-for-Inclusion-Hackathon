"""
Vonage Voice Real-time AI Safety Call Service

Integrates Vonage Voice API with AI providers (Deepgram + ElevenLabs + MegaLLM)
for real-time AI-powered safety calls.

Architecture:
1. User Phone ↔ Vonage ↔ WebSocket ↔ Backend (16kHz PCM - Native!)
2. Backend: Deepgram (STT) → MegaLLM → ElevenLabs (TTS)
3. No codec conversion needed - Vonage uses 16kHz Linear PCM natively!

Author: Claude (Anthropic)
"""

import asyncio
import json
import logging
import base64
import jwt
import time
from typing import Dict, Optional, Callable
from datetime import datetime
import uuid
from pathlib import Path

import httpx
from deepgram import DeepgramClient
from elevenlabs.client import ElevenLabs

from config import settings
from services.safety_call.conversation import ConversationPromptBuilder, ConversationContext

logger = logging.getLogger(__name__)


class VonageVoiceCallSession:
    """
    Represents an active Vonage voice call session with AI integration.
    """

    def __init__(
        self,
        call_uuid: str,
        user_id: int,
        user_name: str,
        user_phone: str,
        location: Optional[Dict[str, float]] = None
    ):
        self.call_uuid = call_uuid
        self.user_id = user_id
        self.user_name = user_name
        self.user_phone = user_phone
        self.location = location

        self.started_at = datetime.utcnow()
        self.ended_at: Optional[datetime] = None
        self.status = "initiating"  # initiating, ringing, answered, completed, failed

        # WebSocket connection
        self.websocket = None

        # AI provider instances
        self.deepgram_client = None
        self.deepgram_connection = None
        self.elevenlabs_client = None
        self.llm_client = None

        # Conversation state
        self.conversation_history = []
        self.system_instructions = ""

        # Transcript tracking
        self.transcripts = []
        self.alerts_triggered = []

        # Callbacks
        self.on_distress_detected: Optional[Callable] = None

    def set_websocket(self, websocket):
        """Set the WebSocket connection for audio streaming."""
        self.websocket = websocket

    def add_transcript(self, text: str, speaker: str = "user"):
        """Add transcript to session history."""
        self.transcripts.append({
            "timestamp": datetime.utcnow().isoformat(),
            "speaker": speaker,
            "text": text
        })

    def get_duration_seconds(self) -> int:
        """Get call duration in seconds."""
        end_time = self.ended_at or datetime.utcnow()
        return int((end_time - self.started_at).total_seconds())

    def end_call(self):
        """Mark call as ended."""
        self.ended_at = datetime.utcnow()
        self.status = "completed"


class VonageVoiceCallService:
    """
    Service for managing Vonage Voice calls with AI integration.
    """

    def __init__(self):
        """Initialize Vonage Voice client."""
        self.test_mode = settings.test_mode

        # Vonage API configuration
        self.api_key = settings.vonage_api_key
        self.api_secret = settings.vonage_api_secret
        self.application_id = settings.vonage_application_id
        self.private_key_path = settings.vonage_private_key_path
        self.vonage_number = settings.vonage_number

        # HTTP client for Vonage API
        self.http_client = httpx.AsyncClient(timeout=30.0)

        # Active call sessions
        self.active_calls: Dict[str, VonageVoiceCallSession] = {}

        logger.info("Vonage Voice service initialized")

    def _generate_jwt(self) -> str:
        """
        Generate JWT token for Vonage API authentication.

        Returns:
            JWT token string
        """
        try:
            # Read private key
            private_key = Path(self.private_key_path).read_text()

            # JWT payload
            now = int(time.time())
            payload = {
                "application_id": self.application_id,
                "iat": now,
                "exp": now + 300,  # 5 minutes expiry
                "jti": str(uuid.uuid4())
            }

            # Generate JWT
            token = jwt.encode(
                payload,
                private_key,
                algorithm="RS256"
            )

            return token

        except Exception as e:
            logger.error(f"Failed to generate JWT: {e}")
            raise

    async def initiate_safety_call(
        self,
        user_id: int,
        user_name: str,
        user_phone: str,
        location: Optional[Dict[str, float]] = None
    ) -> Dict:
        """
        Initiate an outbound AI-powered safety call to user's phone via Vonage.

        Args:
            user_id: User's database ID
            user_name: User's name
            user_phone: User's phone number (E.164 format: +919056690327)
            location: Optional location dict with lat/lng

        Returns:
            Dict with call_uuid, status, and session info
        """
        if self.test_mode:
            test_call_uuid = f"test-vonage-{uuid.uuid4().hex[:16]}"
            logger.info(f"[TEST MODE] Initiating Vonage safety call to {user_phone}")

            session = VonageVoiceCallSession(
                call_uuid=test_call_uuid,
                user_id=user_id,
                user_name=user_name,
                user_phone=user_phone,
                location=location
            )
            session.status = "answered"
            self.active_calls[test_call_uuid] = session

            # Initialize AI providers in test mode
            await self._initialize_ai_providers(session)

            return {
                "success": True,
                "call_uuid": test_call_uuid,
                "status": "answered",
                "test_mode": True,
                "message": "Test mode: Call simulated successfully"
            }

        try:
            # Generate JWT for authentication
            jwt_token = self._generate_jwt()

            # Build WebSocket URI for audio streaming
            backend_url = settings.backend_url.replace("http://", "").replace("https://", "")
            ws_uri = f"wss://{backend_url}/api/safety-call/vonage-stream"

            # NCCO (Nexmo Call Control Objects) - defines call flow
            ncco = [
                {
                    "action": "talk",
                    "text": f"Hello {user_name}, this is your Protego safety companion. I'm here to help. Please hold for just a moment while I connect.",
                    "language": "en-IN",  # Indian English
                    "style": 1,  # Conversational style
                    "premium": True  # Better quality voice
                },
                {
                    "action": "connect",
                    "endpoint": [
                        {
                            "type": "websocket",
                            "uri": ws_uri,
                            "content-type": "audio/l16;rate=16000",  # 16kHz Linear PCM
                            "headers": {
                                "user_id": str(user_id),
                                "user_name": user_name,
                                "user_phone": user_phone
                            }
                        }
                    ],
                    "eventUrl": [f"https://{backend_url}/api/safety-call/vonage-events"],
                    "eventMethod": "POST"
                }
            ]

            # Make API call to initiate call
            response = await self.http_client.post(
                "https://api.nexmo.com/v1/calls",
                headers={
                    "Authorization": f"Bearer {jwt_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "to": [
                        {
                            "type": "phone",
                            "number": user_phone
                        }
                    ],
                    "from": {
                        "type": "phone",
                        "number": self.vonage_number
                    },
                    "ncco": ncco,
                    "event_url": [f"https://{backend_url}/api/safety-call/vonage-status"],
                    "event_method": "POST"
                }
            )

            response.raise_for_status()
            result = response.json()

            call_uuid = result["uuid"]
            logger.info(f"Vonage call initiated to {user_phone}. UUID: {call_uuid}")

            # Create session
            session = VonageVoiceCallSession(
                call_uuid=call_uuid,
                user_id=user_id,
                user_name=user_name,
                user_phone=user_phone,
                location=location
            )
            session.status = result.get("status", "started")
            self.active_calls[call_uuid] = session

            # Initialize AI providers
            await self._initialize_ai_providers(session)

            return {
                "success": True,
                "call_uuid": call_uuid,
                "status": result.get("status"),
                "test_mode": False
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"Vonage API error: {e.response.status_code} - {e.response.text}")
            return {
                "success": False,
                "error": f"Vonage API error: {e.response.text}"
            }
        except Exception as e:
            logger.error(f"Unexpected error initiating Vonage call: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _initialize_ai_providers(self, session: VonageVoiceCallSession):
        """
        Initialize AI providers (Deepgram, ElevenLabs, MegaLLM) for the call session.

        Args:
            session: The call session to initialize AI for
        """
        try:
            # Build conversation context
            context = ConversationContext(
                user_name=session.user_name,
                user_location=session.location,
                time_of_day=datetime.utcnow().strftime("%I:%M %p")
            )

            system_instructions = ConversationPromptBuilder.build_safety_call_prompt(context)
            session.system_instructions = system_instructions

            # Initialize conversation history
            session.conversation_history = [
                {"role": "system", "content": system_instructions}
            ]

            # Initialize Deepgram client
            session.deepgram_client = DeepgramClient(api_key=settings.deepgram_api_key)

            # Initialize ElevenLabs client
            session.elevenlabs_client = ElevenLabs(api_key=settings.elevenlabs_api_key)

            # Initialize MegaLLM client
            session.llm_client = httpx.AsyncClient(
                base_url=settings.megallm_endpoint,
                headers={
                    "Authorization": f"Bearer {settings.megallm_api_key}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )

            logger.info(f"AI providers initialized for call {session.call_uuid}")

        except Exception as e:
            logger.error(f"Failed to initialize AI providers for call {session.call_uuid}: {e}")

    async def handle_audio_from_user(self, call_uuid: str, audio_data: bytes):
        """
        Handle incoming audio from user (via Vonage WebSocket).

        Vonage sends 16kHz Linear PCM - no conversion needed!

        Args:
            call_uuid: Call UUID
            audio_data: Raw 16kHz Linear PCM audio bytes
        """
        session = self.active_calls.get(call_uuid)
        if not session:
            logger.warning(f"Received audio for unknown call: {call_uuid}")
            return

        try:
            # Send audio directly to Deepgram for transcription
            # Vonage audio is already 16kHz PCM - perfect for Deepgram!
            if session.deepgram_connection:
                session.deepgram_connection.send(audio_data)

        except Exception as e:
            logger.error(f"Error handling user audio for call {call_uuid}: {e}")

    async def handle_transcript(self, call_uuid: str, transcript: str):
        """
        Handle transcript from Deepgram.

        Args:
            call_uuid: Call UUID
            transcript: Transcribed text from user
        """
        session = self.active_calls.get(call_uuid)
        if not session:
            return

        session.add_transcript(transcript, "user")
        logger.info(f"Transcript from call {call_uuid}: {transcript}")

        # Add to conversation history
        session.conversation_history.append({"role": "user", "content": transcript})

        # Get AI response from MegaLLM
        ai_response = await self._get_llm_response(session)

        # Add AI response to history
        session.conversation_history.append({"role": "assistant", "content": ai_response})
        session.add_transcript(ai_response, "assistant")

        # Convert to speech with ElevenLabs
        await self._text_to_speech(session, ai_response)

        # TODO: Implement distress detection
        # For now, just log

    async def _get_llm_response(self, session: VonageVoiceCallSession) -> str:
        """
        Get AI response from MegaLLM (Claude-Opus-4.5).

        Args:
            session: Call session

        Returns:
            AI response text
        """
        try:
            response = await session.llm_client.post(
                "",  # Base URL already includes /v1/chat/completions
                json={
                    "model": settings.megallm_model,
                    "messages": session.conversation_history,
                    "temperature": 0.8,
                    "max_tokens": 150
                }
            )

            response.raise_for_status()
            result = response.json()

            ai_message = result["choices"][0]["message"]["content"]
            return ai_message.strip()

        except Exception as e:
            logger.error(f"MegaLLM API error for call {session.call_uuid}: {e}")
            return "I'm here with you. Can you tell me more about where you are?"

    async def _text_to_speech(self, session: VonageVoiceCallSession, text: str):
        """
        Convert text to speech using ElevenLabs and stream to Vonage.

        Args:
            session: Call session
            text: Text to convert to speech
        """
        try:
            logger.info(f"Converting to speech for call {session.call_uuid}: {text[:50]}...")

            # Generate audio with ElevenLabs
            audio_generator = session.elevenlabs_client.text_to_speech.convert(
                voice_id=settings.elevenlabs_voice_id,
                text=text,
                model_id=settings.elevenlabs_model,
                output_format="pcm_16000"  # 16kHz PCM - matches Vonage!
            )

            # Stream audio chunks to Vonage WebSocket
            chunk_count = 0
            for audio_chunk in audio_generator:
                if session.websocket:
                    # Send raw PCM audio directly to Vonage
                    # No conversion needed - both use 16kHz PCM!
                    await session.websocket.send_bytes(audio_chunk)
                    chunk_count += 1

            logger.info(f"Streamed {chunk_count} audio chunks to call {session.call_uuid}")

        except Exception as e:
            logger.error(f"ElevenLabs TTS error for call {session.call_uuid}: {e}")

    async def end_call(self, call_uuid: str) -> Optional[Dict]:
        """
        End an active Vonage call.

        Args:
            call_uuid: Call UUID to end

        Returns:
            Call summary dict
        """
        session = self.active_calls.pop(call_uuid, None)
        if not session:
            logger.warning(f"Attempted to end unknown call: {call_uuid}")
            return None

        # Clean up AI providers
        if session.deepgram_connection:
            try:
                session.deepgram_connection.finish()
            except Exception as e:
                logger.error(f"Error closing Deepgram connection: {e}")

        if session.llm_client:
            await session.llm_client.aclose()

        # End Vonage call if still active (not for test calls)
        if not self.test_mode and not call_uuid.startswith("test-"):
            try:
                jwt_token = self._generate_jwt()
                await self.http_client.put(
                    f"https://api.nexmo.com/v1/calls/{call_uuid}",
                    headers={
                        "Authorization": f"Bearer {jwt_token}",
                        "Content-Type": "application/json"
                    },
                    json={"action": "hangup"}
                )
            except Exception as e:
                logger.error(f"Error ending Vonage call {call_uuid}: {e}")

        session.end_call()

        summary = {
            "call_uuid": session.call_uuid,
            "user_id": session.user_id,
            "user_name": session.user_name,
            "user_phone": session.user_phone,
            "started_at": session.started_at.isoformat(),
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
            "duration_seconds": session.get_duration_seconds(),
            "status": session.status,
            "transcripts": session.transcripts,
            "alerts_triggered": session.alerts_triggered
        }

        logger.info(
            f"Ended Vonage call {call_uuid}: duration={summary['duration_seconds']}s, "
            f"status={summary['status']}"
        )

        return summary

    def get_active_call(self, call_uuid: str) -> Optional[VonageVoiceCallSession]:
        """Get active call session by UUID."""
        return self.active_calls.get(call_uuid)

    def get_active_call_count(self) -> int:
        """Get count of active calls."""
        return len(self.active_calls)

    async def cleanup(self):
        """Cleanup service resources."""
        await self.http_client.aclose()


# Global service instance
vonage_voice_service = VonageVoiceCallService()
