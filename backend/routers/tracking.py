"""
Live Tracking Router for Protego.
Public endpoint for real-time location tracking during duress alerts.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from database import get_db
from models import Alert, WalkSession, User, WalkMode
from auth import get_current_user, verify_password
from services.geofencing_service import geofencing_service

router = APIRouter()


# ==================== Response Schemas ====================

class LiveTrackingResponse(BaseModel):
    """Response for live tracking."""
    status: str  # "active", "session_ended", "invalid"
    user_name: Optional[str] = None
    alert_created_at: Optional[str] = None
    alert_type: Optional[str] = None
    current_location: Optional[dict] = None
    session_start_time: Optional[str] = None
    last_updated: Optional[str] = None
    message: Optional[str] = None


# ==================== Endpoints ====================

@router.get("/track/{token}", response_model=LiveTrackingResponse)
async def get_live_tracking(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Public endpoint for live tracking (NO AUTHENTICATION REQUIRED).

    Returns real-time location for duress alerts using a secure token.
    This endpoint is accessible to trusted contacts who receive the tracking link.

    **Security:**
    - Token is 32-byte random (256-bit security)
    - Only works for duress alerts (is_duress=True)
    - Token becomes invalid when session ends

    **Use Case:**
    When a user enters their duress password, trusted contacts receive an SMS
    with a tracking link. This endpoint provides them with real-time location
    updates without requiring authentication.

    Args:
        token: Live tracking token (from alert.live_tracking_token)
        db: Database session

    Returns:
        Real-time tracking information or error status
    """
    # Find alert by tracking token
    alert = db.query(Alert).filter(
        Alert.live_tracking_token == token,
        Alert.is_duress == True  # Only duress alerts have live tracking
    ).first()

    if not alert:
        return LiveTrackingResponse(
            status="invalid",
            message="Invalid tracking link or alert not found"
        )

    # Get associated session
    session = db.query(WalkSession).filter(
        WalkSession.id == alert.session_id
    ).first()

    if not session:
        return LiveTrackingResponse(
            status="invalid",
            message="Session not found"
        )

    # Check if session is still active in silent mode
    if not session.active or session.mode != WalkMode.SILENT:
        return LiveTrackingResponse(
            status="session_ended",
            message="Tracking has ended - user is safe or session was stopped",
            alert_created_at=alert.created_at.isoformat() if alert.created_at else None,
            session_start_time=session.start_time.isoformat() if session.start_time else None
        )

    # Get user info (limited - only name for identification)
    user = db.query(User).filter(User.id == alert.user_id).first()
    if not user:
        return LiveTrackingResponse(
            status="invalid",
            message="User not found"
        )

    # Return live tracking data
    current_location = None
    if session.location_lat and session.location_lng:
        current_location = {
            "latitude": session.location_lat,
            "longitude": session.location_lng,
            "google_maps_url": f"https://www.google.com/maps?q={session.location_lat},{session.location_lng}"
        }

    return LiveTrackingResponse(
        status="active",
        user_name=user.name,
        alert_created_at=alert.created_at.isoformat() if alert.created_at else None,
        alert_type=alert.type.value,
        current_location=current_location,
        session_start_time=session.start_time.isoformat() if session.start_time else None,
        last_updated=datetime.utcnow().isoformat(),
        message=f"{user.name} is in a duress situation. Location is being tracked."
    )


@router.get("/track/{token}/history")
async def get_tracking_history(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Get location history for a duress alert.

    **TODO:** In future, this could return historical location data
    if location updates are being stored throughout the session.

    Args:
        token: Live tracking token
        db: Database session

    Returns:
        Location history (not yet implemented)
    """
    # Verify token is valid
    alert = db.query(Alert).filter(
        Alert.live_tracking_token == token,
        Alert.is_duress == True
    ).first()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid tracking link"
        )

    return {
        "message": "Location history not yet implemented",
        "alert_id": alert.id,
        "current_location": {
            "latitude": alert.location_lat,
            "longitude": alert.location_lng
        } if alert.location_lat and alert.location_lng else None
    }


class StopSilentModeRequest(BaseModel):
    """Request to stop silent mode tracking."""
    password: str


@router.post("/track/{token}/stop")
async def stop_silent_mode(
    token: str,
    request: StopSilentModeRequest,
    db: Session = Depends(get_db)
):
    """
    Stop silent mode tracking (password-protected).

    This endpoint allows trusted contacts to stop the silent mode session
    by providing the user's password. This is useful when the emergency
    has been resolved or authorities have been contacted.

    **Security:**
    - Requires user's main password (not duress password)
    - Only works for active silent mode sessions
    - Public endpoint (no auth token required, uses tracking token)

    Args:
        token: Live tracking token
        request: Request containing password
        db: Database session

    Returns:
        Success message if session stopped
    """
    # Find alert by tracking token
    alert = db.query(Alert).filter(
        Alert.live_tracking_token == token,
        Alert.is_duress == True
    ).first()

    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid tracking link"
        )

    # Get user
    user = db.query(User).filter(User.id == alert.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Verify password matches user's main password (NOT duress password)
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )

    # Get associated session
    session = db.query(WalkSession).filter(
        WalkSession.id == alert.session_id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Check if session is still active in silent mode
    if not session.active or session.mode != WalkMode.SILENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session is not in silent mode or already stopped"
        )

    # Stop the session
    session.active = False
    session.end_time = datetime.utcnow()
    db.commit()
    db.refresh(session)

    import logging
    logger = logging.getLogger(__name__)
    logger.info(
        f"Silent mode session {session.id} stopped by trusted contact "
        f"using tracking token (user: {user.name})"
    )

    return {
        "success": True,
        "message": "Silent mode tracking stopped successfully",
        "session_id": session.id
    }


# ==================== Location Update Endpoint ====================

class LocationUpdateRequest(BaseModel):
    """Request to update user location and check geofencing."""
    latitude: float
    longitude: float


class LocationUpdateResponse(BaseModel):
    """Response for location update."""
    success: bool
    inside_safe_location: bool
    safe_location_name: Optional[str] = None
    notification_sent: bool = False
    action_taken: Optional[str] = None
    message: Optional[str] = None


@router.post("/update-location", response_model=LocationUpdateResponse)
async def update_location(
    request: LocationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user's current location and check geofencing status.

    This endpoint should be called periodically by the frontend to:
    1. Check if user is inside/outside safe locations
    2. Send WhatsApp notifications to trusted contacts when entering/leaving safe zones
    3. Determine if walk mode should auto-start/stop

    Args:
        request: Location update data (lat/lng)
        current_user: Authenticated user
        db: Database session

    Returns:
        Geofence status and notification results
    """
    try:
        # Check location and send notifications if needed
        result = geofencing_service.check_location_and_notify(
            user=current_user,
            latitude=request.latitude,
            longitude=request.longitude,
            db=db
        )

        return LocationUpdateResponse(
            success=True,
            inside_safe_location=result.get("inside_safe_location", False),
            safe_location_name=result.get("safe_location_name"),
            notification_sent=result.get("notification_sent", False),
            action_taken=result.get("action_taken"),
            message=result.get("message", "Location updated successfully")
        )
    except Exception as e:
        import logging
        logging.error(f"Error updating location: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update location: {str(e)}"
        )
