"""
Distress detection service.
Analyzes transcripts for safety keywords and distress signals.
"""

from typing import List, Tuple, Set, Dict, Any
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class DistressLevel(str, Enum):
    """Severity of detected distress."""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class DistressDetectionResult:
    """Result of distress analysis."""
    detected: bool
    level: DistressLevel
    confidence: float
    keywords_found: List[str]
    trigger_alert: bool
    reason: str


class DistressDetector:
    """
    Analyzes user speech for distress signals.

    Features:
    - Multi-tier keyword matching
    - Context-aware detection
    - Confidence scoring
    - False positive reduction
    """

    CRITICAL_KEYWORDS = {
        "help me", "someone help", "call 911", "call police",
        "i'm being attacked", "he's following me", "she's following me"
    }

    HIGH_PRIORITY_KEYWORDS = {
        "help", "emergency", "danger", "attack", "following me",
        "scared", "threatening", "won't leave me alone"
    }

    MEDIUM_PRIORITY_KEYWORDS = {
        "follow", "following", "uncomfortable", "unsafe",
        "nervous", "worried", "suspicious", "creepy"
    }

    LOW_PRIORITY_KEYWORDS = {
        "alone", "dark", "late", "empty", "quiet"
    }

    SAFE_PHRASES = {
        "i'm fine", "i'm okay", "just kidding", "false alarm",
        "everything's good", "all good", "no worries"
    }

    def __init__(self, alert_threshold: float = 0.7):
        """
        Initialize distress detector.

        Args:
            alert_threshold: Confidence threshold for triggering alerts
        """
        self.alert_threshold = alert_threshold
        self.detection_history: List[DistressDetectionResult] = []

    def analyze(self, transcript: str, context: List[str] = None) -> DistressDetectionResult:
        """
        Analyze transcript for distress signals.

        Args:
            transcript: User's speech text
            context: Previous transcripts for context

        Returns:
            DistressDetectionResult with detection details
        """
        text_lower = transcript.lower().strip()

        if self._contains_safe_phrase(text_lower):
            return DistressDetectionResult(
                detected=False,
                level=DistressLevel.NONE,
                confidence=0.0,
                keywords_found=[],
                trigger_alert=False,
                reason="User indicated safety"
            )

        keywords_found = self._find_keywords(text_lower)
        level, confidence, reason = self._calculate_distress_level(
            keywords_found,
            context or []
        )

        trigger_alert = confidence >= self.alert_threshold and level in [
            DistressLevel.HIGH,
            DistressLevel.CRITICAL
        ]

        result = DistressDetectionResult(
            detected=level != DistressLevel.NONE,
            level=level,
            confidence=confidence,
            keywords_found=list(keywords_found),
            trigger_alert=trigger_alert,
            reason=reason
        )

        self.detection_history.append(result)

        logger.info(
            f"Distress analysis: level={level.value}, "
            f"confidence={confidence:.2f}, trigger={trigger_alert}"
        )

        return result

    def _contains_safe_phrase(self, text: str) -> bool:
        """Check if text contains safety-indicating phrases."""
        return any(phrase in text for phrase in self.SAFE_PHRASES)

    def _find_keywords(self, text: str) -> Set[str]:
        """Find all matching distress keywords in text."""
        found = set()

        for keyword in self.CRITICAL_KEYWORDS:
            if keyword in text:
                found.add(keyword)

        for keyword in self.HIGH_PRIORITY_KEYWORDS:
            if keyword in text:
                found.add(keyword)

        for keyword in self.MEDIUM_PRIORITY_KEYWORDS:
            if keyword in text:
                found.add(keyword)

        for keyword in self.LOW_PRIORITY_KEYWORDS:
            if keyword in text:
                found.add(keyword)

        return found

    def _calculate_distress_level(
        self,
        keywords: Set[str],
        context: List[str]
    ) -> Tuple[DistressLevel, float, str]:
        """
        Calculate distress level and confidence based on keywords.

        Returns:
            (level, confidence, reason)
        """
        if not keywords:
            return DistressLevel.NONE, 0.0, "No distress keywords detected"

        critical_found = keywords & self.CRITICAL_KEYWORDS
        if critical_found:
            return (
                DistressLevel.CRITICAL,
                0.95,
                f"Critical keywords detected: {', '.join(critical_found)}"
            )

        high_found = keywords & self.HIGH_PRIORITY_KEYWORDS
        if high_found:
            confidence = 0.85 if len(high_found) > 1 else 0.75
            return (
                DistressLevel.HIGH,
                confidence,
                f"High priority keywords: {', '.join(high_found)}"
            )

        medium_found = keywords & self.MEDIUM_PRIORITY_KEYWORDS
        low_found = keywords & self.LOW_PRIORITY_KEYWORDS

        if medium_found or len(low_found) >= 2:
            confidence = 0.65 if medium_found else 0.50
            return (
                DistressLevel.MEDIUM,
                confidence,
                f"Medium concern: {', '.join(keywords)}"
            )

        if low_found:
            return (
                DistressLevel.LOW,
                0.35,
                f"Low concern: {', '.join(low_found)}"
            )

        return DistressLevel.NONE, 0.0, "Unknown"

    def get_detection_summary(self) -> Dict[str, Any]:
        """Get summary of all detections in this session."""
        if not self.detection_history:
            return {
                "total_detections": 0,
                "max_level": DistressLevel.NONE.value,
                "alerts_triggered": 0
            }

        return {
            "total_detections": len(self.detection_history),
            "max_level": max(
                d.level for d in self.detection_history
            ).value,
            "alerts_triggered": sum(
                1 for d in self.detection_history if d.trigger_alert
            ),
            "keywords_detected": list(set(
                kw for d in self.detection_history for kw in d.keywords_found
            ))
        }
