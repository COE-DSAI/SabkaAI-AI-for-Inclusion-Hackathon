"""
Configuration management for Protego backend.
Uses pydantic-settings for type-safe environment variable handling.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str

    # Twilio
    twilio_account_sid: str
    twilio_auth_token: str
    twilio_from: str
    test_mode: bool = False  # Disabled by default for production safety

    # Alert Configuration
    alert_confidence_threshold: float = 0.8
    alert_countdown_seconds: int = 5

    # Security
    secret_key: str
    algorithm: str = "HS256"

    # CORS
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    # Environment
    environment: str = "development"
    frontend_url: str = "https://protego.zssh.dev"  # Frontend URL for generating links

    # AI Services
    megallm_endpoint: str = "https://ai.megallm.io/v1/chat/completions"
    megallm_api_key: str = ""
    megallm_model: str = "claude-sonnet-4-5-20250929"

    # Transcription provider selection
    transcription_provider: str = "chutes"  # "chutes" or "deepgram"

    # Chutes Whisper (Speech-to-Text)
    whisper_endpoint: str = "https://chutes-whisper-large-v3.chutes.ai/transcribe"
    whisper_api_key: str = ""

    # Deepgram (Speech-to-Text alternative)
    deepgram_api_key: str = ""
    deepgram_model: str = "nova-2"

    # Azure OpenAI Realtime (for Azure-based real-time voice - all-in-one STT+TTS+LLM)
    azure_openai_realtime_endpoint: str = ""
    azure_openai_realtime_api_key: str = ""
    azure_openai_realtime_deployment: str = "gpt-4o-realtime-preview"

    # ElevenLabs (Text-to-Speech for Deepgram+ElevenLabs mode)
    # Note: LLM uses MegaLLM (already configured above) - cheaper and already working
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "EXAVITQu4vr4xnSDxMaL"  # Sarah - Mature, Reassuring
    elevenlabs_model: str = "eleven_turbo_v2_5"  # Fast, low-latency model

    # Safety Call Configuration
    safety_call_enabled: bool = True  # Enable/disable safety call feature
    safety_call_max_duration_minutes: int = 10  # Maximum call duration to prevent runaway costs
    safety_call_alert_threshold: float = 0.75  # Confidence threshold for triggering alerts
    safety_call_provider: str = "azure"  # "azure" or "deepgram_elevenlabs" - SWITCH HERE

    # Vonage Voice API Configuration
    vonage_api_key: str = ""
    vonage_api_secret: str = ""
    vonage_application_id: str = ""
    vonage_private_key_path: str = ""
    vonage_number: str = ""

    # Voice Provider Selection
    voice_provider: str = "twilio"  # "twilio" or "vonage"
    backend_url: str = "http://localhost:8000"  # Backend URL for callbacks

    # Cloudflare R2 Configuration (for media uploads)
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "protego-incidents"
    r2_public_url: str = ""  # Public URL for the bucket (e.g., https://pub-xxxxx.r2.dev)

    # Sentry Error Tracking
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 1.0  # 100% in dev, reduce in production
    sentry_profiles_sample_rate: float = 1.0  # 100% in dev, reduce in production

    # Redis Cache Configuration
    redis_url: str = "redis://localhost:6379/0"
    redis_enabled: bool = True  # Enable/disable caching
    cache_ttl: int = 300  # Default cache TTL in seconds (5 minutes)

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )

    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() == "production"

    def validate_production_config(self) -> None:
        """
        Validate that critical settings are properly configured for production.
        Raises ValueError if production environment has unsafe settings.
        """
        if self.is_production:
            if self.test_mode:
                raise ValueError(
                    "CRITICAL: test_mode is enabled in production environment! "
                    "This will prevent real SMS alerts from being sent. "
                    "Set TEST_MODE=false in your .env file."
                )
            if not self.sentry_dsn:
                import warnings
                warnings.warn(
                    "Sentry DSN not configured in production - error tracking disabled",
                    UserWarning
                )


# Global settings instance
settings = Settings()
