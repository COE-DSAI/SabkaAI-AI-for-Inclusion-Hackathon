"""
Deepgram + ElevenLabs Provider for Real-time Safety Calls

This provider combines:
- Deepgram: Speech-to-text (streaming)
- ElevenLabs: Text-to-speech (streaming)
- MegaLLM: LLM conversation logic (Claude-Opus-4.5 compatible)

Architecture:
1. Audio IN → Deepgram WebSocket → Text
2. Text → MegaLLM Claude-Opus-4.5 → Response Text
3. Response Text → ElevenLabs → Audio OUT

Author: Claude (Anthropic)
"""

import asyncio
import json
import logging
from typing import Any, Callable, Dict, Optional
from dataclasses import dataclass
import os

from deepgram import DeepgramClient
from elevenlabs.client import ElevenLabs
import httpx

from .base import IAIConversationProvider, AudioConfig, ConversationConfig, AIProviderType

logger = logging.getLogger(__name__)


@dataclass
class DeepgramElevenLabsConfig:
    """Configuration for Deepgram + ElevenLabs provider"""
    deepgram_api_key: str
    elevenlabs_api_key: str
    megallm_api_key: str
    megallm_endpoint: str
    megallm_model: str = "claude-sonnet-4-5-20250929"

    # Deepgram settings
    deepgram_model: str = "nova-2"
    deepgram_language: str = "en-US"

    # ElevenLabs settings
    elevenlabs_voice_id: str = "EXAVITQu4vr4xnSDxMaL"  # Sarah - Mature, Reassuring
    elevenlabs_model_id: str = "eleven_turbo_v2_5"  # Fast, low-latency
    elevenlabs_stability: float = 0.5
    elevenlabs_similarity_boost: float = 0.75
    elevenlabs_style: float = 0.0  # 0 = calm, 1 = expressive

    # Audio settings
    sample_rate: int = 16000
    channels: int = 1


class DeepgramElevenLabsProvider(IAIConversationProvider):
    """
    Real-time conversation provider using Deepgram (STT), ElevenLabs (TTS), and MegaLLM (LLM)
    """

    def __init__(self, config: DeepgramElevenLabsConfig):
        self.config = config

        # Initialize clients
        self.deepgram_client = DeepgramClient(api_key=config.deepgram_api_key)
        self.elevenlabs_client = ElevenLabs(api_key=config.elevenlabs_api_key)

        # MegaLLM client (using httpx for async)
        self.llm_client = httpx.AsyncClient(
            base_url=config.megallm_endpoint,
            headers={
                "Authorization": f"Bearer {config.megallm_api_key}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )

        # State
        self.dg_connection = None
        self.is_active = False
        self.conversation_history = []
        self.system_instructions = ""

        # Callbacks
        self.on_transcript_callback: Optional[Callable] = None
        self.on_audio_callback: Optional[Callable] = None
        self.on_error_callback: Optional[Callable] = None

    async def initialize(
        self,
        system_instructions: str,
        audio_config: Optional[AudioConfig] = None,
        conversation_config: Optional[ConversationConfig] = None
    ) -> Dict[str, Any]:
        """
        Initialize the conversation session

        Returns connection info for client (not used for this provider as it's server-managed)
        """
        self.system_instructions = system_instructions
        self.conversation_history = [
            {"role": "system", "content": system_instructions}
        ]

        logger.info("Deepgram + ElevenLabs provider initialized")

        return {
            "status": "ready",
            "provider": "deepgram_elevenlabs",
            "capabilities": {
                "stt": "deepgram",
                "tts": "elevenlabs",
                "llm": "azure_openai"
            },
            "message": "Server will handle audio streaming. Client should send audio to backend."
        }

    async def start_streaming(self) -> bool:
        """
        Start Deepgram WebSocket connection for STT
        """
        try:
            # Create Deepgram live connection
            self.dg_connection = self.deepgram_client.listen.v1.connect(
                model=self.config.deepgram_model,
                language=self.config.deepgram_language,
                encoding="linear16",
                sample_rate=str(self.config.sample_rate),
                smart_format="true",
                interim_results="true"
            ).__enter__()  # Enter context manager

            logger.info("Deepgram WebSocket connection established")
            self.is_active = True

            # Start background task to process Deepgram messages
            asyncio.create_task(self._process_deepgram_messages())

            return True

        except Exception as e:
            logger.error(f"Failed to start Deepgram streaming: {e}")
            if self.on_error_callback:
                await self.on_error_callback(str(e))
            return False

    async def _process_deepgram_messages(self):
        """
        Background task to process incoming transcripts from Deepgram
        """
        # Note: Deepgram SDK v5 doesn't provide async message iteration
        # In production, you'd need to implement a custom WebSocket wrapper
        # or use Deepgram's callback mechanism
        logger.info("Deepgram message processor started")

        # For now, transcripts will be handled via send_audio callback
        # In a real implementation, you'd subscribe to Deepgram events here

    async def send_audio(self, audio_data: bytes) -> None:
        """
        Send audio chunk to Deepgram for transcription
        """
        if not self.is_active or not self.dg_connection:
            logger.warning("Cannot send audio: connection not active")
            return

        try:
            # Send to Deepgram (note: actual SDK method may differ)
            # In production, implement proper async sending
            self.dg_connection.send(audio_data)

        except Exception as e:
            logger.error(f"Error sending audio to Deepgram: {e}")
            if self.on_error_callback:
                await self.on_error_callback(str(e))

    async def send_text(self, text: str) -> None:
        """
        Process user text input (from transcript or direct input)

        Flow:
        1. Add user message to conversation history
        2. Send to MegaLLM for response
        3. Get AI response text
        4. Convert to speech with ElevenLabs
        5. Stream audio back
        """
        try:
            # Add to conversation history
            self.conversation_history.append({"role": "user", "content": text})

            logger.info(f"Processing user text: {text[:50]}...")

            # Call transcript callback if registered
            if self.on_transcript_callback:
                await self.on_transcript_callback(text)

            # Get AI response
            response_text = await self._get_ai_response(text)

            # Add AI response to history
            self.conversation_history.append({"role": "assistant", "content": response_text})

            logger.info(f"AI response: {response_text[:50]}...")

            # Convert to speech
            await self._text_to_speech(response_text)

        except Exception as e:
            logger.error(f"Error processing text: {e}")
            if self.on_error_callback:
                await self.on_error_callback(str(e))

    async def _get_ai_response(self, user_text: str) -> str:
        """
        Get response from MegaLLM Claude-Opus-4.5
        """
        try:
            # Prepare request (OpenAI-compatible format)
            request_data = {
                "model": self.config.megallm_model,
                "messages": self.conversation_history,
                "temperature": 0.8,
                "max_tokens": 150,
                "top_p": 0.95,
                "frequency_penalty": 0.5,
                "presence_penalty": 0.5
            }

            # Call MegaLLM Chat Completions API (OpenAI-compatible)
            response = await self.llm_client.post(
                "",  # Base URL already includes /v1/chat/completions
                json=request_data
            )

            response.raise_for_status()
            result = response.json()

            # Extract response text
            ai_message = result["choices"][0]["message"]["content"]
            return ai_message.strip()

        except Exception as e:
            logger.error(f"MegaLLM API error: {e}")
            # Fallback response
            return "I'm here with you. Can you tell me more about where you are?"

    async def _text_to_speech(self, text: str) -> None:
        """
        Convert text to speech using ElevenLabs and stream audio
        """
        try:
            logger.info(f"Converting to speech: {text[:50]}...")

            # Generate audio with ElevenLabs
            audio_generator = self.elevenlabs_client.text_to_speech.convert(
                voice_id=self.config.elevenlabs_voice_id,
                text=text,
                model_id=self.config.elevenlabs_model_id,
                output_format="pcm_16000",  # 16kHz PCM for consistency
                voice_settings={
                    "stability": self.config.elevenlabs_stability,
                    "similarity_boost": self.config.elevenlabs_similarity_boost,
                    "style": self.config.elevenlabs_style,
                    "use_speaker_boost": True
                }
            )

            # Stream audio chunks
            chunk_count = 0
            for audio_chunk in audio_generator:
                if self.on_audio_callback:
                    await self.on_audio_callback(audio_chunk)
                chunk_count += 1

            logger.info(f"Streamed {chunk_count} audio chunks")

        except Exception as e:
            logger.error(f"ElevenLabs TTS error: {e}")
            if self.on_error_callback:
                await self.on_error_callback(str(e))

    async def inject_message(self, role: str, content: str) -> None:
        """
        Inject a message into the conversation (for system prompts, etc.)
        """
        self.conversation_history.append({"role": role, "content": content})
        logger.info(f"Injected message: {role} - {content[:50]}...")

    # Abstract method implementations from IAIConversationProvider

    async def get_connection_details(self) -> Dict[str, Any]:
        """
        Get connection details for frontend.
        For this provider, audio is handled server-side via Twilio.
        """
        return {
            "type": "server_managed",
            "provider": "deepgram_elevenlabs",
            "message": "Audio handled by backend. Use Twilio voice calling endpoints.",
            "capabilities": {
                "stt": "deepgram",
                "llm": "megallm",
                "tts": "elevenlabs"
            }
        }

    async def handle_transcript(
        self,
        transcript: str,
        callback: Optional[Callable[[str], None]] = None
    ) -> None:
        """
        Process user transcript for distress detection.
        """
        logger.info(f"Handling transcript: {transcript}")

        # Call the callback for distress detection if provided
        if callback:
            await callback(transcript)

        # Also call our internal callback if registered
        if self.on_transcript_callback:
            await self.on_transcript_callback(transcript)

    def get_provider_type(self) -> AIProviderType:
        """Return the provider type."""
        return AIProviderType.DEEPGRAM_ELEVENLABS

    async def cleanup(self) -> None:
        """Clean up resources (alias for close())."""
        await self.close()

    async def close(self) -> None:
        """
        Close all connections and cleanup
        """
        self.is_active = False

        # Close Deepgram connection
        if self.dg_connection:
            try:
                self.dg_connection.__exit__(None, None, None)  # Exit context manager
                logger.info("Deepgram connection closed")
            except Exception as e:
                logger.error(f"Error closing Deepgram connection: {e}")

        # Close LLM client
        await self.llm_client.aclose()

        logger.info("Deepgram + ElevenLabs provider closed")

    def on_transcript(self, callback: Callable) -> None:
        """Register callback for transcript events"""
        self.on_transcript_callback = callback

    def on_audio_output(self, callback: Callable) -> None:
        """Register callback for audio output"""
        self.on_audio_callback = callback

    def on_error(self, callback: Callable) -> None:
        """Register callback for errors"""
        self.on_error_callback = callback


def create_deepgram_elevenlabs_provider() -> DeepgramElevenLabsProvider:
    """
    Factory function to create Deepgram + ElevenLabs provider from environment
    """
    config = DeepgramElevenLabsConfig(
        deepgram_api_key=os.getenv("DEEPGRAM_API_KEY", ""),
        elevenlabs_api_key=os.getenv("ELEVENLABS_API_KEY", ""),
        megallm_api_key=os.getenv("MEGALLM_API_KEY", ""),
        megallm_endpoint=os.getenv("MEGALLM_ENDPOINT", "https://ai.megallm.io/v1/chat/completions"),
        megallm_model=os.getenv("MEGALLM_MODEL", "claude-sonnet-4-5-20250929"),

        # Deepgram settings
        deepgram_model=os.getenv("DEEPGRAM_MODEL", "nova-2"),

        # ElevenLabs settings
        elevenlabs_voice_id=os.getenv("ELEVENLABS_VOICE_ID", "EXAVITQu4vr4xnSDxMaL"),
        elevenlabs_model_id=os.getenv("ELEVENLABS_MODEL", "eleven_turbo_v2_5"),
    )

    return DeepgramElevenLabsProvider(config)
