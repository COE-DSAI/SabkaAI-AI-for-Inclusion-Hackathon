"""
Abstract base class for AI conversation providers.
Allows swapping between Azure Realtime, Deepgram+ElevenLabs, or custom providers.
"""

from abc import ABC, abstractmethod
from typing import Dict, Optional, Callable, Any
from dataclasses import dataclass
from enum import Enum


class AIProviderType(str, Enum):
    """Supported AI providers for safety calls."""
    AZURE_REALTIME = "azure_realtime"
    DEEPGRAM_ELEVENLABS = "deepgram_elevenlabs"
    CUSTOM = "custom"


@dataclass
class AudioConfig:
    """Audio configuration for providers."""
    sample_rate: int = 24000
    channels: int = 1
    format: str = "pcm16"
    enable_echo_cancellation: bool = True
    enable_noise_suppression: bool = True


@dataclass
class ConversationConfig:
    """Configuration for conversation behavior."""
    voice: str = "alloy"
    temperature: float = 0.8
    max_tokens: int = 150
    detection_threshold: float = 0.5
    silence_duration_ms: int = 500


class IAIConversationProvider(ABC):
    """
    Abstract interface for AI conversation providers.

    Any provider (Azure, Deepgram, custom) must implement these methods.
    This allows easy switching between providers without changing business logic.
    """

    @abstractmethod
    async def initialize(
        self,
        system_instructions: str,
        audio_config: AudioConfig,
        conversation_config: ConversationConfig
    ) -> Dict[str, Any]:
        """
        Initialize the provider with configuration.

        Returns:
            Dict with provider-specific connection info (ws_url, tokens, etc.)
        """
        pass

    @abstractmethod
    async def get_connection_details(self) -> Dict[str, Any]:
        """
        Get connection details for frontend (WebSocket URL, config, etc.).

        Returns:
            {
                "type": "websocket" | "http",
                "url": "wss://..." or "https://...",
                "headers": {...},
                "config": {...}
            }
        """
        pass

    @abstractmethod
    async def handle_transcript(
        self,
        transcript: str,
        callback: Optional[Callable[[str], None]] = None
    ) -> None:
        """
        Process user transcript (for distress detection, logging, etc.).

        Args:
            transcript: What user said
            callback: Optional callback for distress detection
        """
        pass

    @abstractmethod
    async def cleanup(self) -> None:
        """Clean up resources (close connections, etc.)."""
        pass

    @abstractmethod
    def get_provider_type(self) -> AIProviderType:
        """Return the provider type."""
        pass


class ProviderFactory:
    """
    Factory for creating AI conversation providers.

    Usage:
        # Auto-detect from settings
        provider = ProviderFactory.create_from_settings()

        # Or explicitly specify
        provider = ProviderFactory.create(AIProviderType.AZURE_REALTIME, config)
    """

    @staticmethod
    def create_from_settings() -> IAIConversationProvider:
        """
        Create provider based on SAFETY_CALL_PROVIDER environment variable.

        Returns:
            IAIConversationProvider instance
        """
        from config import settings

        provider_name = settings.safety_call_provider.lower()

        if provider_name == "azure":
            return ProviderFactory.create(AIProviderType.AZURE_REALTIME)
        elif provider_name == "deepgram_elevenlabs":
            return ProviderFactory.create(AIProviderType.DEEPGRAM_ELEVENLABS)
        else:
            raise ValueError(
                f"Unknown provider in SAFETY_CALL_PROVIDER: {provider_name}. "
                f"Must be 'azure' or 'deepgram_elevenlabs'"
            )

    @staticmethod
    def create(
        provider_type: AIProviderType,
        config: Optional[Dict[str, Any]] = None
    ) -> IAIConversationProvider:
        """
        Create an AI provider instance.

        Args:
            provider_type: Type of provider to create
            config: Provider-specific configuration

        Returns:
            IAIConversationProvider instance
        """
        if provider_type == AIProviderType.AZURE_REALTIME:
            from .azure_realtime import AzureRealtimeProvider
            return AzureRealtimeProvider(config or {})

        elif provider_type == AIProviderType.DEEPGRAM_ELEVENLABS:
            from .deepgram_elevenlabs import create_deepgram_elevenlabs_provider
            return create_deepgram_elevenlabs_provider()

        elif provider_type == AIProviderType.CUSTOM:
            if config and "provider_class" in config:
                return config["provider_class"](config)
            raise ValueError("Custom provider requires 'provider_class' in config")

        else:
            raise ValueError(f"Unknown provider type: {provider_type}")
