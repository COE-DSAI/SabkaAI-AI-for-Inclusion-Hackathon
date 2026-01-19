"""
Deepgram + ElevenLabs provider (alternative to Azure).
Demonstrates how to swap providers without changing business logic.
"""

from typing import Dict, Optional, Callable, Any
from .base import (
    IAIConversationProvider,
    AIProviderType,
    AudioConfig,
    ConversationConfig
)
import logging

logger = logging.getLogger(__name__)


class DeepgramElevenLabsProvider(IAIConversationProvider):
    """
    Alternative provider using Deepgram (STT) + ElevenLabs (TTS).

    This demonstrates the provider pattern - same interface,
    different implementation.
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.deepgram_key = config.get("deepgram_api_key")
        self.elevenlabs_key = config.get("elevenlabs_api_key")

        if not self.deepgram_key or not self.elevenlabs_key:
            raise ValueError("Deepgram and ElevenLabs API keys required")

    async def initialize(
        self,
        system_instructions: str,
        audio_config: AudioConfig,
        conversation_config: ConversationConfig
    ) -> Dict[str, Any]:
        """Initialize Deepgram + ElevenLabs configuration."""
        logger.info("Initializing Deepgram + ElevenLabs provider")

        return {
            "system_instructions": system_instructions,
            "deepgram_config": {
                "model": "nova-2",
                "language": "en",
                "sample_rate": audio_config.sample_rate
            },
            "elevenlabs_config": {
                "voice_id": "21m00Tcm4TlvDq8ikWAM",
                "model_id": "eleven_turbo_v2"
            }
        }

    async def get_connection_details(self) -> Dict[str, Any]:
        """
        Get connection details for Deepgram + ElevenLabs.

        Returns HTTP endpoints (not WebSocket like Azure).
        """
        return {
            "type": "http",
            "stt_endpoint": "https://api.deepgram.com/v1/listen",
            "tts_endpoint": "https://api.elevenlabs.io/v1/text-to-speech",
            "stt_headers": {"Authorization": f"Token {self.deepgram_key}"},
            "tts_headers": {"xi-api-key": self.elevenlabs_key},
            "protocol": "deepgram_elevenlabs",
            "features": {
                "builtin_stt": False,
                "builtin_tts": False,
                "streaming": True,
                "server_vad": False
            }
        }

    async def handle_transcript(
        self,
        transcript: str,
        callback: Optional[Callable[[str], None]] = None
    ) -> None:
        """Handle transcript (same interface as Azure)."""
        logger.debug(f"Deepgram transcript: {transcript}")

        if callback:
            await callback(transcript)

    async def cleanup(self) -> None:
        """Cleanup (close any persistent connections)."""
        logger.info("Deepgram + ElevenLabs provider cleanup complete")

    def get_provider_type(self) -> AIProviderType:
        return AIProviderType.DEEPGRAM_ELEVENLABS
