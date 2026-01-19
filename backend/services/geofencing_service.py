"""
Geofencing service for monitoring user location and safe location events.
Sends WhatsApp notifications when users enter/leave safe locations.
"""

from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from models import User, SafeLocation, WalkSession
from services.twilio_service import twilio_service
from routers.safe_locations import calculate_distance

logger = logging.getLogger(__name__)


class GeofencingService:
    """
    Service for monitoring geofence events and sending notifications.
    Tracks when users enter/leave safe locations and triggers appropriate actions.
    """

    def __init__(self):
        """Initialize geofencing service."""
        # Cache to prevent duplicate notifications (user_id -> event_type -> timestamp)
        self._notification_cache: Dict[int, Dict[str, datetime]] = {}
        # Minimum time between duplicate notifications (in seconds)
        self._notification_cooldown = 300  # 5 minutes

    def _should_send_notification(self, user_id: int, event_type: str) -> bool:
        """
        Check if notification should be sent based on cooldown period.

        Args:
            user_id: User ID
            event_type: Type of event (e.g., 'left_safe_location', 'entered_safe_location')

        Returns:
            True if notification should be sent, False otherwise
        """
        now = datetime.utcnow()

        if user_id not in self._notification_cache:
            self._notification_cache[user_id] = {}

        last_notification = self._notification_cache[user_id].get(event_type)

        if last_notification is None:
            # First notification of this type
            self._notification_cache[user_id][event_type] = now
            return True

        # Check if cooldown period has passed
        time_since_last = (now - last_notification).total_seconds()
        if time_since_last >= self._notification_cooldown:
            self._notification_cache[user_id][event_type] = now
            return True

        return False

    def _send_whatsapp_to_contacts(
        self,
        user: User,
        message: str,
        db: Session
    ) -> Dict[str, any]:
        """
        Send WhatsApp message to user's trusted contacts.

        Args:
            user: User object
            message: Message to send
            db: Database session

        Returns:
            Dictionary with notification results
        """
        # Get trusted contacts
        trusted_contacts = [contact.phone for contact in user.trusted_contact_list if contact.is_active]

        if not trusted_contacts:
            logger.warning(f"No active trusted contacts for user {user.id}")
            return {"success": False, "error": "No trusted contacts"}

        results = {
            "success": True,
            "contacts_notified": 0,
            "results": []
        }

        # Send WhatsApp to each contact
        for contact_phone in trusted_contacts:
            result = twilio_service.send_whatsapp(contact_phone, message)
            results["results"].append({
                "contact": contact_phone,
                **result
            })
            if result.get("success"):
                results["contacts_notified"] += 1

        return results

    def check_location_and_notify(
        self,
        user: User,
        latitude: float,
        longitude: float,
        db: Session
    ) -> Dict[str, any]:
        """
        Check user's location against safe locations and send notifications.

        Args:
            user: User object
            latitude: Current latitude
            longitude: Current longitude
            db: Database session

        Returns:
            Dictionary with geofence status and notification results
        """
        # Get all active safe locations for user
        safe_locations = db.query(SafeLocation).filter(
            SafeLocation.user_id == user.id,
            SafeLocation.is_active == True
        ).all()

        if not safe_locations:
            return {
                "inside_safe_location": False,
                "notification_sent": False,
                "message": "No safe locations configured"
            }

        # Check if inside any safe location
        inside_location = None
        for location in safe_locations:
            distance = calculate_distance(
                latitude, longitude,
                location.latitude, location.longitude
            )

            if distance <= location.radius_meters:
                inside_location = location
                break

        # Get current walk session
        active_session = db.query(WalkSession).filter(
            WalkSession.user_id == user.id,
            WalkSession.end_time == None
        ).first()

        response = {
            "inside_safe_location": inside_location is not None,
            "safe_location_name": inside_location.name if inside_location else None,
            "notification_sent": False,
            "action_taken": None
        }

        # Handle entering safe location
        if inside_location:
            # Check if should send "arrived" notification
            event_type = f"entered_{inside_location.id}"
            if self._should_send_notification(user.id, event_type):
                message = self._build_entered_message(user, inside_location)
                notification_result = self._send_whatsapp_to_contacts(user, message, db)
                response["notification_sent"] = notification_result.get("success", False)
                response["notification_result"] = notification_result

            # Auto-stop walk if enabled
            if inside_location.auto_stop_walk and active_session:
                response["action_taken"] = "auto_stop_walk"
                response["message"] = f"Inside {inside_location.name} - walk will auto-stop soon"

        # Handle leaving safe location (outside all safe locations)
        else:
            # Check if should send "left" notification
            event_type = "left_safe_location"
            if self._should_send_notification(user.id, event_type):
                message = self._build_left_message(user)
                notification_result = self._send_whatsapp_to_contacts(user, message, db)
                response["notification_sent"] = notification_result.get("success", False)
                response["notification_result"] = notification_result

            # Auto-start walk if enabled and not already walking
            has_auto_start_location = any(loc.auto_start_walk for loc in safe_locations)
            if has_auto_start_location and not active_session:
                response["action_taken"] = "should_auto_start_walk"
                response["message"] = "Left safe location - walk mode should start"

        return response

    def notify_walk_started(
        self,
        user: User,
        walk_session: WalkSession,
        auto_started: bool,
        db: Session
    ) -> Dict[str, any]:
        """
        Notify contacts when walk mode is started.

        Args:
            user: User object
            walk_session: Walk session that was started
            auto_started: Whether walk was auto-started by geofencing
            db: Database session

        Returns:
            Notification results
        """
        event_type = "walk_started_auto" if auto_started else "walk_started_manual"

        if not self._should_send_notification(user.id, event_type):
            return {"success": False, "message": "Notification on cooldown"}

        message = self._build_walk_started_message(user, walk_session, auto_started)
        return self._send_whatsapp_to_contacts(user, message, db)

    def notify_walk_stopped(
        self,
        user: User,
        walk_session: WalkSession,
        auto_stopped: bool,
        db: Session
    ) -> Dict[str, any]:
        """
        Notify contacts when walk mode is stopped.

        Args:
            user: User object
            walk_session: Walk session that was stopped
            auto_stopped: Whether walk was auto-stopped by geofencing
            db: Database session

        Returns:
            Notification results
        """
        event_type = "walk_stopped_auto" if auto_stopped else "walk_stopped_manual"

        if not self._should_send_notification(user.id, event_type):
            return {"success": False, "message": "Notification on cooldown"}

        message = self._build_walk_stopped_message(user, walk_session, auto_stopped)
        return self._send_whatsapp_to_contacts(user, message, db)

    def _build_entered_message(self, user: User, location: SafeLocation) -> str:
        """Build WhatsApp message for entering safe location."""
        return (
            f"🏠 *Protego Safety Update*\n\n"
            f"{user.name} has arrived at *{location.name}*\n\n"
            f"📍 Location: https://maps.google.com/?q={location.latitude},{location.longitude}\n"
            f"🕐 Time: {datetime.utcnow().strftime('%I:%M %p')}\n\n"
            f"They are now in a safe location."
        )

    def _build_left_message(self, user: User) -> str:
        """Build WhatsApp message for leaving safe location."""
        return (
            f"🚶 *Protego Safety Update*\n\n"
            f"{user.name} has left their safe location\n\n"
            f"🕐 Time: {datetime.utcnow().strftime('%I:%M %p')}\n"
            f"⚠️ Walk mode will start automatically to ensure their safety.\n\n"
            f"You will receive updates during their journey."
        )

    def _build_walk_started_message(
        self,
        user: User,
        walk_session: WalkSession,
        auto_started: bool
    ) -> str:
        """Build WhatsApp message for walk started."""
        mode_text = "automatically started" if auto_started else "started"
        trigger_text = " (left safe location)" if auto_started else ""

        location_str = ""
        if walk_session.location_lat and walk_session.location_lng:
            location_str = f"\n📍 Starting Location: https://maps.google.com/?q={walk_session.location_lat},{walk_session.location_lng}"

        return (
            f"🛡️ *Protego Walk Mode Active*\n\n"
            f"{user.name} has {mode_text} walk mode{trigger_text}\n\n"
            f"🕐 Started: {walk_session.start_time.strftime('%I:%M %p')}"
            f"{location_str}\n\n"
            f"They will be monitored for safety. You'll receive alerts if anything seems wrong."
        )

    def _build_walk_stopped_message(
        self,
        user: User,
        walk_session: WalkSession,
        auto_stopped: bool
    ) -> str:
        """Build WhatsApp message for walk stopped."""
        mode_text = "automatically stopped" if auto_stopped else "stopped"
        trigger_text = " (arrived at safe location)" if auto_stopped else ""

        # Calculate duration
        duration = "Unknown"
        if walk_session.start_time and walk_session.end_time:
            delta = walk_session.end_time - walk_session.start_time
            minutes = int(delta.total_seconds() / 60)
            if minutes < 1:
                duration = "< 1 minute"
            elif minutes == 1:
                duration = "1 minute"
            else:
                duration = f"{minutes} minutes"

        location_str = ""
        if walk_session.end_latitude and walk_session.end_longitude:
            location_str = f"\n📍 Final Location: https://maps.google.com/?q={walk_session.end_latitude},{walk_session.end_longitude}"

        return (
            f"✅ *Protego Walk Mode Ended*\n\n"
            f"{user.name} has {mode_text} walk mode{trigger_text}\n\n"
            f"🕐 Ended: {walk_session.end_time.strftime('%I:%M %p')}\n"
            f"⏱️ Duration: {duration}"
            f"{location_str}\n\n"
            f"They have arrived safely."
        )


# Global geofencing service instance
geofencing_service = GeofencingService()
