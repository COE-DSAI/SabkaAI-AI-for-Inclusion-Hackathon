"""
Alert manager service for handling alert lifecycle.
Manages countdown timers, cancellation, and notification triggers.
"""

import asyncio
from datetime import datetime
from typing import Optional, Dict
import logging

from sqlalchemy.orm import Session
from models import Alert, User, AlertStatus, TrustedContact, WalkSession, GovAuthority
from services.twilio_service import twilio_service
from services.vonage_emergency_call import vonage_emergency_service
from config import settings
import math

logger = logging.getLogger(__name__)


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points using Haversine formula.

    Args:
        lat1, lon1: First point coordinates
        lat2, lon2: Second point coordinates

    Returns:
        Distance in meters
    """
    # Earth radius in meters
    R = 6371000

    # Convert to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c


def get_authorities_in_radius(db: Session, alert_lat: float, alert_lng: float) -> list[GovAuthority]:
    """
    Find all active government authorities whose jurisdiction includes the alert location.

    Args:
        db: Database session
        alert_lat: Alert latitude
        alert_lng: Alert longitude

    Returns:
        List of GovAuthority objects within their jurisdiction radius
    """
    # Get all active authorities
    authorities = db.query(GovAuthority).filter(
        GovAuthority.is_active == True
    ).all()

    logger.info(f"Checking {len(authorities)} active authorities for alert at ({alert_lat}, {alert_lng})")

    authorities_in_range = []
    for authority in authorities:
        distance = calculate_distance(
            alert_lat, alert_lng,
            authority.latitude, authority.longitude
        )

        logger.debug(
            f"Authority {authority.name} at ({authority.latitude}, {authority.longitude}): "
            f"distance={distance:.0f}m, radius={authority.radius_meters}m"
        )

        if distance <= authority.radius_meters:
            authorities_in_range.append(authority)
            logger.info(
                f"✓ Authority {authority.name} is within range "
                f"(distance: {distance:.0f}m, radius: {authority.radius_meters}m)"
            )
        else:
            logger.info(
                f"✗ Authority {authority.name} is OUT OF range "
                f"(distance: {distance:.0f}m > radius: {authority.radius_meters}m)"
            )

    logger.info(f"Total authorities in range: {len(authorities_in_range)}")
    return authorities_in_range


class AlertManager:
    """
    Manages alert countdown timers and notification triggers.
    Maintains a registry of pending alerts and their countdown tasks.
    """

    def __init__(self):
        """Initialize alert manager with empty pending alerts registry."""
        self.pending_alerts: Dict[int, asyncio.Task] = {}

    async def start_alert_countdown(
        self,
        alert_id: int
    ) -> bool:
        """
        Start countdown timer for an alert.
        If not cancelled within countdown period, triggers notifications.
        Persists countdown state to database for recovery after restarts.

        Args:
            alert_id: ID of the alert to start countdown for

        Returns:
            True if countdown started successfully
        """
        from database import SessionLocal
        from datetime import timedelta

        # Check if alert already has a pending countdown
        if alert_id in self.pending_alerts:
            logger.warning(f"Alert {alert_id} already has pending countdown")
            return False

        # Update alert in database with countdown timestamps
        db = SessionLocal()
        try:
            alert = db.query(Alert).filter(Alert.id == alert_id).first()
            if alert:
                now = datetime.utcnow()
                expires_at = now + timedelta(seconds=settings.alert_countdown_seconds)

                alert.countdown_started_at = now
                alert.countdown_expires_at = expires_at
                db.commit()

                logger.info(f"Persisted countdown state for alert {alert_id} (expires at {expires_at})")
        finally:
            db.close()

        # Create countdown task (will create its own db session)
        task = asyncio.create_task(
            self._countdown_and_trigger(alert_id)
        )
        self.pending_alerts[alert_id] = task

        logger.info(
            f"Started {settings.alert_countdown_seconds}s countdown for alert {alert_id}"
        )
        return True

    async def cancel_alert(
        self,
        alert_id: int,
        db: Session
    ) -> bool:
        """
        Cancel a pending alert countdown.

        Args:
            alert_id: ID of the alert to cancel
            db: Database session

        Returns:
            True if alert was cancelled, False if not found or already triggered
        """
        # Cancel the countdown task if it exists
        if alert_id in self.pending_alerts:
            task = self.pending_alerts[alert_id]
            task.cancel()
            del self.pending_alerts[alert_id]

            # Update alert status in database
            alert = db.query(Alert).filter(Alert.id == alert_id).first()
            if alert:
                alert.status = AlertStatus.CANCELLED
                alert.cancelled_at = datetime.utcnow()
                db.commit()
                db.refresh(alert)

                logger.info(f"Alert {alert_id} cancelled by user")
                return True

        logger.warning(f"Alert {alert_id} not found in pending alerts")
        return False

    async def _countdown_and_trigger(
        self,
        alert_id: int
    ) -> None:
        """
        Internal method to handle countdown and trigger notifications.
        Creates its own database session to avoid stale session issues.

        Args:
            alert_id: ID of the alert
        """
        from database import SessionLocal

        try:
            # Wait for countdown period
            await asyncio.sleep(settings.alert_countdown_seconds)

            # Create fresh database session for the background task
            db = SessionLocal()
            try:
                # After countdown, trigger the alert
                await self._trigger_alert(alert_id, db)
            finally:
                db.close()

        except asyncio.CancelledError:
            logger.info(f"Countdown for alert {alert_id} was cancelled")
        except Exception as e:
            logger.error(f"Error in countdown for alert {alert_id}: {e}")
        finally:
            # Remove from pending alerts
            if alert_id in self.pending_alerts:
                del self.pending_alerts[alert_id]

    async def trigger_duress_alert(
        self,
        alert_id: int,
        db: Session = None
    ) -> None:
        """
        Trigger a DURESS alert with silent notifications.
        Sends SMS to all trusted contacts with live tracking link.

        DURESS alerts are special:
        - Frontend shows walk stopped (deceives attacker)
        - Backend continues monitoring in silent mode
        - Trusted contacts receive live tracking link
        - SMS includes warning not to call the user

        Args:
            alert_id: ID of the duress alert
            db: Database session (optional - creates its own if not provided)
        """
        # Create own database session for thread safety
        from database import SessionLocal
        own_session = db is None
        if own_session:
            db = SessionLocal()

        try:
            # Fetch alert from database
            alert = db.query(Alert).filter(Alert.id == alert_id).first()
            if not alert or not alert.is_duress:
                logger.error(f"Duress alert {alert_id} not found or not marked as duress")
                return

            # Fetch user
            user = db.query(User).filter(User.id == alert.user_id).first()
            if not user:
                logger.error(f"User {alert.user_id} not found for duress alert {alert_id}")
                return

            # Get all active trusted contacts (use new TrustedContact model)
            trusted_contacts = db.query(TrustedContact).filter(
                TrustedContact.user_id == user.id,
                TrustedContact.is_active == True
            ).order_by(TrustedContact.priority).all()

            if not trusted_contacts and not user.trusted_contacts:
                logger.warning(f"No trusted contacts found for user {user.id} - duress alert cannot be sent")
                return

            # Generate live tracking URL
            tracking_url = f"{settings.frontend_url}/track/{alert.live_tracking_token}"

            # Get current location from session
            session = db.query(WalkSession).filter(WalkSession.id == alert.session_id).first()
            location_text = "Location unknown"
            if alert.location_lat and alert.location_lng:
                location_text = f"https://www.google.com/maps?q={alert.location_lat},{alert.location_lng}"

            logger.critical(
                f"🚨 DURESS ALERT {alert_id} - User {user.name} may be in danger!"
            )

            # Send SMS to all trusted contacts (both new and legacy)
            contacts_notified = 0

            # Use new TrustedContact model if available
            if trusted_contacts:
                for contact in trusted_contacts:
                    message = f"""🚨 EMERGENCY - DURESS ALERT 🚨

{user.name} has triggered a silent emergency alert.
They may be in a coerced situation.

⚠️ DO NOT call them - they may be compromised.

Live Tracking: {tracking_url}

Last Known Location: {location_text}

This link shows their real-time location.
Consider contacting local authorities immediately.

- Protego Safety"""

                    # Try WhatsApp first (preferred for India)
                    result = twilio_service.send_whatsapp(
                        to=contact.phone,
                        message=message
                    )

                    if result.get("success"):
                        contacts_notified += 1
                        logger.info(f"Duress alert sent via WhatsApp to {contact.name} ({contact.phone})")
                    else:
                        # Fallback to SMS if WhatsApp fails
                        logger.warning(f"WhatsApp failed for {contact.name}, trying SMS fallback")
                        sms_result = twilio_service.send_sms(
                            to=contact.phone,
                            message=message
                        )
                        if sms_result.get("success"):
                            contacts_notified += 1
                            logger.info(f"Duress alert sent via SMS to {contact.name} ({contact.phone})")
                        else:
                            logger.error(f"Failed to send duress alert to {contact.name} ({contact.phone})")

            # Fallback to legacy trusted_contacts JSON field
            elif user.trusted_contacts:
                for contact_phone in user.trusted_contacts:
                    message = f"""🚨 EMERGENCY - DURESS ALERT 🚨

{user.name} has triggered a silent emergency alert.
They may be in a coerced situation.

⚠️ DO NOT call them - they may be compromised.

Live Tracking: {tracking_url}

Last Known Location: {location_text}

This link shows their real-time location.
Consider contacting local authorities immediately.

- Protego Safety"""

                    # Try WhatsApp first (preferred for India)
                    result = twilio_service.send_whatsapp(
                        to=contact_phone,
                        message=message
                    )

                    if result.get("success"):
                        contacts_notified += 1
                        logger.info(f"Duress alert sent via WhatsApp to legacy contact ({contact_phone})")
                    else:
                        # Fallback to SMS if WhatsApp fails
                        logger.warning(f"WhatsApp failed for legacy contact ({contact_phone}), trying SMS fallback")
                        sms_result = twilio_service.send_sms(
                            to=contact_phone,
                            message=message
                        )
                        if sms_result.get("success"):
                            contacts_notified += 1
                            logger.info(f"Duress alert sent via SMS to legacy contact ({contact_phone})")
                        else:
                            logger.error(f"Failed to send duress alert to legacy contact ({contact_phone})")

            # Send emergency voice calls to contacts (NOTE: For duress, inform them NOT to call the user)
            all_contact_phones = []
            if trusted_contacts:
                all_contact_phones = [c.phone for c in trusted_contacts]
            elif user.trusted_contacts:
                all_contact_phones = user.trusted_contacts

            if all_contact_phones and alert.location_lat and alert.location_lng:
                location_url = f"https://www.google.com/maps?q={alert.location_lat},{alert.location_lng}"
                logger.info(f"Sending duress emergency voice calls to {len(all_contact_phones)} contacts")

                try:
                    voice_call_result = await vonage_emergency_service.send_emergency_calls_to_contacts(
                        contact_phones=all_contact_phones,
                        user_name=user.name,
                        location_url=location_url
                    )
                    logger.info(
                        f"Duress voice calls sent: {voice_call_result['successful_calls']}/{voice_call_result['total_contacts']} successful"
                    )
                except Exception as e:
                    logger.error(f"Failed to send duress emergency voice calls: {e}")

            # Notify government authorities if alert has location
            authorities_notified = 0
            if alert.location_lat and alert.location_lng:
                logger.info(f"Duress alert has location: {alert.location_lat}, {alert.location_lng}. Checking for authorities...")
                authorities = get_authorities_in_radius(db, alert.location_lat, alert.location_lng)
                logger.info(f"Found {len(authorities)} authorities in range for duress alert {alert_id}")

                for authority in authorities:
                    logger.info(f"Notifying authority: {authority.name} at {authority.phone}")
                    message = f"""🚨 EMERGENCY - DURESS ALERT IN YOUR JURISDICTION 🚨

{user.name} has triggered a silent emergency alert within your area.

User Phone: {user.phone}
User Email: {user.email}

⚠️ DURESS SITUATION - They may be coerced or compromised.
DO NOT call the user directly.

Live Tracking: {tracking_url}

Location: {location_text}

Distance from {authority.name}: {calculate_distance(alert.location_lat, alert.location_lng, authority.latitude, authority.longitude):.0f}m

This is an automated alert from Protego Safety System.
Immediate response may be required.

- Protego Safety"""

                    # Try WhatsApp first
                    result = twilio_service.send_whatsapp(
                        to=authority.phone,
                        message=message
                    )

                    if result.get("success"):
                        authorities_notified += 1
                        logger.info(f"Duress alert sent via WhatsApp to authority {authority.name} ({authority.phone})")
                    else:
                        # Fallback to SMS if WhatsApp fails
                        logger.warning(f"WhatsApp failed for authority {authority.name}, trying SMS fallback")
                        sms_result = twilio_service.send_sms(
                            to=authority.phone,
                            message=message
                        )
                        if sms_result.get("success"):
                            authorities_notified += 1
                            logger.info(f"Duress alert sent via SMS to authority {authority.name} ({authority.phone})")
                        else:
                            logger.error(f"Failed to send duress alert to authority {authority.name} ({authority.phone})")

            # Update alert status
            alert.status = AlertStatus.TRIGGERED
            alert.triggered_at = datetime.utcnow()
            db.commit()
            db.refresh(alert)

            logger.critical(
                f"🚨 Duress alert {alert_id} sent to {contacts_notified} contacts "
                f"and {authorities_notified} government authorities. "
                f"Live tracking: {tracking_url}"
            )
        finally:
            if own_session:
                db.close()

    async def _trigger_alert(
        self,
        alert_id: int,
        db: Session
    ) -> None:
        """
        Trigger an alert by sending notifications to trusted contacts.

        Args:
            alert_id: ID of the alert to trigger
            db: Database session
        """
        # Fetch alert from database
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            logger.error(f"Alert {alert_id} not found in database")
            return

        # If this is a duress alert, use special duress handling
        if alert.is_duress:
            await self.trigger_duress_alert(alert_id, db)
            return

        # Fetch user and trusted contacts
        user = db.query(User).filter(User.id == alert.user_id).first()
        if not user:
            logger.error(f"User {alert.user_id} not found for alert {alert_id}")
            return

        # Prepare location data
        location = None
        if alert.location_lat and alert.location_lng:
            location = {
                "lat": alert.location_lat,
                "lng": alert.location_lng
            }

        logger.info(
            f"Triggering alert {alert_id} for user {user.name} (type: {alert.type})"
        )

        # Extract analysis details from proper database fields
        analysis_details = None

        # Send full AI analysis as-is, or fallback to transcription/keywords
        if alert.ai_analysis:
            analysis_details = alert.ai_analysis  # Send complete AI analysis
        elif alert.transcription:
            analysis_details = f"Heard: \"{alert.transcription}\""
        elif alert.keywords_detected:
            keywords = alert.keywords_detected if isinstance(alert.keywords_detected, list) else []
            if keywords:
                analysis_details = f"Keywords: {', '.join(keywords)}"

        # Send emergency alerts via Twilio (WhatsApp/SMS)
        notification_result = twilio_service.send_emergency_alerts(
            user_name=user.name,
            user_phone=user.phone,
            trusted_contacts=user.trusted_contacts,
            alert_type=alert.type.value,
            location=location,
            analysis_details=analysis_details
        )

        # Send emergency voice calls to trusted contacts via Vonage
        logger.info(f"[VOICE_CALL_CHECK] user.trusted_contacts={user.trusted_contacts}, location={location}")
        if user.trusted_contacts and len(user.trusted_contacts) > 0 and location:
            location_url = f"https://www.google.com/maps?q={location['lat']},{location['lng']}"
            logger.info(f"[VOICE_CALL] Sending emergency voice calls to {len(user.trusted_contacts)} contacts: {user.trusted_contacts}")

            try:
                voice_call_result = await vonage_emergency_service.send_emergency_calls_to_contacts(
                    contact_phones=user.trusted_contacts,
                    user_name=user.name,
                    location_url=location_url
                )
                logger.info(
                    f"[VOICE_CALL] Emergency voice calls sent: {voice_call_result['successful_calls']}/{voice_call_result['total_contacts']} successful"
                )
            except Exception as e:
                logger.error(f"[VOICE_CALL] Failed to send emergency voice calls: {e}", exc_info=True)
        else:
            logger.warning(f"[VOICE_CALL] Skipping voice calls - trusted_contacts: {user.trusted_contacts}, location: {location}")

        # Notify government authorities if alert has location
        authorities_notified = 0
        if alert.location_lat and alert.location_lng:
            logger.info(f"Alert has location: {alert.location_lat}, {alert.location_lng}. Checking for authorities...")
            authorities = get_authorities_in_radius(db, alert.location_lat, alert.location_lng)
            logger.info(f"Found {len(authorities)} authorities in range for alert {alert_id}")
            location_url = f"https://www.google.com/maps?q={alert.location_lat},{alert.location_lng}"

            for authority in authorities:
                logger.info(f"Notifying authority: {authority.name} at {authority.phone}")
                distance = calculate_distance(
                    alert.location_lat, alert.location_lng,
                    authority.latitude, authority.longitude
                )

                # Include analysis details for authorities too
                analysis_line = f"\n{analysis_details}\n" if analysis_details else ""

                message = f"""🚨 EMERGENCY ALERT IN YOUR JURISDICTION 🚨

{user.name} has triggered an emergency alert.
Alert Type: {alert.type.value}
Analysis: {analysis_line}
User Phone: {user.phone}
User Email: {user.email}

Location: {location_url}

Distance from {authority.name}: {distance:.0f}m

This is an automated alert from Protego Safety System.
Immediate response may be required.

- Protego Safety"""

                # Try WhatsApp first
                result = twilio_service.send_whatsapp(
                    to=authority.phone,
                    message=message
                )

                if result.get("success"):
                    authorities_notified += 1
                    logger.info(f"Alert sent via WhatsApp to authority {authority.name} ({authority.phone})")
                else:
                    # Fallback to SMS
                    logger.warning(f"WhatsApp failed for authority {authority.name}, trying SMS fallback")
                    sms_result = twilio_service.send_sms(
                        to=authority.phone,
                        message=message
                    )
                    if sms_result.get("success"):
                        authorities_notified += 1
                        logger.info(f"Alert sent via SMS to authority {authority.name} ({authority.phone})")
                    else:
                        logger.error(f"Failed to send alert to authority {authority.name} ({authority.phone})")

        # Update alert status
        alert.status = AlertStatus.TRIGGERED
        alert.triggered_at = datetime.utcnow()
        db.commit()
        db.refresh(alert)

        logger.info(
            f"Alert {alert_id} triggered successfully. "
            f"Notified {notification_result.get('contacts_notified', 0)} contacts "
            f"and {authorities_notified} government authorities."
        )

    def get_pending_alert_ids(self) -> list[int]:
        """
        Get list of all pending alert IDs currently in memory.

        Returns:
            List of alert IDs with active countdowns
        """
        return list(self.pending_alerts.keys())

    async def recover_pending_alerts(self) -> int:
        """
        Recover pending alerts from database after server restart.
        Re-schedules countdown tasks for alerts that haven't expired yet.
        Triggers expired alerts immediately.

        Returns:
            Number of alerts recovered
        """
        from database import SessionLocal

        db = SessionLocal()
        try:
            now = datetime.utcnow()

            # Find all alerts with pending countdown that haven't been triggered/cancelled
            pending_alerts = db.query(Alert).filter(
                Alert.status == AlertStatus.PENDING,
                Alert.countdown_expires_at.isnot(None),
                Alert.countdown_expires_at > now  # Not yet expired
            ).all()

            # Find expired alerts that should be triggered immediately
            expired_alerts = db.query(Alert).filter(
                Alert.status == AlertStatus.PENDING,
                Alert.countdown_expires_at.isnot(None),
                Alert.countdown_expires_at <= now  # Already expired
            ).all()

            recovery_count = 0

            # Re-schedule pending alerts
            for alert in pending_alerts:
                time_remaining = (alert.countdown_expires_at - now).total_seconds()
                if time_remaining > 0:
                    # Create countdown task with remaining time
                    task = asyncio.create_task(
                        self._countdown_with_remaining_time(alert.id, time_remaining)
                    )
                    self.pending_alerts[alert.id] = task
                    recovery_count += 1
                    logger.info(
                        f"Recovered alert {alert.id} with {time_remaining:.1f}s remaining"
                    )

            # Trigger expired alerts immediately
            for alert in expired_alerts:
                logger.info(f"Triggering expired alert {alert.id}")
                asyncio.create_task(self._trigger_alert(alert.id, db))
                recovery_count += 1

            logger.info(f"Recovered {recovery_count} alerts from database")
            return recovery_count

        finally:
            db.close()

    async def _countdown_with_remaining_time(
        self,
        alert_id: int,
        remaining_seconds: float
    ) -> None:
        """
        Countdown with custom remaining time (for recovery after restart).

        Args:
            alert_id: ID of the alert
            remaining_seconds: Seconds remaining until trigger
        """
        from database import SessionLocal

        try:
            await asyncio.sleep(remaining_seconds)

            db = SessionLocal()
            try:
                await self._trigger_alert(alert_id, db)
            finally:
                db.close()

        except asyncio.CancelledError:
            logger.info(f"Recovered countdown for alert {alert_id} was cancelled")
        except Exception as e:
            logger.error(f"Error in recovered countdown for alert {alert_id}: {e}")
        finally:
            if alert_id in self.pending_alerts:
                del self.pending_alerts[alert_id]


# Global alert manager instance
alert_manager = AlertManager()
