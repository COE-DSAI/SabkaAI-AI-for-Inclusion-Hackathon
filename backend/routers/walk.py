"""
Walk session management router.
Handles starting and stopping walk mode sessions.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import secrets

from database import get_db
from models import User, WalkSession, Alert, AlertType, AlertStatus, WalkMode
from schemas import WalkSessionStart, WalkSessionStop, WalkSessionResponse
from auth import get_current_user, verify_password
from services.geofencing_service import geofencing_service

router = APIRouter()


@router.post("/start", response_model=WalkSessionResponse, status_code=status.HTTP_201_CREATED)
def start_walk_session(
    session_data: WalkSessionStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a new walk mode session for the authenticated user.

    Args:
        session_data: Walk session start data
        current_user: Authenticated user
        db: Database session

    Returns:
        Created walk session object

    Raises:
        HTTPException: If user already has active session or authorization fails
    """
    # Verify user is starting session for themselves
    if session_data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot start walk session for another user"
        )

    # Check if user already has an active session
    active_session = db.query(WalkSession).filter(
        WalkSession.user_id == current_user.id,
        WalkSession.active == True
    ).first()

    if active_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an active walk session"
        )

    # Determine walk mode
    walk_mode = WalkMode(session_data.mode) if session_data.mode else WalkMode.MANUAL

    # Create new walk session
    new_session = WalkSession(
        user_id=current_user.id,
        location_lat=session_data.location_lat,
        location_lng=session_data.location_lng,
        mode=walk_mode,
        started_by_geofence=(walk_mode == WalkMode.AUTO_GEOFENCE),
        safe_location_id=session_data.safe_location_id,
        active=True
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # Send WhatsApp notification to trusted contacts
    auto_started = (walk_mode == WalkMode.AUTO_GEOFENCE)
    try:
        geofencing_service.notify_walk_started(
            user=current_user,
            walk_session=new_session,
            auto_started=auto_started,
            db=db
        )
    except Exception as e:
        # Log error but don't fail the request
        import logging
        logging.error(f"Failed to send walk started notification: {e}")

    return new_session


@router.post("/stop", response_model=WalkSessionResponse)
def stop_walk_session(
    session_data: WalkSessionStop,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Stop an active walk mode session for the authenticated user.

    **DURESS PASSWORD SUPPORT:**
    If a password is provided, checks both main and duress passwords:
    - Main password: Normal stop (walk actually ends)
    - Duress password: Silent mode (frontend shows stopped, backend continues monitoring)

    Args:
        session_data: Walk session stop data (includes optional password)
        current_user: Authenticated user
        db: Database session

    Returns:
        Updated walk session object

    Raises:
        HTTPException: If session not found, already stopped, or authorization fails
    """
    # Find the session
    session = db.query(WalkSession).filter(
        WalkSession.id == session_data.session_id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Walk session with ID {session_data.session_id} not found"
        )

    # Verify user owns this session
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot stop another user's walk session"
        )

    if not session.active and session.mode != WalkMode.SILENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Walk session is already stopped"
        )

    # Check if password is provided (for duress detection)
    is_duress = False
    is_silent_mode_stop = False

    if session_data.password:
        # If session is already in SILENT mode (duress active)
        # Only allow stopping with normal password (not duress again)
        if session.mode == WalkMode.SILENT:
            main_password_match = verify_password(session_data.password, current_user.password_hash)
            if not main_password_match:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid password"
                )
            is_silent_mode_stop = True
        else:
            # Normal flow: verify password matches either main or duress
            main_password_match = verify_password(session_data.password, current_user.password_hash)
            duress_password_match = (
                current_user.duress_password_hash and
                verify_password(session_data.password, current_user.duress_password_hash)
            )

            if not main_password_match and not duress_password_match:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid password"
                )

            # If duress password was used, enter silent mode
            is_duress = duress_password_match

    if is_silent_mode_stop:
        # STOPPING SILENT MODE SESSION - User is safe now
        # Actually stop the session
        session.active = False
        session.end_time = datetime.utcnow()
        session.end_latitude = session_data.location_lat
        session.end_longitude = session_data.location_lng

        db.commit()
        db.refresh(session)

        logger.info(f"Silent mode walk session {session.id} stopped by user {current_user.id}")

        return WalkSessionResponse(
            id=session.id,
            user_id=session.user_id,
            start_time=session.start_time,
            end_time=session.end_time,
            active=session.active,
            mode=session.mode.value,
            location_lat=session.location_lat,
            location_lng=session.location_lng
        )

    elif is_duress:
        # DURESS PASSWORD USED - Enter silent mode
        # Frontend will show walk stopped, but backend continues monitoring
        session.mode = WalkMode.SILENT
        session.end_time = None  # Keep session active
        session.active = True  # Keep monitoring active

        # Create silent DURESS alert with live tracking
        live_tracking_token = secrets.token_urlsafe(32)
        duress_alert = Alert(
            user_id=current_user.id,
            session_id=session.id,
            type=AlertType.DURESS,
            confidence=1.0,  # Duress is definitive
            status=AlertStatus.PENDING,  # Start as pending, will be triggered immediately
            is_duress=True,
            live_tracking_token=live_tracking_token,
            location_lat=session.location_lat,
            location_lng=session.location_lng
        )
        db.add(duress_alert)
        db.commit()  # Commit to get alert ID
        db.refresh(duress_alert)

        # Trigger immediate silent alert to trusted contacts (no countdown)
        from services.alert_manager import alert_manager
        import asyncio
        import threading

        # Run async function from sync context using threading
        # Don't pass db - trigger_duress_alert creates its own session for thread safety
        alert_id = duress_alert.id

        def run_duress_alert():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(alert_manager.trigger_duress_alert(alert_id))
            finally:
                loop.close()

        thread = threading.Thread(target=run_duress_alert, daemon=True)
        thread.start()

    else:
        # NORMAL STOP - Actually stop the walk
        session.active = False
        session.end_time = datetime.utcnow()
        session.end_latitude = session_data.location_lat
        session.end_longitude = session_data.location_lng
        # Keep mode as is (manual or auto_geofence)

        # Send WhatsApp notification to trusted contacts
        auto_stopped = (session.stopped_by_geofence if hasattr(session, 'stopped_by_geofence') else False)
        try:
            geofencing_service.notify_walk_stopped(
                user=current_user,
                walk_session=session,
                auto_stopped=auto_stopped,
                db=db
            )
        except Exception as e:
            # Log error but don't fail the request
            import logging
            logging.error(f"Failed to send walk stopped notification: {e}")

    db.commit()
    db.refresh(session)

    return session


@router.post("/force-stop", response_model=WalkSessionResponse)
def force_stop_active_session(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Force stop any active walk session for the user.
    This is useful for stopping SILENT mode sessions without knowing the session ID.

    Returns:
        The stopped session object

    Raises:
        HTTPException: If no active session found
    """
    # Find any active session for this user
    session = db.query(WalkSession).filter(
        WalkSession.user_id == current_user.id,
        WalkSession.active == True
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active walk session found"
        )

    # Force stop the session
    session.active = False
    session.end_time = datetime.utcnow()

    db.commit()
    db.refresh(session)

    logger.info(f"Force stopped walk session {session.id} for user {current_user.id}")

    return WalkSessionResponse(
        id=session.id,
        user_id=session.user_id,
        start_time=session.start_time,
        end_time=session.end_time,
        active=session.active,
        mode=session.mode.value,
        location_lat=session.location_lat,
        location_lng=session.location_lng
    )


@router.get("/{session_id}", response_model=WalkSessionResponse)
def get_walk_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get walk session by ID for the authenticated user.

    Args:
        session_id: Walk session ID
        current_user: Authenticated user
        db: Database session

    Returns:
        Walk session object

    Raises:
        HTTPException: If session not found or authorization fails
    """
    session = db.query(WalkSession).filter(WalkSession.id == session_id).first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Walk session with ID {session_id} not found"
        )

    # Verify user owns this session
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another user's walk session"
        )

    return session


@router.get("/user/{user_id}", response_model=List[WalkSessionResponse])
def get_user_walk_sessions(
    user_id: int,
    active_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all walk sessions for the authenticated user.

    Args:
        user_id: User ID (must match authenticated user)
        active_only: If True, only return active sessions
        current_user: Authenticated user
        db: Database session

    Returns:
        List of walk sessions

    Raises:
        HTTPException: If authorization fails
    """
    # Verify user is requesting their own sessions
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another user's walk sessions"
        )

    # Query sessions
    query = db.query(WalkSession).filter(WalkSession.user_id == current_user.id)

    if active_only:
        query = query.filter(WalkSession.active == True)

    sessions = query.order_by(WalkSession.start_time.desc()).all()

    return sessions


@router.get("/user/{user_id}/active", response_model=WalkSessionResponse)
def get_active_walk_session(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the active walk session for the authenticated user.

    Args:
        user_id: User ID (must match authenticated user)
        current_user: Authenticated user
        db: Database session

    Returns:
        Active walk session object

    Raises:
        HTTPException: If authorization fails or no active session
    """
    # Verify user is requesting their own active session
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another user's walk session"
        )

    # Find active session
    active_session = db.query(WalkSession).filter(
        WalkSession.user_id == current_user.id,
        WalkSession.active == True
    ).first()

    if not active_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active walk session for user {current_user.id}"
        )

    return active_session
