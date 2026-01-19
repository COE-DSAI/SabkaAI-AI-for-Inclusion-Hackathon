"""
Alert management router.
Handles alert creation, cancellation, and retrieval.
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import List
from slowapi import Limiter
from slowapi.util import get_remote_address

from database import get_db
from models import Alert, User, AlertStatus
from schemas import AlertCreate, AlertCancel, AlertResponse, PaginatedAlertsResponse, PaginationMeta
import math
from services.alert_manager import alert_manager
from config import settings
from auth import get_current_user

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
# @limiter.limit("100/hour")  # 100 alerts per hour per IP - TEMPORARILY DISABLED
async def create_alert(
    request: Request,
    alert_data: AlertCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new alert from anomaly detection for the authenticated user.
    If confidence >= threshold, starts countdown timer.
    Rate limited to 100 alerts per hour per IP address.

    Args:
        request: FastAPI request object
        alert_data: Alert creation data
        background_tasks: FastAPI background tasks
        current_user: Authenticated user
        db: Database session

    Returns:
        Created alert object

    Raises:
        HTTPException: If authorization fails
    """
    # Verify user is creating alert for themselves
    if alert_data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create alert for another user"
        )

    # Create new alert
    new_alert = Alert(
        user_id=alert_data.user_id,
        session_id=alert_data.session_id,
        type=alert_data.type,
        confidence=alert_data.confidence,
        status=AlertStatus.PENDING,
        location_lat=alert_data.location_lat,
        location_lng=alert_data.location_lng,
        snapshot_url=alert_data.snapshot_url
    )

    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    # Check if confidence meets threshold
    if alert_data.confidence >= settings.alert_confidence_threshold:
        # Start countdown in background
        # Note: Pass only alert_id, not db session (will create fresh session)
        background_tasks.add_task(
            alert_manager.start_alert_countdown,
            new_alert.id
        )

    return new_alert


@router.post("/cancel", status_code=status.HTTP_200_OK)
async def cancel_alert(
    cancel_data: AlertCancel,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel a pending alert countdown for the authenticated user.

    Args:
        cancel_data: Alert cancellation data
        current_user: Authenticated user
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If alert not found, cannot be cancelled, or authorization fails
    """
    # Verify alert exists
    alert = db.query(Alert).filter(Alert.id == cancel_data.alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {cancel_data.alert_id} not found"
        )

    # Verify user owns this alert
    if alert.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot cancel another user's alert"
        )

    # Check if alert is in cancellable state
    if alert.status != AlertStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Alert cannot be cancelled (current status: {alert.status})"
        )

    # Cancel the alert
    success = await alert_manager.cancel_alert(cancel_data.alert_id, db)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to cancel alert (countdown may have already completed)"
        )

    return {
        "success": True,
        "message": f"Alert {cancel_data.alert_id} cancelled successfully"
    }


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get alert by ID for the authenticated user.

    Args:
        alert_id: Alert ID
        current_user: Authenticated user
        db: Database session

    Returns:
        Alert object

    Raises:
        HTTPException: If alert not found or authorization fails
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID {alert_id} not found"
        )

    # Verify user owns this alert
    if alert.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another user's alert"
        )

    return alert


@router.get("/user/{user_id}", response_model=PaginatedAlertsResponse)
def get_user_alerts(
    user_id: int,
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get paginated alerts for the authenticated user.

    Args:
        user_id: User ID (must match authenticated user)
        page: Page number (starts at 1)
        page_size: Number of items per page (max 100)
        current_user: Authenticated user
        db: Database session

    Returns:
        Paginated list of alerts with metadata

    Raises:
        HTTPException: If authorization fails
    """
    # Verify user is requesting their own alerts
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another user's alerts"
        )

    # Validate pagination parameters
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20
    if page_size > 100:
        page_size = 100

    # Get total count
    total_items = db.query(Alert).filter(Alert.user_id == current_user.id).count()
    total_pages = math.ceil(total_items / page_size) if total_items > 0 else 0

    # Calculate offset
    offset = (page - 1) * page_size

    # Query alerts with pagination
    alerts = db.query(Alert).filter(
        Alert.user_id == current_user.id
    ).order_by(
        Alert.created_at.desc()
    ).offset(offset).limit(page_size).all()

    # Build pagination metadata
    meta = PaginationMeta(
        page=page,
        page_size=page_size,
        total_items=total_items,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )

    return PaginatedAlertsResponse(items=alerts, meta=meta)


@router.get("/session/{session_id}", response_model=List[AlertResponse])
def get_session_alerts(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all alerts for a walk session owned by the authenticated user.

    Args:
        session_id: Walk session ID
        current_user: Authenticated user
        db: Database session

    Returns:
        List of alerts

    Raises:
        HTTPException: If authorization fails
    """
    # First verify the session belongs to the user
    from models import WalkSession
    session = db.query(WalkSession).filter(WalkSession.id == session_id).first()
    if session and session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another user's session alerts"
        )

    alerts = db.query(Alert).filter(
        Alert.session_id == session_id,
        Alert.user_id == current_user.id  # Extra safety check
    ).order_by(
        Alert.created_at.desc()
    ).all()

    return alerts


@router.get("/pending/list", response_model=List[int])
def get_pending_alerts(current_user: User = Depends(get_current_user)):
    """
    Get list of alert IDs with active countdowns for the authenticated user.
    Note: This currently returns all pending alerts from memory, which is a security issue.
    Should be filtered by user_id.

    Args:
        current_user: Authenticated user

    Returns:
        List of pending alert IDs
    """
    # TODO: Filter by current_user.id when alert_manager is refactored to persist to DB
    return alert_manager.get_pending_alert_ids()


@router.post("/instant", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
# @limiter.limit("50/hour")  # 50 instant alerts per hour per IP - TEMPORARILY DISABLED
async def create_instant_alert(
    request: Request,
    alert_data: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create an instant emergency alert that triggers immediately without countdown for the authenticated user.
    Used for voice-activated emergencies where user says "help me".
    Rate limited to 50 instant alerts per hour per IP address.

    Args:
        request: FastAPI request object
        alert_data: Alert creation data
        current_user: Authenticated user
        db: Database session

    Returns:
        Created and triggered alert object

    Raises:
        HTTPException: If authorization fails or notification fails
    """
    # Verify user is creating alert for themselves
    if alert_data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create instant alert for another user"
        )

    # Create new alert with AI analysis fields
    new_alert = Alert(
        user_id=alert_data.user_id,
        session_id=alert_data.session_id,
        type=alert_data.type,
        confidence=alert_data.confidence,
        status=AlertStatus.PENDING,
        location_lat=alert_data.location_lat,
        location_lng=alert_data.location_lng,
        transcription=alert_data.transcription,
        ai_analysis=alert_data.ai_analysis,
        keywords_detected=alert_data.keywords_detected,
        snapshot_url=alert_data.snapshot_url
    )

    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    # Trigger immediately without countdown
    # Create a fresh session to ensure we get latest user data
    from database import SessionLocal
    trigger_db = SessionLocal()
    try:
        await alert_manager._trigger_alert(new_alert.id, trigger_db)
    finally:
        trigger_db.close()

    return new_alert
