"""
Safety call repository for database operations.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from .base import BaseRepository
from models import SafetyCallSession, User


class SafetyCallRepository(BaseRepository[SafetyCallSession]):
    """Repository for safety call session database operations."""

    def __init__(self, db: Session):
        super().__init__(db, SafetyCallSession)

    async def save_session(self, summary: Dict[str, Any]) -> SafetyCallSession:
        """
        Save a completed safety call session.

        Args:
            summary: Session summary from SafetyCallSession.get_summary()

        Returns:
            Saved SafetyCallSession instance
        """
        session = SafetyCallSession(
            user_id=summary["user_id"],
            session_id=summary["session_id"],
            start_time=summary["start_time"],
            end_time=summary["end_time"],
            duration_seconds=summary["duration_seconds"],
            start_location_lat=summary["location"].get("latitude"),
            start_location_lng=summary["location"].get("longitude"),
            distress_detected=summary["distress_detected"],
            distress_keywords=summary["keywords_detected"],
            alert_triggered=summary["alerts_triggered"] > 0,
            alert_id=summary["alert_ids"][0] if summary["alert_ids"] else None,
            conversation_json=summary["conversation_history"]
        )

        return self.create(session)

    def get_by_session_id(self, session_id: str) -> Optional[SafetyCallSession]:
        """Get session by session_id (UUID)."""
        return self.db.query(SafetyCallSession).filter(
            SafetyCallSession.session_id == session_id
        ).first()

    def get_user_sessions(
        self,
        user_id: int,
        limit: int = 20,
        offset: int = 0
    ) -> List[SafetyCallSession]:
        """Get all sessions for a user."""
        return self.db.query(SafetyCallSession).filter(
            SafetyCallSession.user_id == user_id
        ).order_by(SafetyCallSession.start_time.desc()).limit(limit).offset(offset).all()

    def get_recent_with_distress(
        self,
        user_id: int,
        days: int = 7
    ) -> List[SafetyCallSession]:
        """Get recent sessions where distress was detected."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        return self.db.query(SafetyCallSession).filter(
            SafetyCallSession.user_id == user_id,
            SafetyCallSession.distress_detected == True,
            SafetyCallSession.start_time >= cutoff
        ).order_by(SafetyCallSession.start_time.desc()).all()

    def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        """Get statistics for user's safety calls."""
        sessions = self.db.query(SafetyCallSession).filter(
            SafetyCallSession.user_id == user_id
        ).all()

        if not sessions:
            return {
                "total_calls": 0,
                "total_duration_seconds": 0,
                "distress_detected_count": 0,
                "alerts_triggered_count": 0
            }

        return {
            "total_calls": len(sessions),
            "total_duration_seconds": sum(
                s.duration_seconds or 0 for s in sessions
            ),
            "distress_detected_count": sum(
                1 for s in sessions if s.distress_detected
            ),
            "alerts_triggered_count": sum(
                1 for s in sessions if s.alert_triggered
            )
        }
