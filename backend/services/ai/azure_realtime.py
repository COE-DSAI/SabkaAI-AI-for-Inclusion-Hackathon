"""
Azure OpenAI Realtime API provider implementation.
Handles real-time audio conversation using Azure's WebSocket API.
"""

from typing import Dict, Optional, Callable, Any
from .base import (
    IAIConversationProvider,
    AIProviderType,
    AudioConfig,
    ConversationConfig
)
from config import settings
import logging

logger = logging.getLogger(__name__)


class AzureRealtimeProvider(IAIConversationProvider):
    """
    Azure OpenAI Realtime API provider.

    Features:
    - Built-in STT (speech-to-text)
    - Built-in TTS (text-to-speech)
    - Real-time streaming
    - Server-side VAD (voice activity detection)
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.endpoint = settings.azure_openai_realtime_endpoint
        self.api_key = settings.azure_openai_realtime_api_key
        self.deployment = settings.azure_openai_realtime_deployment

        if not self.api_key:
            raise ValueError("Azure Realtime API key not configured")

    async def initialize(
        self,
        system_instructions: str,
        audio_config: AudioConfig,
        conversation_config: ConversationConfig
    ) -> Dict[str, Any]:
        """Initialize Azure Realtime configuration."""
        logger.info("Initializing Azure Realtime provider")

        return {
            "system_instructions": system_instructions,
            "audio_config": {
                "input_audio_format": audio_config.format,
                "output_audio_format": audio_config.format,
                "sample_rate": audio_config.sample_rate
            },
            "conversation_config": {
                "voice": conversation_config.voice,
                "temperature": conversation_config.temperature,
                "max_response_output_tokens": conversation_config.max_tokens,
                "turn_detection": {
                    "type": "server_vad",
                    "threshold": conversation_config.detection_threshold,
                    "silence_duration_ms": conversation_config.silence_duration_ms,
                    "prefix_padding_ms": 300
                }
            }
        }

    async def get_connection_details(self) -> Dict[str, Any]:
        """
        Get WebSocket connection details for frontend.

        Returns connection info that frontend can use directly.
        """
        ws_url = (
            f"{self.endpoint}/openai/realtime"
            f"?api-version=2024-10-01-preview"
            f"&deployment={self.deployment}"
            f"&api-key={self.api_key}"
        )

        return {
            "type": "websocket",
            "url": ws_url,
            "protocol": "azure_realtime",
            "deployment": self.deployment,
            "features": {
                "builtin_stt": True,
                "builtin_tts": True,
                "streaming": True,
                "server_vad": True
            }
        }

    async def handle_transcript(
        self,
        transcript: str,
        callback: Optional[Callable[[str], None]] = None
    ) -> None:
        """
        Handle transcript for backend processing.

        Azure sends transcripts via WebSocket, but we may want
        to process them server-side for distress detection.
        """
        logger.debug(f"Received transcript: {transcript}")

        if callback:
            await callback(transcript)

    async def cleanup(self) -> None:
        """Clean up Azure resources (none needed for stateless API)."""
        logger.info("Azure Realtime provider cleanup complete")

    def get_provider_type(self) -> AIProviderType:
        return AIProviderType.AZURE_REALTIME
