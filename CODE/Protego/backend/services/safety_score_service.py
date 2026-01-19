"""
Safety Score Calculation Service for Protego.
Calculates user safety score based on location history, alerts, and patterns.
"""

import logging
from datetime import timezone, datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from models import User, WalkSession, Alert, SafeLocation, AlertStatus

logger = logging.getLogger(__name__)

# Indian Standard Time (IST) timezone - UTC+5:30
ist_timezone = timezone(timedelta(hours=5, minutes=30))


class SafetyScoreService:
    """
    Service for calculating comprehensive safety scores based on:
    - Current location and time
    - Historical walk sessions
    - Alert patterns
    - Safe location proximity
    - Time-based risk factors
    """

    async def calculate_safety_score(
        self,
        user: User,
        latitude: Optional[float],
        longitude: Optional[float],
        db: Session
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive safety score for a user.

        Args:
            user: User object
            latitude: Current latitude (None if location is off)
            longitude: Current longitude (None if location is off)
            db: Database session

        Returns:
            Safety score analysis with score, status, and factors
        """
        # If location is not available, return prompt message
        if latitude is None or longitude is None:
            return {
                "location_available": False,
                "safety_score": None,
                "status": "unknown",
                "message": "Please enable location access to calculate your safety score",
                "prompt": "Share your location to get personalized safety insights"
            }

        # Calculate score components
        time_score = self._calculate_time_score()
        history_score = self._calculate_history_score(user.id, db)
        location_score = self._calculate_location_score(user.id, latitude, longitude, db)
        alert_score = self._calculate_alert_score(user.id, db)

        # Get AI-based location history analysis
        ai_location_analysis = await self._get_ai_location_analysis(latitude, longitude, user.id, db)

        # Weighted average of components
        # Time: 25%, History: 15%, Location: 25%, Alerts: 15%, AI Analysis: 20%
        final_score = int(
            (time_score * 0.25) +
            (history_score * 0.15) +
            (location_score * 0.25) +
            (alert_score * 0.15) +
            (ai_location_analysis.get("ai_score", 75) * 0.20)
        )

        # Clamp between 0-100
        final_score = max(0, min(100, final_score))

        # Determine status
        if final_score >= 75:
            status = "safe"
            status_message = "Area is safe"
        elif final_score >= 50:
            status = "caution"
            status_message = "Stay alert"
        else:
            status = "alert"
            status_message = "High risk detected"

        # Collect factors
        factors = []
        factors.extend(self._get_time_factors())
        factors.extend(self._get_history_factors(user.id, db))
        factors.extend(self._get_location_factors(user.id, latitude, longitude, db))
        factors.extend(self._get_alert_factors(user.id, db))

        # Add AI-analyzed factors
        if ai_location_analysis.get("factors"):
            factors.extend(ai_location_analysis["factors"])

        return {
            "location_available": True,
            "safety_score": final_score,
            "status": status,
            "status_message": status_message,
            "components": {
                "time_score": time_score,
                "history_score": history_score,
                "location_score": location_score,
                "alert_score": alert_score,
                "ai_score": ai_location_analysis.get("ai_score", 75)
            },
            "factors": factors[:5] if factors else ["No significant risk factors detected"],
            "recommendations": self._get_recommendations(final_score),
            "ai_analysis": ai_location_analysis.get("analysis", ""),
            "analyzed_at": datetime.now().isoformat()
        }

    def _calculate_time_score(self) -> int:
        """Calculate safety score based on current time (using server's local time)."""
        now = datetime.now(ist_timezone)  # Use IST instead of local time
        hour = now.hour

        # Base score
        score = 85

        # Time-based adjustments
        if hour < 5 or hour > 23:  # Late night (11pm-5am)
            score = 40
        elif hour < 6 or hour > 21:  # Night (9pm-6am)
            score = 60
        elif hour >= 6 and hour < 9:  # Morning (6am-9am)
            score = 90
        elif hour >= 17 and hour < 19:  # Evening rush (5pm-7pm)
            score = 80
        elif hour >= 9 and hour < 17:  # Daytime (9am-5pm)
            score = 95

        # Weekend late night adjustment
        day_of_week = now.strftime("%A")
        if day_of_week in ["Friday", "Saturday"] and (hour > 22 or hour < 3):
            score -= 5  # Weekend nights can be riskier

        return score

    def _calculate_history_score(self, user_id: int, db: Session) -> int:
        """Calculate score based on user's walk history."""
        # Get last 30 days of walk sessions
        thirty_days_ago = datetime.now(ist_timezone) - timedelta(days=30)

        # Count total sessions
        total_sessions = db.query(WalkSession).filter(
            WalkSession.user_id == user_id,
            WalkSession.start_time >= thirty_days_ago
        ).count()

        # Count sessions with alerts
        sessions_with_alerts = db.query(WalkSession).filter(
            WalkSession.user_id == user_id,
            WalkSession.start_time >= thirty_days_ago,
            WalkSession.alerts.any()
        ).count()

        # If no history, return neutral score
        if total_sessions == 0:
            return 75

        # Calculate alert rate
        alert_rate = sessions_with_alerts / total_sessions if total_sessions > 0 else 0

        # Score based on alert rate
        if alert_rate == 0:
            score = 95  # Perfect history
        elif alert_rate < 0.1:
            score = 85  # Very good
        elif alert_rate < 0.25:
            score = 75  # Good
        elif alert_rate < 0.5:
            score = 60  # Moderate risk
        else:
            score = 40  # High risk history

        # Bonus for consistent safe walks
        if total_sessions > 20 and alert_rate < 0.1:
            score = min(100, score + 5)

        return score

    def _calculate_location_score(
        self,
        user_id: int,
        latitude: float,
        longitude: float,
        db: Session
    ) -> int:
        """Calculate score based on location proximity to safe zones."""
        from math import radians, sin, cos, sqrt, atan2

        def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            """Calculate distance between two points in meters."""
            R = 6371000  # Earth's radius in meters
            lat1_rad, lon1_rad = radians(lat1), radians(lon1)
            lat2_rad, lon2_rad = radians(lat2), radians(lon2)
            dlat = lat2_rad - lat1_rad
            dlon = lon2_rad - lon1_rad
            a = sin(dlat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            return R * c

        # Get user's safe locations
        safe_locations = db.query(SafeLocation).filter(
            SafeLocation.user_id == user_id,
            SafeLocation.is_active == True
        ).all()

        if not safe_locations:
            # No safe locations defined, return neutral score
            return 70

        # Find nearest safe location
        min_distance = float('inf')
        for safe_loc in safe_locations:
            distance = haversine_distance(
                latitude, longitude,
                safe_loc.latitude, safe_loc.longitude
            )
            min_distance = min(min_distance, distance)

        # Score based on distance to nearest safe location
        if min_distance <= 100:  # Within 100m of safe location
            score = 95
        elif min_distance <= 200:  # Within 200m
            score = 90
        elif min_distance <= 500:  # Within 500m
            score = 85
        elif min_distance <= 1000:  # Within 1km
            score = 75
        elif min_distance <= 2000:  # Within 2km
            score = 65
        elif min_distance <= 5000:  # Within 5km
            score = 55
        else:  # Far from safe locations
            score = 45

        return score

    def _calculate_alert_score(self, user_id: int, db: Session) -> int:
        """Calculate score based on recent alert patterns."""
        # Get alerts from last 7 days
        seven_days_ago = datetime.now(ist_timezone) - timedelta(days=7)

        # Count total alerts
        total_alerts = db.query(Alert).filter(
            Alert.user_id == user_id,
            Alert.created_at >= seven_days_ago
        ).count()

        # Count high-confidence alerts
        high_confidence_alerts = db.query(Alert).filter(
            Alert.user_id == user_id,
            Alert.created_at >= seven_days_ago,
            Alert.confidence >= 0.8
        ).count()

        # Count triggered alerts
        triggered_alerts = db.query(Alert).filter(
            Alert.user_id == user_id,
            Alert.created_at >= seven_days_ago,
            Alert.status == AlertStatus.TRIGGERED
        ).count()

        # Score based on alert patterns
        if total_alerts == 0:
            score = 95  # No recent alerts
        elif triggered_alerts == 0 and total_alerts <= 3:
            score = 85  # Few alerts, none triggered
        elif triggered_alerts == 0 and total_alerts <= 10:
            score = 75  # Some alerts, but none serious
        elif triggered_alerts <= 2:
            score = 60  # Few triggered alerts
        elif triggered_alerts <= 5:
            score = 45  # Multiple triggered alerts
        else:
            score = 30  # Many triggered alerts

        # Penalty for high-confidence alerts
        if high_confidence_alerts > 0:
            score -= (high_confidence_alerts * 5)

        return max(20, score)

    def _get_time_factors(self) -> list:
        """Get risk factors based on current time."""
        now = datetime.now(ist_timezone)
        hour = now.hour
        factors = []

        if hour < 5 or hour > 23:
            factors.append("Late night hours - very low visibility and minimal activity")
        elif hour < 6 or hour > 21:
            factors.append("Night time - reduced visibility, stay on well-lit paths")
        elif hour >= 6 and hour < 9:
            factors.append("Morning hours - good visibility, moderate activity")

        day_of_week = now.strftime("%A")
        if day_of_week in ["Friday", "Saturday"] and (hour > 22 or hour < 3):
            factors.append("Weekend late night - increased activity, stay alert")

        return factors

    def _get_history_factors(self, user_id: int, db: Session) -> list:
        """Get factors based on walk history."""
        thirty_days_ago = datetime.now(ist_timezone) - timedelta(days=30)

        total_sessions = db.query(WalkSession).filter(
            WalkSession.user_id == user_id,
            WalkSession.start_time >= thirty_days_ago
        ).count()

        sessions_with_alerts = db.query(WalkSession).filter(
            WalkSession.user_id == user_id,
            WalkSession.start_time >= thirty_days_ago,
            WalkSession.alerts.any()
        ).count()

        factors = []

        if total_sessions == 0:
            factors.append("No recent walk history - starting fresh")
        elif sessions_with_alerts == 0:
            factors.append(f"{total_sessions} recent safe walks - great track record!")
        else:
            alert_rate = sessions_with_alerts / total_sessions
            if alert_rate > 0.3:
                factors.append(f"Multiple alerts in recent walks - extra caution recommended")

        return factors

    def _get_location_factors(
        self,
        user_id: int,
        latitude: float,
        longitude: float,
        db: Session
    ) -> list:
        """Get factors based on location."""
        from math import radians, sin, cos, sqrt, atan2

        def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            R = 6371000
            lat1_rad, lon1_rad = radians(lat1), radians(lon1)
            lat2_rad, lon2_rad = radians(lat2), radians(lon2)
            dlat = lat2_rad - lat1_rad
            dlon = lon2_rad - lon1_rad
            a = sin(dlat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            return R * c

        safe_locations = db.query(SafeLocation).filter(
            SafeLocation.user_id == user_id,
            SafeLocation.is_active == True
        ).all()

        factors = []

        if not safe_locations:
            factors.append("No safe locations configured yet")
            return factors

        # Find nearest safe location
        min_distance = float('inf')
        nearest_location = None
        for safe_loc in safe_locations:
            distance = haversine_distance(
                latitude, longitude,
                safe_loc.latitude, safe_loc.longitude
            )
            if distance < min_distance:
                min_distance = distance
                nearest_location = safe_loc

        if min_distance <= 200:
            factors.append(f"Near {nearest_location.name} - safe zone")
        elif min_distance <= 1000:
            factors.append(f"Within 1km of {nearest_location.name}")
        else:
            factors.append(f"Far from safe locations - {min_distance/1000:.1f}km from nearest")

        return factors

    def _get_alert_factors(self, user_id: int, db: Session) -> list:
        """Get factors based on recent alerts."""
        seven_days_ago = datetime.now(ist_timezone) - timedelta(days=7)

        triggered_alerts = db.query(Alert).filter(
            Alert.user_id == user_id,
            Alert.created_at >= seven_days_ago,
            Alert.status == AlertStatus.TRIGGERED
        ).count()

        factors = []

        if triggered_alerts == 0:
            factors.append("No recent emergency alerts")
        elif triggered_alerts <= 2:
            factors.append(f"{triggered_alerts} alert(s) in past week - be cautious")
        else:
            factors.append(f"{triggered_alerts} alerts recently - consider reviewing your routes")

        return factors

    def _get_recommendations(self, score: int) -> list:
        """Get recommendations based on safety score."""
        if score >= 85:
            return [
                "You're in a safe area! Enjoy your walk.",
                "Keep your phone accessible just in case.",
                "Share your location with trusted contacts."
            ]
        elif score >= 70:
            return [
                "Stay aware of your surroundings.",
                "Keep to well-lit, populated areas.",
                "Have your phone charged and ready.",
                "Share your live location with contacts."
            ]
        elif score >= 50:
            return [
                "Exercise extra caution in this area.",
                "Stay on main streets with good lighting.",
                "Consider walking with someone.",
                "Keep emergency contacts accessible.",
                "Enable walk mode for monitoring."
            ]
        else:
            return [
                "High risk detected - consider alternative routes.",
                "Enable walk mode immediately for monitoring.",
                "Share live location with all trusted contacts.",
                "Keep emergency services ready to call.",
                "Stay on main, well-populated streets.",
                "Consider waiting or using transportation."
            ]

    async def _get_ai_location_analysis(
        self,
        latitude: float,
        longitude: float,
        user_id: int,
        db: Session
    ) -> Dict[str, Any]:
        """
        Use AI to analyze location's historical safety data.
        This includes crime statistics, past incidents in the area, and contextual analysis.
        """
        from services.ai_service import ai_service

        # Get past alerts for this general area (within 1km radius)
        from math import radians, sin, cos, sqrt, atan2

        def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            R = 6371000  # Earth radius in meters
            lat1_rad, lon1_rad = radians(lat1), radians(lon1)
            lat2_rad, lon2_rad = radians(lat2), radians(lon2)
            dlat = lat2_rad - lat1_rad
            dlon = lon2_rad - lon1_rad
            a = sin(dlat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            return R * c

        # Get all past walk sessions from this user
        past_sessions = db.query(WalkSession).filter(
            WalkSession.user_id == user_id
        ).all()

        # Find sessions near this location (within 1km)
        nearby_sessions = []
        for session in past_sessions:
            if session.location_lat and session.location_lng:
                distance = haversine_distance(
                    latitude, longitude,
                    session.location_lat, session.location_lng
                )
                if distance <= 1000:  # Within 1km
                    nearby_sessions.append(session)

        # Get alerts from nearby sessions
        nearby_alerts = []
        for session in nearby_sessions:
            alerts = db.query(Alert).filter(
                Alert.session_id == session.id
            ).all()
            for alert in alerts:
                nearby_alerts.append({
                    "type": alert.type.value,
                    "confidence": alert.confidence,
                    "status": alert.status.value,
                    "created_at": alert.created_at.isoformat()
                })

        # Build context for AI analysis
        context = {
            "latitude": latitude,
            "longitude": longitude,
            "nearby_sessions_count": len(nearby_sessions),
            "nearby_alerts_count": len(nearby_alerts),
            "nearby_alerts": nearby_alerts[:10],  # Send max 10 recent alerts
            "time": datetime.now(ist_timezone).isoformat()
        }

        try:
            # Use AI service to analyze location
            result = await ai_service.analyze_location_safety(
                latitude=latitude,
                longitude=longitude,
                timestamp=context["time"],
                user_context=f"Historical data: {len(nearby_sessions)} past walks in this area with {len(nearby_alerts)} alerts"
            )

            # Extract AI score from the analysis
            ai_score = result.get("safety_score", 75)
            factors = result.get("factors", [])

            # Add historical context to factors
            if len(nearby_alerts) > 5:
                factors.append(f"Area has {len(nearby_alerts)} past alerts - exercise caution")
            elif len(nearby_alerts) > 0:
                factors.append(f"{len(nearby_alerts)} past alert(s) in this area")
            else:
                factors.append("No past alerts recorded in this area")

            return {
                "ai_score": ai_score,
                "factors": factors[:3],  # Limit to top 3 AI factors
                "analysis": result.get("factors", ["AI analysis unavailable"])[0] if result.get("factors") else "Location analyzed",
                "analyzed_at": datetime.now(ist_timezone).isoformat()
            }

        except Exception as e:
            logger.error(f"AI location analysis failed: {e}")
            # Fallback to basic analysis
            if len(nearby_alerts) > 10:
                ai_score = 45
                factors = [f"High alert history in area - {len(nearby_alerts)} past alerts"]
            elif len(nearby_alerts) > 5:
                ai_score = 60
                factors = [f"Moderate alert history - {len(nearby_alerts)} past alerts"]
            elif len(nearby_alerts) > 0:
                ai_score = 75
                factors = [f"{len(nearby_alerts)} past alert(s) in this area"]
            else:
                ai_score = 85
                factors = ["No past alerts in this area"]

            return {
                "ai_score": ai_score,
                "factors": factors,
                "analysis": "Historical analysis based on past data",
                "analyzed_at": datetime.now(ist_timezone).isoformat()
            }


# Global service instance
safety_score_service = SafetyScoreService()
