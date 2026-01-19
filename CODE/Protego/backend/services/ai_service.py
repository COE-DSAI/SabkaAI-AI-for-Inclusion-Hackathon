"""
AI Service for Protego - Audio Analysis and LLM Integration.
Handles Whisper transcription, scream detection, and safety analysis.
"""

import httpx
import logging
import base64
import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
from ast import literal_eval

from config import settings

logger = logging.getLogger(__name__)


class DistressType(str, Enum):
    """Types of distress detected in audio."""
    SCREAM = "SCREAM"
    HELP_CALL = "HELP_CALL"
    CRYING = "CRYING"
    PANIC = "PANIC"
    NONE = "NONE"


@dataclass
class WhisperSegment:
    """Segment from Whisper transcription."""
    text: str
    start: float
    end: float


@dataclass
class AudioAnalysisResult:
    """Result of audio analysis."""
    transcription: str
    distress_detected: bool
    distress_type: DistressType
    confidence: float
    keywords_found: List[str]
    segments: List[WhisperSegment]
    analysis: Optional[str] = None  # AI analysis explanation
    ai_result: Optional[dict] = None  # AI result


@dataclass
class SafetySummary:
    """AI-generated safety summary."""
    summary: str
    risk_level: str  # low, medium, high
    recommendations: List[str]
    alerts_analysis: str


# Distress keywords for detection (comprehensive list)
DISTRESS_KEYWORDS = {
    # Direct help calls (highest priority)
    "explicit_help": [
        "help", "help me", "someone help", "please help", "somebody help",
        "help please", "i need help", "need help", "get help", "call for help"
    ],

    # Physical threat indicators (high priority)
    "threat": [
        "stop it", "stop", "let me go", "leave me alone", "get off", "get away from me",
        "don't touch me", "let go", "release me", "unhand me"
    ],

    # Negative commands/resistance (high priority)
    "resistance": [
        "no", "don't", "please don't", "stop that", "stop this",
        "no please", "please no", "not again", "i said no"
    ],

    # Emergency services (critical)
    "emergency": [
        "emergency", "call 911", "call police", "police", "ambulance",
        "call an ambulance", "get the police", "dial 911", "call emergency"
    ],

    # Immediate danger (critical)
    "danger": [
        "danger", "attack", "attacking", "being attacked", "chasing",
        "following me", "stalking", "threatening", "weapon", "gun", "knife"
    ],

    # Physical harm (high priority)
    "harm": [
        "hurt", "hurting", "pain", "bleeding", "injured", "hit me",
        "kicked", "punched", "grabbed", "choked", "choking", "can't breathe"
    ],

    # Fear and panic (medium-high priority)
    "fear": [
        "scared", "afraid", "terrified", "frightened", "panicking", "panic",
        "fear", "fearful", "i'm scared", "so scared"
    ],

    # Escape attempts (medium-high priority)
    "escape": [
        "run", "get away", "escape", "save me", "rescue me", "trapped",
        "can't get out", "stuck", "locked in", "kidnapped", "abducted"
    ],

    # Environmental hazards (critical)
    "hazard": [
        "fire", "smoke", "burning", "explosion", "gas leak", "flood",
        "drowning", "falling", "collapsed"
    ],

    # Medical emergencies (critical)
    "medical": [
        "heart attack", "stroke", "seizure", "allergic reaction", "overdose",
        "can't breathe", "chest pain", "unconscious", "bleeding out"
    ],

    # Sexual assault indicators (critical)
    "assault": [
        "rape", "assault", "molest", "harass", "harassment", "inappropriate",
        "unwanted", "sexual assault", "touch me there"
    ],

    # Coercion/control (medium priority)
    "coercion": [
        "forced", "forcing me", "make me", "threatening me", "blackmail",
        "against my will", "under duress"
    ],

    # Location vulnerability (medium priority)
    "vulnerable": [
        "lost", "alone", "isolated", "nowhere to go", "stranded",
        "dark", "unsafe area", "bad neighborhood"
    ]
}

# Flatten all keywords for easier matching
ALL_DISTRESS_KEYWORDS = [kw for category in DISTRESS_KEYWORDS.values() for kw in category]

SCREAM_INDICATORS = [
    "scream", "screaming", "screamed", "yell", "yelling", "yelled",
    "shout", "shouting", "shouted", "cry", "crying", "cried",
    "shriek", "shrieking", "wail", "wailing", "howl", "howling",
    "[scream]", "[screaming]", "[yelling]", "[shouting]", "[crying]",
    "[inaudible]", "[noise]", "[loud noise]", "[distress sounds]",
    "aah", "aaah", "aaaah", "ahh", "ahhh", "oww", "owww", "no no no"
]


class AIService:
    """
    AI Service for audio analysis and safety intelligence.
    Integrates Deepgram for transcription and MegaLLM (Claude Opus 4.5) for analysis.
    """

    def __init__(self):
        """Initialize AI service with API configurations."""
        # Transcription settings
        self.transcription_provider = settings.transcription_provider

        # Chutes Whisper
        self.whisper_endpoint = settings.whisper_endpoint
        self.whisper_api_key = settings.whisper_api_key

        # Deepgram
        self.deepgram_api_key = settings.deepgram_api_key
        self.deepgram_model = settings.deepgram_model

        # LLM settings
        self.megallm_endpoint = settings.megallm_endpoint
        self.megallm_api_key = settings.megallm_api_key
        self.megallm_model = settings.megallm_model
        self.test_mode = settings.test_mode

        # Validate configuration
        if self.transcription_provider == "chutes" and not self.whisper_api_key:
            logger.warning("Chutes Whisper API key not configured")
        elif self.transcription_provider == "deepgram" and not self.deepgram_api_key:
            logger.warning("Deepgram API key not configured")

        if not self.megallm_api_key:
            logger.warning("MegaLLM API key not configured")

    async def transcribe_audio(
        self,
        audio_data: bytes,
        filename: str = "audio.webm",
        content_type: str = "audio/webm"
    ) -> List[WhisperSegment]:
        """
        Transcribe audio using configured provider (Chutes Whisper or Deepgram).

        Args:
            audio_data: Raw audio bytes
            filename: Name of the audio file
            content_type: MIME type of the audio

        Returns:
            List of WhisperSegment with timestamps
        """
        if self.test_mode:
            logger.info("[TEST MODE] Simulating transcription")
            return [WhisperSegment(
                text="[Test transcription - AI service in test mode]",
                start=0.0,
                end=1.0
            )]

        # Route to the configured provider
        if self.transcription_provider == "deepgram":
            return await self._transcribe_audio_deepgram(audio_data, filename, content_type)
        else:
            return await self._transcribe_audio_chutes(audio_data, filename)

    async def _transcribe_audio_chutes(
        self,
        audio_data: bytes,
        filename: str = "audio.webm"
    ) -> List[WhisperSegment]:
        """Transcribe audio using Chutes Whisper API."""
        if not self.whisper_api_key:
            logger.warning("Chutes Whisper API key not configured")
            return []

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Chutes Whisper API expects base64 encoded audio as "audio_b64"
                audio_b64 = base64.b64encode(audio_data).decode('utf-8')

                logger.info(f"[Chutes Whisper] Audio size: {len(audio_data)} bytes, base64 length: {len(audio_b64)}")
                logger.info(f"[Chutes Whisper] Endpoint: {self.whisper_endpoint}")

                headers = {
                    "Authorization": f"Bearer {self.whisper_api_key}",
                    "Content-Type": "application/json"
                }

                payload = {
                    "audio_b64": audio_b64
                }

                response = await client.post(
                    self.whisper_endpoint,
                    json=payload,
                    headers=headers
                )

                logger.info(f"[Chutes Whisper] Response status: {response.status_code}")

                if response.status_code != 200:
                    logger.error(f"Chutes Whisper API error: {response.status_code} - {response.text}")
                    return []

                # Parse response - Chutes API returns JSON array of segments
                result = response.json()
                logger.info(f"[Chutes Whisper] Response type: {type(result)}")

                segments = []

                if isinstance(result, list):
                    for seg in result:
                        text = seg.get("text", "").strip()
                        if text:
                            segments.append(WhisperSegment(
                                text=text,
                                start=seg.get("start", 0.0),
                                end=seg.get("end", 0.0)
                            ))
                elif isinstance(result, dict):
                    if "segments" in result:
                        for seg in result["segments"]:
                            text = seg.get("text", "").strip()
                            if text:
                                segments.append(WhisperSegment(
                                    text=text,
                                    start=seg.get("start", 0.0),
                                    end=seg.get("end", 0.0)
                                ))
                    elif "text" in result:
                        text = result["text"].strip()
                        if text:
                            segments.append(WhisperSegment(text=text, start=0.0, end=0.0))

                logger.info(f"[Chutes Whisper] Transcribed {len(segments)} segments: {[s.text for s in segments]}")
                return segments

        except Exception as e:
            logger.error(f"Chutes Whisper transcription error: {e}")
            return []

    async def _transcribe_audio_deepgram(
        self,
        audio_data: bytes,
        filename: str = "audio.webm",
        content_type: str = "audio/webm"
    ) -> List[WhisperSegment]:
        """Transcribe audio using Deepgram API."""
        if not self.deepgram_api_key:
            logger.warning("Deepgram API key not configured")
            return []

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Deepgram API endpoint
                url = "https://api.deepgram.com/v1/listen"

                # Add query parameters for model and features
                params = {
                    "model": self.deepgram_model,
                    "smart_format": "true",
                    "punctuate": "true",
                    "diarize": "false",
                    "utterances": "true"  # Get word-level timestamps
                }

                logger.info(f"[Deepgram] Audio size: {len(audio_data)} bytes")
                logger.info(f"[Deepgram] Model: {self.deepgram_model}")

                headers = {
                    "Authorization": f"Token {self.deepgram_api_key}",
                    "Content-Type": content_type
                }

                response = await client.post(
                    url,
                    params=params,
                    headers=headers,
                    content=audio_data
                )

                logger.info(f"[Deepgram] Response status: {response.status_code}")

                if response.status_code != 200:
                    logger.error(f"Deepgram API error: {response.status_code} - {response.text}")
                    return []

                # Parse response
                result = response.json()
                logger.info(f"[Deepgram] Response received")
                logger.info(f"[Deepgram] Full response structure: {result}")

                segments = []

                # Extract transcript from Deepgram response
                if "results" in result and "channels" in result["results"]:
                    channels = result["results"]["channels"]
                    logger.info(f"[Deepgram] Number of channels: {len(channels) if channels else 0}")
                    if channels and len(channels) > 0:
                        alternatives = channels[0].get("alternatives", [])
                        logger.info(f"[Deepgram] Number of alternatives: {len(alternatives)}")
                        if alternatives and len(alternatives) > 0:
                            transcript = alternatives[0].get("transcript", "").strip()
                            logger.info(f"[Deepgram] Transcript text: '{transcript}'")

                            # Get word-level timestamps if available
                            words = alternatives[0].get("words", [])
                            if words:
                                # Group words into segments (sentences or phrases)
                                current_segment_words = []
                                current_start = None

                                for word_obj in words:
                                    word = word_obj.get("word", "")
                                    start = word_obj.get("start", 0.0)
                                    end = word_obj.get("end", 0.0)

                                    if current_start is None:
                                        current_start = start

                                    current_segment_words.append(word)

                                    # End segment on punctuation or max 10 words
                                    if word.endswith((".", "!", "?")) or len(current_segment_words) >= 10:
                                        segment_text = " ".join(current_segment_words).strip()
                                        if segment_text:
                                            segments.append(WhisperSegment(
                                                text=segment_text,
                                                start=current_start,
                                                end=end
                                            ))
                                        current_segment_words = []
                                        current_start = None

                                # Add remaining words as final segment
                                if current_segment_words:
                                    segment_text = " ".join(current_segment_words).strip()
                                    if segment_text:
                                        segments.append(WhisperSegment(
                                            text=segment_text,
                                            start=current_start,
                                            end=words[-1].get("end", 0.0)
                                        ))
                            # Fallback to full transcript if no words
                            elif transcript:
                                segments.append(WhisperSegment(
                                    text=transcript,
                                    start=0.0,
                                    end=0.0
                                ))

                logger.info(f"[Deepgram] Transcribed {len(segments)} segments: {[s.text for s in segments]}")
                return segments

        except Exception as e:
            logger.error(f"Deepgram transcription error: {e}")
            return []

    async def analyze_audio_for_distress(
        self,
        audio_data: bytes,
        filename: str = "audio.webm"
    ) -> List[WhisperSegment]:
        """Transcribe audio using Chutes Whisper API."""
        if not self.whisper_api_key:
            logger.warning("Chutes Whisper API key not configured")
            return []

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Chutes Whisper API expects base64 encoded audio as "audio_b64"
                audio_b64 = base64.b64encode(audio_data).decode('utf-8')

                logger.info(f"[Whisper] Audio size: {len(audio_data)} bytes, base64 length: {len(audio_b64)}")
                logger.info(f"[Whisper] Endpoint: {self.whisper_endpoint}")

                headers = {
                    "Authorization": f"Bearer {self.whisper_api_key}",
                    "Content-Type": "application/json"
                }

                payload = {
                    "audio_b64": audio_b64
                }

                response = await client.post(
                    self.whisper_endpoint,
                    json=payload,
                    headers=headers
                )

                logger.info(f"[Whisper] Response status: {response.status_code}")
                logger.info(f"[Whisper] Response headers: {dict(response.headers)}")
                logger.info(f"[Whisper] Response text (first 500 chars): {response.text[:500] if response.text else 'EMPTY'}")

                if response.status_code != 200:
                    logger.error(f"Whisper API error: {response.status_code} - {response.text}")
                    return []

                # Parse response - Chutes API returns JSON array of segments
                content_type = response.headers.get("content-type", "")
                segments = []

                if "application/json" in content_type:
                    try:
                        result = response.json()
                        logger.info(f"[Whisper] Parsed JSON type: {type(result)}")

                        # Chutes API returns array: [{"start": 0.0, "end": 3.0, "text": "..."}]
                        if isinstance(result, list):
                            for seg in result:
                                text = seg.get("text", "").strip()
                                if text:
                                    segments.append(WhisperSegment(
                                        text=text,
                                        start=seg.get("start", 0.0),
                                        end=seg.get("end", 0.0)
                                    ))
                        # Object with segments key
                        elif isinstance(result, dict) and "segments" in result:
                            for seg in result["segments"]:
                                text = seg.get("text", "").strip()
                                if text:
                                    segments.append(WhisperSegment(
                                        text=text,
                                        start=seg.get("start", 0.0),
                                        end=seg.get("end", 0.0)
                                    ))
                        # Object with text key
                        elif isinstance(result, dict) and "text" in result:
                            text = result["text"].strip()
                            if text:
                                segments.append(WhisperSegment(text=text, start=0.0, end=0.0))

                    except Exception as json_err:
                        logger.error(f"[Whisper] JSON parse error: {json_err}")
                else:
                    # Plain text response
                    text = response.text.strip()
                    if text:
                        segments.append(WhisperSegment(text=text, start=0.0, end=0.0))

                logger.info(f"[Whisper] Transcribed {len(segments)} segments: {[s.text for s in segments]}")
                return segments

        except Exception as e:
            logger.error(f"Chutes Whisper transcription error: {e}")
            return []

    async def _transcribe_audio_azure(
        self,
        audio_data: bytes,
        filename: str = "audio.webm"
    ) -> List[WhisperSegment]:
        """Transcribe audio using Azure OpenAI Whisper API."""
        if not self.azure_openai_api_key or not self.azure_openai_endpoint:
            logger.warning("Azure OpenAI credentials not configured")
            return []

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Azure OpenAI Whisper uses multipart/form-data
                url = f"{self.azure_openai_endpoint}/openai/deployments/{self.azure_openai_whisper_deployment}/audio/transcriptions"

                # Add API version as query parameter
                url = f"{url}?api-version={self.azure_openai_api_version}"

                logger.info(f"[Azure Whisper] Audio size: {len(audio_data)} bytes")
                logger.info(f"[Azure Whisper] URL: {url}")

                headers = {
                    "api-key": self.azure_openai_api_key
                }

                # Prepare multipart form data
                files = {
                    "file": (filename, audio_data, "audio/webm")
                }

                data = {
                    "response_format": "verbose_json",  # Get timestamps
                    "language": "en"  # Optional: specify language
                }

                response = await client.post(
                    url,
                    headers=headers,
                    files=files,
                    data=data
                )

                logger.info(f"[Azure Whisper] Response status: {response.status_code}")

                if response.status_code != 200:
                    logger.error(f"Azure Whisper API error: {response.status_code} - {response.text}")
                    return []

                # Parse response
                result = response.json()
                logger.info(f"[Azure Whisper] Response: {result}")

                segments = []

                # Azure OpenAI returns segments array with detailed timing
                if "segments" in result:
                    for seg in result["segments"]:
                        text = seg.get("text", "").strip()
                        if text:
                            segments.append(WhisperSegment(
                                text=text,
                                start=seg.get("start", 0.0),
                                end=seg.get("end", 0.0)
                            ))
                # Fallback to just text if segments not available
                elif "text" in result:
                    text = result["text"].strip()
                    if text:
                        segments.append(WhisperSegment(text=text, start=0.0, end=0.0))

                logger.info(f"[Azure Whisper] Transcribed {len(segments)} segments: {[s.text for s in segments]}")
                return segments

        except Exception as e:
            logger.error(f"Azure Whisper transcription error: {e}")
            return []

    async def analyze_audio_for_distress(
        self,
        audio_data: bytes,
        filename: str = "audio.webm"
    ) -> AudioAnalysisResult:
        """
        Analyze audio for signs of distress.
        Combines Whisper transcription with intelligent keyword detection.

        Args:
            audio_data: Raw audio bytes
            filename: Name of the audio file

        Returns:
            AudioAnalysisResult with distress detection
        """
        # First, transcribe the audio
        segments = await self.transcribe_audio(audio_data, filename)

        # Combine all text
        full_text = " ".join(seg.text for seg in segments).lower()

        # Check for keywords by category
        keywords_found = []
        categories_matched = {}

        # Check all keyword categories
        for category, keywords in DISTRESS_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in full_text:
                    keywords_found.append(keyword)
                    if category not in categories_matched:
                        categories_matched[category] = []
                    categories_matched[category].append(keyword)

        # Check for scream indicators
        scream_detected = False
        for indicator in SCREAM_INDICATORS:
            if indicator.lower() in full_text:
                scream_detected = True
                keywords_found.append(indicator)
                break

        # Determine distress type and confidence with improved algorithm
        distress_type = DistressType.NONE
        confidence = 0.0

        # Critical categories (immediate threat)
        critical_categories = ["explicit_help", "emergency", "danger", "hazard", "medical", "assault"]
        high_priority_categories = ["threat", "harm", "escape"]
        medium_priority_categories = ["resistance", "fear", "coercion"]

        # Count category matches
        critical_matches = sum(1 for cat in critical_categories if cat in categories_matched)
        high_priority_matches = sum(1 for cat in high_priority_categories if cat in categories_matched)
        medium_priority_matches = sum(1 for cat in medium_priority_categories if cat in categories_matched)

        # Scream detection (highest priority)
        if scream_detected:
            distress_type = DistressType.SCREAM
            confidence = 0.95
            # Even higher confidence if combined with other indicators
            if critical_matches > 0 or high_priority_matches > 0:
                confidence = 0.99

        # Explicit help calls (highest priority)
        elif "explicit_help" in categories_matched:
            distress_type = DistressType.HELP_CALL
            confidence = 0.98
            # Even higher if combined with other critical indicators
            if critical_matches > 1 or high_priority_matches > 0:
                confidence = 0.99

        # Emergency services or immediate danger (critical)
        elif "emergency" in categories_matched or "danger" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.97

        # Medical emergency or hazard (critical)
        elif "medical" in categories_matched or "hazard" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.96

        # Assault indicators (critical)
        elif "assault" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.95

        # Physical harm (high priority)
        elif "harm" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.90
            if high_priority_matches > 1:
                confidence = 0.93

        # Threat or escape attempt (high priority)
        elif "threat" in categories_matched or "escape" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.85
            if high_priority_matches > 1:
                confidence = 0.88

        # Fear indicators (medium-high priority)
        elif "fear" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.75
            if medium_priority_matches > 1 or high_priority_matches > 0:
                confidence = 0.80

        # Resistance (medium-high priority)
        elif "resistance" in categories_matched:
            # "No" and "don't" alone could be false positives, require context
            if len(categories_matched["resistance"]) > 2 or len(keywords_found) > 3:
                distress_type = DistressType.PANIC
                confidence = 0.70
            else:
                distress_type = DistressType.PANIC
                confidence = 0.55  # Lower confidence for isolated "no/don't"

        # Multiple medium priority indicators
        elif medium_priority_matches >= 2:
            distress_type = DistressType.PANIC
            confidence = 0.75

        # Single medium priority with multiple keywords
        elif medium_priority_matches == 1 and len(keywords_found) >= 3:
            distress_type = DistressType.PANIC
            confidence = 0.65

        # Vulnerable situation (lower priority but still concerning)
        elif "vulnerable" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.60

        # Fallback: multiple keywords but no clear category
        elif len(keywords_found) >= 3:
            distress_type = DistressType.PANIC
            confidence = 0.65
        elif len(keywords_found) == 2:
            distress_type = DistressType.PANIC
            confidence = 0.55
        elif len(keywords_found) == 1:
            # Single keyword - very low confidence unless it's critical
            if any(keywords_found[0] in DISTRESS_KEYWORDS.get(cat, []) for cat in critical_categories):
                distress_type = DistressType.PANIC
                confidence = 0.60
            else:
                distress_type = DistressType.PANIC
                confidence = 0.45  # Below threshold

        # Distress is detected if confidence >= 0.55 (lowered threshold for better sensitivity)
        distress_detected = distress_type != DistressType.NONE and confidence >= 0.55

        # Log detection details for debugging
        if distress_detected:
            logger.info(f"[Distress Detection] Type: {distress_type}, Confidence: {confidence:.2f}")
            logger.info(f"[Distress Detection] Categories matched: {list(categories_matched.keys())}")
            logger.info(f"[Distress Detection] Keywords found: {keywords_found}")

        return AudioAnalysisResult(
            transcription=full_text,
            distress_detected=distress_detected,
            distress_type=distress_type,
            confidence=confidence,
            keywords_found=keywords_found,
            segments=segments
        )

    async def analyze_text_for_distress(
        self,
        transcription: str
    ) -> AudioAnalysisResult:
        """
        Analyze text transcription for distress (from browser speech recognition).
        Primary: Uses LLM (AI) for intelligent contextual analysis
        Fallback: Uses keyword detection if LLM fails or is unavailable

        Args:
            transcription: Text transcription from browser speech API

        Returns:
            AudioAnalysisResult with distress detection
        """
        # Create a single segment with the transcription
        segments = [WhisperSegment(text=transcription, start=0.0, end=0.0)]
        full_text = transcription.lower()

        # PRIMARY: TRY LLM ANALYSIS FIRST
        if not self.test_mode and self.megallm_api_key:
            try:
                logger.info(f"[AI Analysis] Using LLM for: '{transcription}'")

                llm_result = await self.analyze_with_llm(
                    transcription=transcription,
                    context="Real-time voice transcription from safety monitoring. Analyze for distress, danger, or emergency."
                )

                # Extract LLM results
                is_emergency = llm_result.get("is_emergency", False)
                llm_confidence = llm_result.get("confidence", 0.0)
                llm_distress_type = llm_result.get("distress_type", "NONE")
                llm_analysis = llm_result.get("analysis", "")

                # Map LLM distress type to our enum
                if llm_distress_type == "HELP_CALL":
                    distress_type = DistressType.HELP_CALL
                elif llm_distress_type == "SCREAM":
                    distress_type = DistressType.SCREAM
                elif llm_distress_type == "CRYING":
                    distress_type = DistressType.CRYING
                elif llm_distress_type == "PANIC":
                    distress_type = DistressType.PANIC
                else:
                    distress_type = DistressType.NONE

                # Get keywords for supplementary info
                keywords_found = []
                for category, keywords in DISTRESS_KEYWORDS.items():
                    for keyword in keywords:
                        if keyword.lower() in full_text:
                            keywords_found.append(keyword)
                            if len(keywords_found) >= 5:
                                break
                    if len(keywords_found) >= 5:
                        break

                # ONLY use is_emergency from AI, not confidence threshold
                distress_detected = is_emergency

                logger.info(f"[AI Analysis] LLM - Emergency: {is_emergency}, Confidence: {llm_confidence:.2f}, Type: {distress_type}")

                return AudioAnalysisResult(
                    transcription=full_text,
                    distress_detected=distress_detected,
                    distress_type=distress_type,
                    confidence=llm_confidence,
                    keywords_found=keywords_found,
                    segments=segments,
                    analysis=llm_analysis,
                    ai_result=llm_result
                )

            except Exception as e:
                logger.warning(f"[AI Analysis] LLM failed: {e}, using keyword fallback")

        # FALLBACK: KEYWORD-BASED DETECTION
        logger.info(f"[AI Analysis] Using keyword detection for: '{transcription}'")

        # Check for keywords by category
        keywords_found = []
        categories_matched = {}

        # Check all keyword categories
        for category, keywords in DISTRESS_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in full_text:
                    keywords_found.append(keyword)
                    if category not in categories_matched:
                        categories_matched[category] = []
                    categories_matched[category].append(keyword)

        # Check for scream indicators
        scream_detected = False
        for indicator in SCREAM_INDICATORS:
            if indicator.lower() in full_text:
                scream_detected = True
                keywords_found.append(indicator)
                break

        # Determine distress type and confidence with improved algorithm
        distress_type = DistressType.NONE
        confidence = 0.0

        # Critical categories (immediate threat)
        critical_categories = ["explicit_help", "emergency", "danger", "hazard", "medical", "assault"]
        high_priority_categories = ["threat", "harm", "escape"]
        medium_priority_categories = ["resistance", "fear", "coercion"]

        # Count category matches
        critical_matches = sum(1 for cat in critical_categories if cat in categories_matched)
        high_priority_matches = sum(1 for cat in high_priority_categories if cat in categories_matched)
        medium_priority_matches = sum(1 for cat in medium_priority_categories if cat in categories_matched)

        # Scream detection (highest priority)
        if scream_detected:
            distress_type = DistressType.SCREAM
            confidence = 0.95
            if critical_matches > 0 or high_priority_matches > 0:
                confidence = 0.99

        # Explicit help calls (highest priority)
        elif "explicit_help" in categories_matched:
            distress_type = DistressType.HELP_CALL
            confidence = 0.98
            if critical_matches > 1 or high_priority_matches > 0:
                confidence = 0.99

        # Emergency services or immediate danger (critical)
        elif "emergency" in categories_matched or "danger" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.97

        # Medical emergency or hazard (critical)
        elif "medical" in categories_matched or "hazard" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.96

        # Assault indicators (critical)
        elif "assault" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.95

        # Physical harm (high priority)
        elif "harm" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.90
            if high_priority_matches > 1:
                confidence = 0.93

        # Threat or escape attempt (high priority)
        elif "threat" in categories_matched or "escape" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.85
            if high_priority_matches > 1:
                confidence = 0.88

        # Fear indicators (medium-high priority)
        elif "fear" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.75
            if medium_priority_matches > 1 or high_priority_matches > 0:
                confidence = 0.80

        # Resistance (medium-high priority)
        elif "resistance" in categories_matched:
            if len(categories_matched["resistance"]) > 2 or len(keywords_found) > 3:
                distress_type = DistressType.PANIC
                confidence = 0.70
            else:
                distress_type = DistressType.PANIC
                confidence = 0.55

        # Multiple medium priority indicators
        elif medium_priority_matches >= 2:
            distress_type = DistressType.PANIC
            confidence = 0.75

        # Single medium priority with multiple keywords
        elif medium_priority_matches == 1 and len(keywords_found) >= 3:
            distress_type = DistressType.PANIC
            confidence = 0.65

        # Vulnerable situation
        elif "vulnerable" in categories_matched:
            distress_type = DistressType.PANIC
            confidence = 0.60

        # Fallback: multiple keywords but no clear category
        elif len(keywords_found) >= 3:
            distress_type = DistressType.PANIC
            confidence = 0.65
        elif len(keywords_found) == 2:
            distress_type = DistressType.PANIC
            confidence = 0.55
        elif len(keywords_found) == 1:
            if any(keywords_found[0] in DISTRESS_KEYWORDS.get(cat, []) for cat in critical_categories):
                distress_type = DistressType.PANIC
                confidence = 0.60
            else:
                distress_type = DistressType.PANIC
                confidence = 0.45

        # Distress is detected if confidence >= 0.55
        distress_detected = distress_type != DistressType.NONE and confidence >= 0.55

        # Log detection details for debugging
        if distress_detected:
            logger.info(f"[Text Distress Detection] Type: {distress_type}, Confidence: {confidence:.2f}")
            logger.info(f"[Text Distress Detection] Categories matched: {list(categories_matched.keys())}")
            logger.info(f"[Text Distress Detection] Keywords found: {keywords_found}")

        return AudioAnalysisResult(
            transcription=full_text,
            distress_detected=distress_detected,
            distress_type=distress_type,
            confidence=confidence,
            keywords_found=keywords_found,
            segments=segments
        )

    async def analyze_with_llm(
        self,
        transcription: str,
        context: str = ""
    ) -> Dict[str, Any]:
        """
        Use MegaLLM to analyze transcription for safety concerns.

        Args:
            transcription: Text to analyze
            context: Additional context about the situation

        Returns:
            LLM analysis result
        """
        if self.test_mode or not self.megallm_api_key:
            logger.info("[TEST MODE] Simulating LLM analysis")
            return {
                "is_emergency": False,
                "confidence": 0.5,
                "analysis": "Test mode - no actual analysis performed",
                "recommended_action": "none"
            }

        try:
            system_prompt = """You are a safety analysis AI for Protego, a personal safety app monitoring for emergencies in real-time.
Analyze the provided audio transcription for signs of distress or emergency.

CRITICAL: Err on the side of caution. It's better to detect a potential emergency than miss a real one.

Respond in JSON format:
{
    "is_emergency": boolean,
    "confidence": float (0-1),
    "distress_type": "SCREAM" | "HELP_CALL" | "PANIC" | "NONE",
    "analysis": "brief explanation",
    "recommended_action": "trigger_alert" | "monitor" | "none"
}

DISTRESS INDICATORS (treat as EMERGENCY):
1. EXPLICIT help requests: "help", "help me", "please help", "somebody help", "need help"
2. Emergency calls: "call 911", "call police", "call ambulance"
3. Danger warnings: "danger", "threat", "attacking", "following me"
4. Fear expressions: "scared", "afraid", "terrified", "frightened"
5. Resistance: "stop", "no", "don't", "leave me alone", "get away"
6. Physical harm: "hurt", "pain", "bleeding", "injured"
7. Panic indicators: "oh my god", "oh no", screaming sounds

IMPORTANT RULES:
- ANY phrase containing "help" should be considered a HELP_CALL with high confidence (0.8+)
- Even polite/calm requests like "please help me" are EMERGENCIES in a safety monitoring context
- Context matters: "help me with homework" = NOT emergency, "help me" alone = EMERGENCY
- If unsure, lean toward is_emergency=true with moderate confidence (0.6-0.7)"""

            user_prompt = f"""Analyze this audio transcription for safety concerns:

Transcription: "{transcription}"

{f"Additional context: {context}" if context else ""}

Provide your safety analysis in JSON format."""

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.megallm_endpoint,
                    headers={
                        "Authorization": f"Bearer {self.megallm_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.megallm_model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt}
                        ],
                        "temperature": 0.3,
                        "max_tokens": 4000
                    }
                )

                if response.status_code != 200:
                    logger.error(f"MegaLLM API error: {response.status_code} - {response.text}")
                    return {"error": "LLM analysis failed"}

                result = response.json()
                logger.info(f"[AI Analysis] MegaLLM full response: {result}")

                content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
                logger.info(f"[AI Analysis] MegaLLM content: {content}")

                # Try to parse JSON from response
                import re
                try:
                    # First, try to extract JSON from markdown code blocks if present
                    # Pattern matches ```json ... ``` or ``` ... ```
                    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
                    if json_match:
                        json_str = json_match.group(1)
                        logger.info(f"[AI Analysis] Extracted JSON from markdown: {json_str}")
                    else:
                        json_str = content

                    parsed = json.loads(json_str)
                    logger.info(f"[AI Analysis] Parsed JSON: {parsed}")
                    return parsed
                except json.JSONDecodeError as e:
                    logger.warning(f"[AI Analysis] Failed to parse JSON: {e}, returning raw content")
                    return {"analysis": content, "is_emergency": False}

        except Exception as e:
            logger.error(f"LLM analysis error: {e}")
            return {"error": str(e)}

    async def generate_safety_summary(
        self,
        user_name: str,
        session_duration_minutes: int,
        alerts: List[Dict],
        location_history: List[Dict] = None
    ) -> SafetySummary:
        """
        Generate an AI-powered safety summary for a walk session.

        Args:
            user_name: Name of the user
            session_duration_minutes: Duration of the walk session
            alerts: List of alerts during the session
            location_history: Optional location data

        Returns:
            SafetySummary with AI analysis
        """
        if self.test_mode or not self.megallm_api_key:
            # Return a meaningful summary even in test mode
            risk_level = "low"
            if len(alerts) > 0:
                risk_level = "medium" if len(alerts) < 3 else "high"

            return SafetySummary(
                summary=f"Walk session completed. Duration: {session_duration_minutes} minutes. "
                        f"Alerts triggered: {len(alerts)}.",
                risk_level=risk_level,
                recommendations=[
                    "Stay aware of your surroundings",
                    "Keep your phone charged",
                    "Share your location with trusted contacts"
                ],
                alerts_analysis=f"{len(alerts)} alert(s) recorded during this session."
            )

        try:
            # Build context for LLM
            alerts_text = ""
            if alerts:
                alerts_text = "\n".join([
                    f"- {a.get('type', 'Unknown')} alert at {a.get('created_at', 'unknown time')} "
                    f"(confidence: {a.get('confidence', 0):.0%})"
                    for a in alerts
                ])
            else:
                alerts_text = "No alerts during this session."

            prompt = f"""Generate a safety summary for this walk session:

User: {user_name}
Duration: {session_duration_minutes} minutes
Alerts:
{alerts_text}

Provide a JSON response with:
{{
    "summary": "Brief summary of the session",
    "risk_level": "low" | "medium" | "high",
    "recommendations": ["list", "of", "safety", "tips"],
    "alerts_analysis": "Analysis of any alerts that occurred"
}}"""

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.megallm_endpoint,
                    headers={
                        "Authorization": f"Bearer {self.megallm_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.megallm_model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a safety assistant. Provide helpful, reassuring safety summaries."
                            },
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.5,
                        "max_tokens": 4000
                    }
                )

                if response.status_code != 200:
                    raise Exception(f"API error: {response.status_code}")

                result = response.json()
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")

                import json
                try:
                    data = json.loads(content)
                    return SafetySummary(
                        summary=data.get("summary", "Session completed."),
                        risk_level=data.get("risk_level", "low"),
                        recommendations=data.get("recommendations", []),
                        alerts_analysis=data.get("alerts_analysis", "")
                    )
                except json.JSONDecodeError:
                    return SafetySummary(
                        summary=content[:200],
                        risk_level="low",
                        recommendations=[],
                        alerts_analysis=""
                    )

        except Exception as e:
            logger.error(f"Safety summary generation error: {e}")
            return SafetySummary(
                summary=f"Session completed. Duration: {session_duration_minutes} minutes.",
                risk_level="low",
                recommendations=["Stay safe!"],
                alerts_analysis=""
            )

    async def chat_safety_assistant(
        self,
        message: str,
        conversation_history: List[Dict] = None
    ) -> str:
        """
        Chat with AI safety assistant for tips and guidance.

        Args:
            message: User's message
            conversation_history: Previous messages for context

        Returns:
            AI assistant response
        """
        if self.test_mode or not self.megallm_api_key:
            return ("I'm Protego's AI safety assistant. I can help you with safety tips, "
                   "explain how alerts work, and provide guidance during your walks. "
                   "How can I help you stay safe today?")

        try:
            system_prompt = """You are Protego's AI Safety Assistant - a helpful, caring companion
focused on personal safety. You help users:
- Understand safety features
- Get personalized safety tips
- Feel reassured during walks
- Learn about emergency procedures

Be warm, supportive, and concise. Focus on practical safety advice."""

            messages = [{"role": "system", "content": system_prompt}]

            if conversation_history:
                messages.extend(conversation_history[-10:])  # Keep last 10 messages

            messages.append({"role": "user", "content": message})

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.megallm_endpoint,
                    headers={
                        "Authorization": f"Bearer {self.megallm_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.megallm_model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 4000
                    }
                )

                if response.status_code != 200:
                    return "I'm having trouble connecting right now. Please try again later."

                result = response.json()
                return result.get("choices", [{}])[0].get("message", {}).get("content",
                    "I'm here to help with your safety questions!")

        except Exception as e:
            logger.error(f"Chat assistant error: {e}")
            return "I'm having trouble responding right now. Please try again."


    async def analyze_location_safety(
        self,
        latitude: float,
        longitude: float,
        timestamp: str = None,
        user_context: str = None
    ) -> Dict[str, Any]:
        """
        Analyze location safety using AI based on time, coordinates, and context.

        Args:
            latitude: Location latitude
            longitude: Location longitude
            timestamp: Current timestamp (ISO format)
            user_context: Additional context about the user's situation

        Returns:
            Safety analysis with score, status, and factors
        """
        from datetime import datetime

        # Parse time info
        if timestamp:
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except:
                dt = datetime.now()
        else:
            dt = datetime.now()

        hour = dt.hour
        is_night = hour < 6 or hour > 20
        is_late_night = hour < 5 or hour > 22
        day_of_week = dt.strftime("%A")
        is_weekend = day_of_week in ["Saturday", "Sunday"]

        # If test mode or no API key, use heuristic-based analysis
        if self.test_mode or not self.megallm_api_key:
            logger.info("[TEST MODE] Using heuristic safety analysis")

            # Base score
            safety_score = 85

            # Time-based adjustments
            if is_late_night:
                safety_score -= 25
            elif is_night:
                safety_score -= 15

            # Weekend late night adjustment
            if is_weekend and is_late_night:
                safety_score -= 5

            # Clamp score
            safety_score = max(20, min(100, safety_score))

            # Determine status
            if safety_score >= 75:
                status = "safe"
            elif safety_score >= 50:
                status = "caution"
            else:
                status = "alert"

            factors = []
            if is_late_night:
                factors.append("Late night hours - reduced visibility and fewer people around")
            elif is_night:
                factors.append("Evening hours - stay alert and stick to well-lit areas")
            if is_weekend and is_night:
                factors.append("Weekend night - be aware of your surroundings")

            return {
                "safety_score": safety_score,
                "status": status,
                "risk_level": "high" if safety_score < 50 else "medium" if safety_score < 75 else "low",
                "factors": factors if factors else ["Conditions appear normal"],
                "recommendations": [
                    "Keep your phone charged and accessible",
                    "Share your live location with trusted contacts",
                    "Stay on well-lit, populated routes"
                ] if safety_score < 75 else ["Enjoy your walk! Stay aware of your surroundings."],
                "time_context": {
                    "hour": hour,
                    "is_night": is_night,
                    "is_late_night": is_late_night,
                    "day_of_week": day_of_week
                },
                "analyzed_at": dt.isoformat()
            }

        # Use LLM for more sophisticated analysis
        try:
            prompt = f"""Analyze the safety conditions for a person walking at this location and time:

Location: {latitude}, {longitude}
Time: {dt.strftime("%I:%M %p")} on {day_of_week}
Hour: {hour}:00
Night time: {is_night}
Late night (after 10pm or before 5am): {is_late_night}
{f"User context: {user_context}" if user_context else ""}

Provide a safety analysis in JSON format:
{{
    "safety_score": <integer 0-100>,
    "status": "safe" | "caution" | "alert",
    "risk_level": "low" | "medium" | "high",
    "factors": ["list of factors affecting safety"],
    "recommendations": ["personalized safety tips"]
}}

Consider:
- Time of day (darkness, activity levels)
- Day of week patterns
- General urban safety principles
- Walking alone considerations

Be realistic but not alarmist. Focus on actionable advice."""

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.megallm_endpoint,
                    headers={
                        "Authorization": f"Bearer {self.megallm_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.megallm_model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a safety analysis AI. Provide realistic, helpful safety assessments for people walking. Be balanced - not alarmist but appropriately cautious."
                            },
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.4,
                        "max_tokens": 4000
                    }
                )

                if response.status_code != 200:
                    logger.error(f"MegaLLM API error: {response.status_code}")
                    # Fall back to heuristic
                    return await self.analyze_location_safety(latitude, longitude, timestamp, user_context)

                result = response.json()
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")

                import json
                try:
                    analysis = json.loads(content)
                    analysis["time_context"] = {
                        "hour": hour,
                        "is_night": is_night,
                        "is_late_night": is_late_night,
                        "day_of_week": day_of_week
                    }
                    analysis["analyzed_at"] = dt.isoformat()
                    return analysis
                except json.JSONDecodeError:
                    logger.error("Failed to parse LLM response as JSON")
                    # Fall back to heuristic by calling with test_mode behavior
                    self.test_mode = True
                    result = await self.analyze_location_safety(latitude, longitude, timestamp, user_context)
                    self.test_mode = settings.test_mode
                    return result

        except Exception as e:
            logger.error(f"Location safety analysis error: {e}")
            # Return a safe default
            return {
                "safety_score": 75,
                "status": "caution",
                "risk_level": "low",
                "factors": ["Unable to complete full analysis"],
                "recommendations": ["Stay aware of your surroundings"],
                "analyzed_at": dt.isoformat()
            }


# Global AI service instance
ai_service = AIService()
