"""
Safety call manager - orchestrates safety call sessions.
"""

from typing import Dict, Optional
from datetime import datetime
import uuid
import asyncio
import logging

from .session import SafetyCallSession
from .conversation import ConversationPromptBuilder, ConversationContext
from services.ai import (
    ProviderFactory,
    AIProviderType,
    AudioConfig,
    ConversationConfig
)
from config import settings

logger = logging.getLogger(__name__)


class SafetyCallManager:
    """
    Manages all active safety call sessions.

    Responsibilities:
    - Create and track sessions
    - Coordinate with AI providers
    - Handle distress detection
    - Trigger alerts when needed
    """

    def __init__(self):
        self.active_sessions: Dict[str, SafetyCallSession] = {}
        logger.info("SafetyCallManager initialized - provider will be selected from settings")

    async def create_session(
        self,
        user_id: int,
        user_name: str,
        location: Optional[Dict[str, float]] = None
    ) -> Dict:
        """
        Create a new safety call session.

        Args:
            user_id: User's ID
            user_name: User's name
            location: User's current location

        Returns:
            Dict with session_id and connection details
        """
        session_id = str(uuid.uuid4())

        session = SafetyCallSession(
            session_id=session_id,
            user_id=user_id,
            user_name=user_name,
            location=location
        )

        self.active_sessions[session_id] = session

        context = ConversationContext(
            user_name=user_name,
            user_location=location,
            time_of_day=datetime.utcnow().strftime("%I:%M %p")
        )

        system_instructions = ConversationPromptBuilder.build_safety_call_prompt(context)

        provider = ProviderFactory.create_from_settings()

        audio_config = AudioConfig()
        conversation_config = ConversationConfig()

        await provider.initialize(
            system_instructions=system_instructions,
            audio_config=audio_config,
            conversation_config=conversation_config
        )

        connection_details = await provider.get_connection_details()

        logger.info(f"Created safety call session {session_id} for user {user_id}")

        return {
            "session_id": session_id,
            "connection": connection_details,
            "system_instructions": system_instructions
        }

    async def handle_transcript(
        self,
        session_id: str,
        transcript: str,
        speaker: str = "user"
    ) -> Optional[Dict]:
        """
        Handle a new transcript from the conversation.

        Args:
            session_id: Session ID
            transcript: What was said
            speaker: Who said it

        Returns:
            Dict with distress info if detected, None otherwise
        """
        session = self.active_sessions.get(session_id)
        if not session:
            logger.warning(f"Transcript for unknown session: {session_id}")
            return None

        detection_result = session.add_transcript(transcript, speaker)

        if detection_result and detection_result.trigger_alert:
            alert_id = await self._trigger_alert(session, detection_result)
            return {
                "distress_detected": True,
                "level": detection_result.level.value,
                "confidence": detection_result.confidence,
                "alert_id": alert_id
            }

        return None

    async def _trigger_alert(self, session: SafetyCallSession, detection_result) -> int:
        """
        Trigger an alert for detected distress.

        Args:
            session: The session where distress was detected
            detection_result: The distress detection result

        Returns:
            Alert ID
        """
        from database import SessionLocal
        from models import Alert, AlertType, AlertStatus
        from services.alert_manager import alert_manager

        db = SessionLocal()
        try:
            alert_type_map = {
                "critical": AlertType.DURESS,
                "high": AlertType.PANIC,
                "medium": AlertType.DISTRESS
            }

            alert_type = alert_type_map.get(
                detection_result.level.value,
                AlertType.DISTRESS
            )

            alert = Alert(
                user_id=session.user_id,
                type=alert_type,
                confidence=detection_result.confidence,
                status=AlertStatus.PENDING,
                location_lat=session.location.get("latitude"),
                location_lng=session.location.get("longitude"),
                is_duress=True
            )

            db.add(alert)
            db.commit()
            db.refresh(alert)

            session.add_alert(alert.id)

            asyncio.create_task(alert_manager.start_alert_countdown(alert.id))

            logger.warning(
                f"Alert {alert.id} triggered for session {session.session_id}: "
                f"type={alert_type.value}, confidence={detection_result.confidence}"
            )

            return alert.id

        finally:
            db.close()

    async def check_session_duration(self, session_id: str) -> bool:
        """
        Check if session has exceeded max duration.

        Args:
            session_id: Session ID to check

        Returns:
            True if session should be terminated
        """
        session = self.active_sessions.get(session_id)
        if not session:
            return False

        duration_minutes = session.get_duration_minutes()
        max_duration = settings.safety_call_max_duration_minutes

        if duration_minutes >= max_duration:
            logger.warning(
                f"Session {session_id} exceeded max duration "
                f"({duration_minutes}/{max_duration} minutes). Auto-terminating."
            )
            await self.end_session(session_id)
            return True

        return False

    async def end_session(self, session_id: str) -> Optional[Dict]:
        """
        End a safety call session.

        Args:
            session_id: Session ID to end

        Returns:
            Session summary dict
        """
        session = self.active_sessions.pop(session_id, None)
        if not session:
            logger.warning(f"Attempted to end unknown session: {session_id}")
            return None

        session.end_session()
        summary = session.get_summary()

        from repositories.safety_call_repo import SafetyCallRepository
        from database import SessionLocal

        db = SessionLocal()
        try:
            repo = SafetyCallRepository(db)
            await repo.save_session(summary)
        finally:
            db.close()

        logger.info(
            f"Ended session {session_id}: "
            f"duration={summary['duration_seconds']}s, "
            f"alerts={summary['alerts_triggered']}"
        )

        return summary

    def get_session(self, session_id: str) -> Optional[SafetyCallSession]:
        """Get active session by ID."""
        return self.active_sessions.get(session_id)

    def get_active_session_count(self) -> int:
        """Get count of active sessions."""
        return len(self.active_sessions)


safety_call_manager = SafetyCallManager()
