"""
Twilio Voice Real-time AI Safety Call Service

Integrates Twilio Voice API with AI providers (Deepgram + ElevenLabs or Azure)
for real-time AI-powered safety calls.

Architecture:
1. Initiate outbound Twilio call to user's phone
2. When call connects, establish WebSocket with Twilio Media Streams
3. Bidirectional audio flow:
   - User Audio: Twilio → Backend → Deepgram (STT) → LLM → ElevenLabs (TTS) → Twilio
   - AI Audio: ElevenLabs → Backend → Twilio Media Stream → User

Author: Claude (Anthropic)
"""

import asyncio
import json
import logging
import base64
from typing import Dict, Optional, Callable
from datetime import datetime
import uuid

from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream
from twilio.base.exceptions import TwilioRestException

from config import settings
from services.ai import ProviderFactory, AudioConfig, ConversationConfig
from services.safety_call.conversation import ConversationPromptBuilder, ConversationContext
from services.audio_codec import audio_codec

logger = logging.getLogger(__name__)


class TwilioVoiceCallSession:
    """
    Represents an active Twilio voice call session with AI integration.
    """

    def __init__(
        self,
        call_sid: str,
        user_id: int,
        user_name: str,
        user_phone: str,
        location: Optional[Dict[str, float]] = None
    ):
        self.call_sid = call_sid
        self.user_id = user_id
        self.user_name = user_name
        self.user_phone = user_phone
        self.location = location

        self.started_at = datetime.utcnow()
        self.ended_at: Optional[datetime] = None
        self.status = "initiating"  # initiating, ringing, connected, completed, failed

        # AI provider instance
        self.ai_provider = None

        # Audio stream state
        self.stream_sid: Optional[str] = None
        self.is_streaming = False
        self.websocket = None  # WebSocket connection for sending audio to Twilio

        # Transcript tracking
        self.transcripts = []
        self.alerts_triggered = []

        # Callbacks
        self.on_distress_detected: Optional[Callable] = None

    def set_websocket(self, websocket):
        """Set the WebSocket connection for sending audio to Twilio."""
        self.websocket = websocket

    def set_stream_sid(self, stream_sid: str):
        """Set the Twilio Media Stream SID when stream connects."""
        self.stream_sid = stream_sid
        self.is_streaming = True
        logger.info(f"Stream {stream_sid} connected for call {self.call_sid}")

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
        self.is_streaming = False


class TwilioVoiceCallService:
    """
    Service for managing Twilio Voice calls with AI integration.
    """

    def __init__(self):
        """Initialize Twilio Voice client."""
        self.test_mode = settings.test_mode

        if not self.test_mode:
            try:
                self.client = Client(
                    settings.twilio_account_sid,
                    settings.twilio_auth_token
                )
            except Exception as e:
                logger.error(f"Failed to initialize Twilio client: {e}")
                self.client = None
        else:
            self.client = None
            logger.info("Twilio Voice service running in TEST MODE")

        # Active call sessions
        self.active_calls: Dict[str, TwilioVoiceCallSession] = {}

    async def initiate_safety_call(
        self,
        user_id: int,
        user_name: str,
        user_phone: str,
        location: Optional[Dict[str, float]] = None
    ) -> Dict:
        """
        Initiate an outbound AI-powered safety call to user's phone.

        Args:
            user_id: User's database ID
            user_name: User's name
            user_phone: User's phone number (E.164 format)
            location: Optional location dict with lat/lng

        Returns:
            Dict with call_sid, status, and session info
        """
        if self.test_mode:
            test_call_sid = f"TEST_CALL_{uuid.uuid4().hex[:16]}"
            logger.info(f"[TEST MODE] Initiating safety call to {user_phone}")

            session = TwilioVoiceCallSession(
                call_sid=test_call_sid,
                user_id=user_id,
                user_name=user_name,
                user_phone=user_phone,
                location=location
            )
            session.status = "connected"
            self.active_calls[test_call_sid] = session

            # Initialize AI provider in test mode
            await self._initialize_ai_provider(session)

            return {
                "success": True,
                "call_sid": test_call_sid,
                "status": "connected",
                "test_mode": True,
                "message": "Test mode: Call simulated successfully"
            }

        if not self.client:
            logger.error("Twilio client not initialized")
            return {
                "success": False,
                "error": "Twilio client not initialized"
            }

        try:
            # Generate TwiML URL for handling call
            # This URL should be your backend endpoint that returns TwiML
            twiml_url = f"{settings.frontend_url.replace('http://', 'https://').replace(':5173', '')}/api/safety-call/twiml"

            # For development, use ngrok or similar to expose localhost
            if "localhost" in twiml_url:
                logger.warning(
                    "Using localhost URL for TwiML - this won't work in production. "
                    "Use ngrok or deploy to a public server."
                )

            # Initiate outbound call
            call = self.client.calls.create(
                to=user_phone,
                from_=settings.twilio_from,
                url=twiml_url,
                status_callback=f"{twiml_url}/status",
                status_callback_event=["initiated", "ringing", "answered", "completed"]
            )

            logger.info(f"Safety call initiated to {user_phone}. Call SID: {call.sid}")

            # Create session
            session = TwilioVoiceCallSession(
                call_sid=call.sid,
                user_id=user_id,
                user_name=user_name,
                user_phone=user_phone,
                location=location
            )
            session.status = "ringing"
            self.active_calls[call.sid] = session

            # Initialize AI provider
            await self._initialize_ai_provider(session)

            return {
                "success": True,
                "call_sid": call.sid,
                "status": call.status,
                "test_mode": False
            }

        except TwilioRestException as e:
            logger.error(f"Twilio error initiating call to {user_phone}: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error initiating call to {user_phone}: {e}")
            return {"success": False, "error": str(e)}

    async def _initialize_ai_provider(self, session: TwilioVoiceCallSession):
        """
        Initialize AI provider for the call session.

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

            # Create provider from settings (Azure or Deepgram+ElevenLabs)
            provider = ProviderFactory.create_from_settings()

            # Initialize provider
            audio_config = AudioConfig(
                sample_rate=8000,  # Twilio uses 8kHz μ-law
                channels=1,
                format="mulaw"
            )
            conversation_config = ConversationConfig()

            await provider.initialize(
                system_instructions=system_instructions,
                audio_config=audio_config,
                conversation_config=conversation_config
            )

            # Register callbacks
            if hasattr(provider, 'on_transcript'):
                provider.on_transcript(
                    lambda text: self._handle_transcript(session.call_sid, text)
                )

            if hasattr(provider, 'on_audio_output'):
                provider.on_audio_output(
                    lambda audio: self._handle_ai_audio(session.call_sid, audio)
                )

            session.ai_provider = provider
            logger.info(f"AI provider initialized for call {session.call_sid}")

        except Exception as e:
            logger.error(f"Failed to initialize AI provider for call {session.call_sid}: {e}")

    def generate_twiml_for_stream(self) -> str:
        """
        Generate TwiML that connects call to Media Streams.

        Returns:
            TwiML XML string
        """
        response = VoiceResponse()

        # Greet user while setting up stream
        response.say(
            "Hello, this is your Protego safety companion. I'm here to help. "
            "Please hold for just a moment while I connect.",
            voice="Polly.Joanna"
        )

        # Connect to Media Streams WebSocket
        connect = Connect()
        stream = Stream(url=f"wss://{settings.frontend_url.replace('http://', '').replace('https://', '')}/api/safety-call/media-stream")
        connect.append(stream)
        response.append(connect)

        return str(response)

    async def handle_media_stream_event(self, call_sid: str, event: Dict):
        """
        Handle incoming events from Twilio Media Streams WebSocket.

        Args:
            call_sid: Call SID
            event: Event data from Twilio
        """
        session = self.active_calls.get(call_sid)
        if not session:
            logger.warning(f"Received media event for unknown call: {call_sid}")
            return

        event_type = event.get("event")

        if event_type == "start":
            # Stream started
            stream_sid = event.get("streamSid")
            session.set_stream_sid(stream_sid)
            session.status = "connected"
            logger.info(f"Media stream started for call {call_sid}")

        elif event_type == "media":
            # Incoming audio from user (μ-law format from Twilio)
            payload = event.get("media", {}).get("payload")
            if payload and session.ai_provider:
                # Decode μ-law audio from base64
                mulaw_data = base64.b64decode(payload)

                # Convert μ-law to PCM16 (16kHz for AI providers)
                pcm_data = audio_codec.mulaw_to_pcm16(mulaw_data, output_sample_rate=16000)

                # Send to AI provider for processing (Deepgram expects PCM16)
                if hasattr(session.ai_provider, 'send_audio'):
                    await session.ai_provider.send_audio(pcm_data)

        elif event_type == "stop":
            # Stream stopped
            session.is_streaming = False
            logger.info(f"Media stream stopped for call {call_sid}")

    async def _handle_transcript(self, call_sid: str, transcript: str):
        """
        Handle transcript from AI provider.

        Args:
            call_sid: Call SID
            transcript: Transcribed text from user
        """
        session = self.active_calls.get(call_sid)
        if not session:
            return

        session.add_transcript(transcript, "user")
        logger.info(f"Transcript from call {call_sid}: {transcript}")

        # TODO: Implement distress detection
        # For now, just log

    async def _handle_ai_audio(self, call_sid: str, audio_chunk: bytes):
        """
        Handle audio output from AI provider and send to Twilio.

        Args:
            call_sid: Call SID
            audio_chunk: Audio data from AI (PCM16 at 16kHz or 24kHz)
        """
        session = self.active_calls.get(call_sid)
        if not session or not session.is_streaming or not session.websocket:
            return

        try:
            # Convert PCM16 to μ-law (Twilio format)
            mulaw_data = audio_codec.pcm16_to_mulaw(audio_chunk, input_sample_rate=16000)

            # Encode to base64 for Twilio
            payload = base64.b64encode(mulaw_data).decode('utf-8')

            # Send via WebSocket to Twilio
            message = {
                "event": "media",
                "streamSid": session.stream_sid,
                "media": {
                    "payload": payload
                }
            }

            await session.websocket.send_text(json.dumps(message))

        except Exception as e:
            logger.error(f"Error sending AI audio to Twilio: {e}")

    async def end_call(self, call_sid: str) -> Optional[Dict]:
        """
        End an active call.

        Args:
            call_sid: Call SID to end

        Returns:
            Call summary dict
        """
        session = self.active_calls.pop(call_sid, None)
        if not session:
            logger.warning(f"Attempted to end unknown call: {call_sid}")
            return None

        # Clean up AI provider
        if session.ai_provider and hasattr(session.ai_provider, 'cleanup'):
            await session.ai_provider.cleanup()

        # End Twilio call if still active
        if not self.test_mode and self.client:
            try:
                self.client.calls(call_sid).update(status="completed")
            except Exception as e:
                logger.error(f"Error ending Twilio call {call_sid}: {e}")

        session.end_call()

        summary = {
            "call_sid": session.call_sid,
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
            f"Ended call {call_sid}: duration={summary['duration_seconds']}s, "
            f"status={summary['status']}"
        )

        return summary

    def get_active_call(self, call_sid: str) -> Optional[TwilioVoiceCallSession]:
        """Get active call session by SID."""
        return self.active_calls.get(call_sid)

    def get_active_call_count(self) -> int:
        """Get count of active calls."""
        return len(self.active_calls)


# Global service instance
twilio_voice_service = TwilioVoiceCallService()
