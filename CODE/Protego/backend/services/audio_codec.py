"""
Audio codec conversion utilities for Twilio Media Streams.

Twilio uses μ-law (8kHz, 8-bit) encoding for phone calls.
Our AI providers use PCM16 (16kHz or 24kHz, 16-bit) encoding.

This module handles bidirectional conversion between these formats.
"""

import audioop
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class AudioCodec:
    """
    Audio codec converter for Twilio Media Streams.

    Handles conversion between:
    - μ-law (8kHz, 8-bit) - Twilio format
    - PCM16 (16kHz/24kHz, 16-bit) - AI provider format
    """

    @staticmethod
    def mulaw_to_pcm16(mulaw_data: bytes, output_sample_rate: int = 16000) -> bytes:
        """
        Convert μ-law audio to PCM16.

        Args:
            mulaw_data: μ-law encoded audio bytes (8kHz, 8-bit)
            output_sample_rate: Desired output sample rate (16000 or 24000)

        Returns:
            PCM16 encoded audio bytes
        """
        try:
            # Convert μ-law to linear PCM (8kHz, 16-bit)
            pcm_data = audioop.ulaw2lin(mulaw_data, 2)  # 2 bytes per sample (16-bit)

            # Resample from 8kHz to target sample rate if needed
            if output_sample_rate != 8000:
                pcm_data, _ = audioop.ratecv(
                    pcm_data,
                    2,  # 2 bytes per sample
                    1,  # mono
                    8000,  # input rate
                    output_sample_rate,  # output rate
                    None  # no state (one-shot conversion)
                )

            return pcm_data

        except Exception as e:
            logger.error(f"Error converting μ-law to PCM16: {e}")
            return b''

    @staticmethod
    def pcm16_to_mulaw(pcm_data: bytes, input_sample_rate: int = 16000) -> bytes:
        """
        Convert PCM16 audio to μ-law.

        Args:
            pcm_data: PCM16 encoded audio bytes
            input_sample_rate: Input sample rate (16000 or 24000)

        Returns:
            μ-law encoded audio bytes (8kHz, 8-bit)
        """
        try:
            # Resample to 8kHz if needed
            if input_sample_rate != 8000:
                pcm_data, _ = audioop.ratecv(
                    pcm_data,
                    2,  # 2 bytes per sample
                    1,  # mono
                    input_sample_rate,  # input rate
                    8000,  # output rate (Twilio requires 8kHz)
                    None  # no state
                )

            # Convert linear PCM to μ-law
            mulaw_data = audioop.lin2ulaw(pcm_data, 2)

            return mulaw_data

        except Exception as e:
            logger.error(f"Error converting PCM16 to μ-law: {e}")
            return b''

    @staticmethod
    def adjust_volume(audio_data: bytes, factor: float) -> bytes:
        """
        Adjust audio volume.

        Args:
            audio_data: Audio bytes (PCM16 format)
            factor: Volume factor (1.0 = no change, 2.0 = double volume, 0.5 = half volume)

        Returns:
            Volume-adjusted audio bytes
        """
        try:
            return audioop.mul(audio_data, 2, factor)
        except Exception as e:
            logger.error(f"Error adjusting volume: {e}")
            return audio_data

    @staticmethod
    def detect_silence(audio_data: bytes, threshold: int = 100) -> bool:
        """
        Detect if audio chunk is silence.

        Args:
            audio_data: Audio bytes (PCM16 format)
            threshold: RMS threshold for silence detection

        Returns:
            True if audio is silence, False otherwise
        """
        try:
            rms = audioop.rms(audio_data, 2)
            return rms < threshold
        except Exception as e:
            logger.error(f"Error detecting silence: {e}")
            return False


# Singleton instance
audio_codec = AudioCodec()
