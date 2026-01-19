"""
Safety call session state management.
Tracks individual call sessions and their state.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from .distress_detector import DistressDetector, DistressDetectionResult
from config import settings
import logging

logger = logging.getLogger(__name__)


class SafetyCallSession:
    """
    Manages state for a single safety call session.

    Responsibilities:
    - Track conversation history
    - Manage distress detection
    - Store session metadata
    """

    def __init__(
        self,
        session_id: str,
        user_id: int,
        user_name: str,
        location: Optional[Dict[str, float]] = None
    ):
        self.session_id = session_id
        self.user_id = user_id
        self.user_name = user_name
        self.location = location or {}
        self.start_time = datetime.utcnow()
        self.end_time: Optional[datetime] = None

        self.conversation_history: List[Dict[str, Any]] = []
        self.distress_detector = DistressDetector(
            alert_threshold=settings.safety_call_alert_threshold
        )

        self.alert_ids: List[int] = []
        self.active = True

        logger.info(
            f"Created safety call session: {session_id} "
            f"for user {user_id} ({user_name})"
        )

    def add_transcript(
        self,
        transcript: str,
        speaker: str = "user"
    ) -> Optional[DistressDetectionResult]:
        """
        Add a transcript to conversation history and check for distress.

        Args:
            transcript: What was said
            speaker: Who said it ("user" or "ai")

        Returns:
            DistressDetectionResult if speaker is user, None otherwise
        """
        self.conversation_history.append({
            "speaker": speaker,
            "transcript": transcript,
            "timestamp": datetime.utcnow().isoformat()
        })

        if speaker == "user":
            context = [
                msg["transcript"]
                for msg in self.conversation_history[-5:]
                if msg["speaker"] == "user"
            ]
            result = self.distress_detector.analyze(transcript, context)

            if result.trigger_alert:
                logger.warning(
                    f"Distress detected in session {self.session_id}: "
                    f"level={result.level.value}, confidence={result.confidence}"
                )

            return result

        return None

    def add_alert(self, alert_id: int):
        """Record that an alert was triggered for this session."""
        self.alert_ids.append(alert_id)
        logger.info(f"Alert {alert_id} added to session {self.session_id}")

    def end_session(self):
        """Mark session as ended."""
        self.active = False
        self.end_time = datetime.utcnow()
        logger.info(f"Ended safety call session: {self.session_id}")

    def get_duration_seconds(self) -> int:
        """Get session duration in seconds."""
        end = self.end_time or datetime.utcnow()
        return int((end - self.start_time).total_seconds())

    def get_duration_minutes(self) -> float:
        """Get session duration in minutes."""
        return self.get_duration_seconds() / 60.0

    def get_summary(self) -> Dict[str, Any]:
        """Get session summary for database storage."""
        distress_summary = self.distress_detector.get_detection_summary()

        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "user_name": self.user_name,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration_seconds": self.get_duration_seconds(),
            "location": self.location,
            "conversation_count": len(self.conversation_history),
            "distress_detected": distress_summary["total_detections"] > 0,
            "max_distress_level": distress_summary["max_level"],
            "alerts_triggered": len(self.alert_ids),
            "alert_ids": self.alert_ids,
            "keywords_detected": distress_summary.get("keywords_detected", []),
            "conversation_history": self.conversation_history
        }
