"""
Government router for government agent and super admin features.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from pydantic import BaseModel, Field

from database import get_db
from models import User, Alert, GovAuthority, AlertStatus, UserType, IncidentReport, IncidentStatus
from auth import get_current_user
from services.alert_manager import calculate_distance
from services.pdf_report_service import pdf_report_service

router = APIRouter()


class CreateAuthorityRequest(BaseModel):
    """Schema for creating a government authority."""
    name: str = Field(..., description="User's full name")
    email: str = Field(..., description="User's email (for login)")
    password: str = Field(..., min_length=8, description="User's password")
    authority_name: str = Field(..., description="Authority/department name")
    latitude: float = Field(..., description="Jurisdiction center latitude")
    longitude: float = Field(..., description="Jurisdiction center longitude")
    radius_meters: int = Field(..., gt=0, description="Jurisdiction radius in meters")
    phone: str = Field(..., description="Contact phone number")
    department: Optional[str] = Field(None, description="Department type (Police, Fire, Medical, etc.)")
    notes: Optional[str] = Field(None, description="Optional notes")


def require_govt_agent(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to require government agent access.

    Args:
        current_user: Current authenticated user

    Returns:
        User if they are a government agent

    Raises:
        HTTPException: If user is not a government agent
    """
    if current_user.user_type != UserType.GOVT_AGENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Government agent privileges required."
        )
    return current_user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to require super admin access.

    Args:
        current_user: Current authenticated user

    Returns:
        User if they are a super admin

    Raises:
        HTTPException: If user is not a super admin
    """
    if current_user.user_type != UserType.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Super admin privileges required."
        )
    return current_user


@router.get("/alerts")
def get_jurisdiction_alerts(
    current_user: User = Depends(require_govt_agent),
    db: Session = Depends(get_db)
):
    """
    Get all alerts within this government agent's jurisdiction.

    Args:
        current_user: Current authenticated government agent
        db: Database session

    Returns:
        List of alerts in jurisdiction with user details
    """
    # Get this agent's authority record
    authority = db.query(GovAuthority).filter(
        GovAuthority.user_id == current_user.id,
        GovAuthority.is_active == True
    ).first()

    if not authority:
        return {
            "alerts": [],
            "message": "No active authority jurisdiction configured"
        }

    # Get all alerts with location
    all_alerts = db.query(Alert).filter(
        Alert.location_lat.isnot(None),
        Alert.location_lng.isnot(None)
    ).order_by(Alert.created_at.desc()).all()

    # Filter alerts within jurisdiction radius
    jurisdiction_alerts = []
    for alert in all_alerts:
        distance = calculate_distance(
            alert.location_lat, alert.location_lng,
            authority.latitude, authority.longitude
        )

        if distance <= authority.radius_meters:
            # Get user details
            user = db.query(User).filter(User.id == alert.user_id).first()

            jurisdiction_alerts.append({
                "id": alert.id,
                "user_id": alert.user_id,
                "user_name": user.name if user else "Unknown",
                "user_phone": user.phone if user else "Unknown",
                "user_email": user.email if user else "Unknown",
                "type": alert.type.value,
                "status": alert.status.value,
                "location_lat": alert.location_lat,
                "location_lng": alert.location_lng,
                "created_at": alert.created_at.isoformat(),
                "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else None,
                "confidence": alert.confidence,
                "is_duress": alert.is_duress,
                "distance_from_center": round(distance, 2)
            })

    return {
        "alerts": jurisdiction_alerts,
        "authority": {
            "name": authority.name,
            "department": authority.department,
            "latitude": authority.latitude,
            "longitude": authority.longitude,
            "radius_meters": authority.radius_meters
        }
    }


@router.get("/authority/profile")
def get_authority_profile(
    current_user: User = Depends(require_govt_agent),
    db: Session = Depends(get_db)
):
    """
    Get the current government agent's authority profile.

    Args:
        current_user: Current authenticated government agent
        db: Database session

    Returns:
        Authority profile information
    """
    authority = db.query(GovAuthority).filter(
        GovAuthority.user_id == current_user.id
    ).first()

    if not authority:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authority profile not found"
        )

    return {
        "id": authority.id,
        "name": authority.name,
        "latitude": authority.latitude,
        "longitude": authority.longitude,
        "radius_meters": authority.radius_meters,
        "phone": authority.phone,
        "email": authority.email,
        "department": authority.department,
        "is_active": authority.is_active,
        "notes": authority.notes,
        "created_at": authority.created_at.isoformat()
    }


@router.get("/incidents")
def get_jurisdiction_incidents(
    current_user: User = Depends(require_govt_agent),
    db: Session = Depends(get_db)
):
    """
    Get all incident reports assigned to this government agent's authority.

    Args:
        current_user: Current authenticated government agent
        db: Database session

    Returns:
        List of incident reports assigned to this authority
    """
    # Get this agent's authority record
    authority = db.query(GovAuthority).filter(
        GovAuthority.user_id == current_user.id,
        GovAuthority.is_active == True
    ).first()

    if not authority:
        return {
            "incidents": [],
            "message": "No active authority jurisdiction configured"
        }

    # Get all incidents assigned to this authority
    incidents = db.query(IncidentReport).filter(
        IncidentReport.assigned_authority_id == authority.id
    ).order_by(IncidentReport.created_at.desc()).all()

    result = []
    for incident in incidents:
        # Get reporter details
        reporter = db.query(User).filter(User.id == incident.user_id).first()

        result.append({
            "id": incident.id,
            "user_id": incident.user_id,
            "reporter_name": "Anonymous" if incident.is_anonymous else (reporter.name if reporter else "Unknown"),
            "reporter_phone": "Hidden" if incident.is_anonymous else (reporter.phone if reporter else "Unknown"),
            "reporter_email": "Hidden" if incident.is_anonymous else (reporter.email if reporter else "Unknown"),
            "incident_type": incident.incident_type.value,
            "status": incident.status.value,
            "title": incident.title,
            "description": incident.description,
            "location_lat": incident.location_lat,
            "location_lng": incident.location_lng,
            "location_address": incident.location_address,
            "media_files": incident.media_files or [],
            "witness_name": incident.witness_name,
            "witness_phone": incident.witness_phone,
            "is_anonymous": incident.is_anonymous,
            "authority_notes": incident.authority_notes,
            "created_at": incident.created_at.isoformat(),
            "updated_at": incident.updated_at.isoformat() if incident.updated_at else None
        })

    return {
        "incidents": result,
        "authority": {
            "name": authority.name,
            "department": authority.department
        }
    }


# ==================== Super Admin Routes ====================

@router.get("/admin/incidents")
def list_all_incidents(
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    List all incident reports (super admin only).

    Args:
        current_user: Current authenticated super admin
        db: Database session

    Returns:
        List of all incident reports
    """
    incidents = db.query(IncidentReport).order_by(IncidentReport.created_at.desc()).all()

    result = []
    for incident in incidents:
        reporter = db.query(User).filter(User.id == incident.user_id).first()
        authority = None
        if incident.assigned_authority_id:
            authority = db.query(GovAuthority).filter(
                GovAuthority.id == incident.assigned_authority_id
            ).first()

        result.append({
            "id": incident.id,
            "user_id": incident.user_id,
            "reporter_name": "Anonymous" if incident.is_anonymous else (reporter.name if reporter else "Unknown"),
            "reporter_phone": "Hidden" if incident.is_anonymous else (reporter.phone if reporter else "Unknown"),
            "reporter_email": "Hidden" if incident.is_anonymous else (reporter.email if reporter else "Unknown"),
            "incident_type": incident.incident_type.value,
            "status": incident.status.value,
            "title": incident.title,
            "description": incident.description,
            "location_lat": incident.location_lat,
            "location_lng": incident.location_lng,
            "location_address": incident.location_address,
            "media_files": incident.media_files or [],
            "witness_name": incident.witness_name,
            "witness_phone": incident.witness_phone,
            "is_anonymous": incident.is_anonymous,
            "assigned_authority_id": incident.assigned_authority_id,
            "assigned_authority_name": authority.name if authority else None,
            "authority_notes": incident.authority_notes,
            "created_at": incident.created_at.isoformat(),
            "updated_at": incident.updated_at.isoformat() if incident.updated_at else None
        })

    return {"incidents": result}


@router.get("/admin/authorities")
def list_all_authorities(
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    List all government authorities (super admin only).

    Args:
        current_user: Current authenticated super admin
        db: Database session

    Returns:
        List of all authorities
    """
    authorities = db.query(GovAuthority).order_by(GovAuthority.created_at.desc()).all()

    result = []
    for authority in authorities:
        user = db.query(User).filter(User.id == authority.user_id).first()
        result.append({
            "id": authority.id,
            "user_id": authority.user_id,
            "user_email": user.email if user else "Unknown",
            "user_name": user.name if user else "Unknown",
            "name": authority.name,
            "latitude": authority.latitude,
            "longitude": authority.longitude,
            "radius_meters": authority.radius_meters,
            "phone": authority.phone,
            "email": authority.email,
            "department": authority.department,
            "is_active": authority.is_active,
            "notes": authority.notes,
            "created_at": authority.created_at.isoformat()
        })

    return {"authorities": result}


@router.post("/admin/authorities")
def create_authority(
    data: CreateAuthorityRequest,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new government authority and associated user account (super admin only).

    Args:
        data: Authority creation data
        current_user: Current authenticated super admin
        db: Database session

    Returns:
        Created authority and user info
    """
    from auth import get_password_hash

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if phone number already exists
    existing_phone = db.query(User).filter(User.phone == data.phone).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )

    try:
        # Create government agent user account
        new_user = User(
            name=data.name,
            email=data.email,
            phone=data.phone,  # Use authority phone as user phone
            password_hash=get_password_hash(data.password),
            user_type=UserType.GOVT_AGENT
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except IntegrityError as e:
        db.rollback()
        # Handle any other integrity errors
        if "phone" in str(e.orig):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )
        elif "email" in str(e.orig):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create authority: Duplicate data"
            )

    # Create authority record
    try:
        new_authority = GovAuthority(
            user_id=new_user.id,
            name=data.authority_name,
            latitude=data.latitude,
            longitude=data.longitude,
            radius_meters=data.radius_meters,
            phone=data.phone,
            email=data.email,
            department=data.department,
            notes=data.notes,
            is_active=True
        )

        db.add(new_authority)
        db.commit()
        db.refresh(new_authority)
    except IntegrityError as e:
        db.rollback()
        # If authority creation fails, clean up the user we just created
        db.delete(new_user)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create authority record"
        )

    return {
        "message": "Government authority created successfully",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email,
            "user_type": new_user.user_type.value
        },
        "authority": {
            "id": new_authority.id,
            "name": new_authority.name,
            "latitude": new_authority.latitude,
            "longitude": new_authority.longitude,
            "radius_meters": new_authority.radius_meters,
            "department": new_authority.department
        }
    }


@router.put("/admin/authorities/{authority_id}")
def update_authority(
    authority_id: int,
    authority_name: str = None,
    latitude: float = None,
    longitude: float = None,
    radius_meters: int = None,
    phone: str = None,
    email: str = None,
    department: str = None,
    is_active: bool = None,
    notes: str = None,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Update a government authority (super admin only).

    Args:
        authority_id: Authority ID to update
        (optional fields to update)
        current_user: Current authenticated super admin
        db: Database session

    Returns:
        Updated authority info
    """
    authority = db.query(GovAuthority).filter(GovAuthority.id == authority_id).first()

    if not authority:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authority not found"
        )

    # Update fields if provided
    if authority_name is not None:
        authority.name = authority_name
    if latitude is not None:
        authority.latitude = latitude
    if longitude is not None:
        authority.longitude = longitude
    if radius_meters is not None:
        authority.radius_meters = radius_meters
    if phone is not None:
        authority.phone = phone
    if email is not None:
        authority.email = email
    if department is not None:
        authority.department = department
    if is_active is not None:
        authority.is_active = is_active
    if notes is not None:
        authority.notes = notes

    db.commit()
    db.refresh(authority)

    return {
        "message": "Authority updated successfully",
        "authority": {
            "id": authority.id,
            "name": authority.name,
            "latitude": authority.latitude,
            "longitude": authority.longitude,
            "radius_meters": authority.radius_meters,
            "phone": authority.phone,
            "email": authority.email,
            "department": authority.department,
            "is_active": authority.is_active
        }
    }


@router.delete("/admin/authorities/{authority_id}")
def delete_authority(
    authority_id: int,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a government authority and associated user (super admin only).

    Args:
        authority_id: Authority ID to delete
        current_user: Current authenticated super admin
        db: Database session

    Returns:
        Success message
    """
    authority = db.query(GovAuthority).filter(GovAuthority.id == authority_id).first()

    if not authority:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authority not found"
        )

    # Delete associated user
    user = db.query(User).filter(User.id == authority.user_id).first()
    if user:
        db.delete(user)

    # Delete authority (cascade will handle this if user is deleted)
    db.delete(authority)
    db.commit()

    return {"message": "Authority deleted successfully"}


@router.get("/nearby-jurisdictions")
def get_nearby_jurisdictions(
    latitude: float,
    longitude: float,
    radius_km: float = 10.0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all government jurisdictions near the given location.
    Also returns user's safe locations.

    Args:
        latitude: Current latitude
        longitude: Current longitude
        radius_km: Search radius in kilometers (default 10km)
        current_user: Current authenticated user
        db: Database session

    Returns:
        Dict with nearby jurisdictions and user's safe locations
    """
    from models import SafeLocation

    # Get all active authorities
    authorities = db.query(GovAuthority).filter(
        GovAuthority.is_active == True
    ).all()

    # Filter authorities within radius
    nearby_authorities = []
    for authority in authorities:
        distance = calculate_distance(
            latitude, longitude,
            authority.latitude, authority.longitude
        )
        distance_km = distance / 1000  # Convert to km

        if distance_km <= radius_km:
            nearby_authorities.append({
                "id": authority.id,
                "name": authority.name,
                "latitude": authority.latitude,
                "longitude": authority.longitude,
                "radius_meters": authority.radius_meters,
                "phone": authority.phone,
                "email": authority.email,
                "department": authority.department,
                "distance_km": round(distance_km, 2),
                "is_within_jurisdiction": distance <= authority.radius_meters
            })

    # Get user's safe locations
    safe_locations = db.query(SafeLocation).filter(
        SafeLocation.user_id == current_user.id,
        SafeLocation.is_active == True
    ).all()

    safe_locations_data = []
    for location in safe_locations:
        distance = calculate_distance(
            latitude, longitude,
            location.latitude, location.longitude
        )
        distance_km = distance / 1000

        safe_locations_data.append({
            "id": location.id,
            "name": location.name,
            "latitude": location.latitude,
            "longitude": location.longitude,
            "radius_meters": location.radius_meters,
            "auto_start_walk": location.auto_start_walk,
            "auto_stop_walk": location.auto_stop_walk,
            "notes": location.notes,
            "distance_km": round(distance_km, 2),
            "is_inside": distance <= location.radius_meters
        })

    return {
        "jurisdictions": nearby_authorities,
        "safe_locations": safe_locations_data,
        "user_location": {
            "latitude": latitude,
            "longitude": longitude
        }
    }


@router.get("/stats")
def get_agent_statistics(
    days: int = 30,
    current_user: User = Depends(require_govt_agent),
    db: Session = Depends(get_db)
):
    """
    Get statistics for the current government agent.

    Args:
        days: Number of days to get statistics for (default 30)
        current_user: Current government agent
        db: Database session

    Returns:
        Statistics including alert counts, response times, etc.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import func, case

    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    # Get authority info
    authority = db.query(GovAuthority).filter(
        GovAuthority.user_id == current_user.id
    ).first()

    if not authority:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authority not found"
        )

    # Get all alerts in jurisdiction
    alerts_in_jurisdiction = db.query(Alert).filter(
        Alert.created_at >= start_date,
        Alert.created_at <= end_date
    ).all()

    # Filter alerts by distance
    alerts_in_range = []
    for alert in alerts_in_jurisdiction:
        if alert.location_lat and alert.location_lng:
            distance = calculate_distance(
                authority.latitude, authority.longitude,
                alert.location_lat, alert.location_lng
            )
            if distance <= authority.radius_meters:
                alerts_in_range.append(alert)

    # Calculate statistics
    total_alerts = len(alerts_in_range)
    active_alerts = len([a for a in alerts_in_range if a.status == AlertStatus.TRIGGERED])
    resolved_alerts = len([a for a in alerts_in_range if a.status == AlertStatus.SAFE])
    false_alarms = len([a for a in alerts_in_range if a.status == AlertStatus.CANCELLED])

    # Count by type
    sos_alerts = len([a for a in alerts_in_range if a.type == "sos"])
    voice_alerts = len([a for a in alerts_in_range if a.type == "voice_trigger"])
    ai_alerts = len([a for a in alerts_in_range if a.type == "ai_analysis"])

    # Daily breakdown
    daily_stats = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).date()
        daily_stats[str(date)] = {
            "total": 0,
            "active": 0,
            "resolved": 0
        }

    for alert in alerts_in_range:
        date_key = str(alert.created_at.date())
        if date_key in daily_stats:
            daily_stats[date_key]["total"] += 1
            if alert.status == AlertStatus.TRIGGERED:
                daily_stats[date_key]["active"] += 1
            elif alert.status == AlertStatus.SAFE:
                daily_stats[date_key]["resolved"] += 1

    # Get incident reports in jurisdiction
    incidents = db.query(IncidentReport).filter(
        IncidentReport.created_at >= start_date,
        IncidentReport.created_at <= end_date
    ).all()

    incidents_in_range = []
    for incident in incidents:
        distance = calculate_distance(
            authority.latitude, authority.longitude,
            incident.location_lat, incident.location_lng
        )
        if distance <= authority.radius_meters:
            incidents_in_range.append(incident)

    total_incidents = len(incidents_in_range)
    submitted_incidents = len([i for i in incidents_in_range if i.status == IncidentStatus.SUBMITTED])
    reviewing_incidents = len([i for i in incidents_in_range if i.status == IncidentStatus.REVIEWING])
    resolved_incidents = len([i for i in incidents_in_range if i.status == IncidentStatus.RESOLVED])

    # Count by incident type
    theft_incidents = len([i for i in incidents_in_range if i.incident_type.value == "THEFT"])
    assault_incidents = len([i for i in incidents_in_range if i.incident_type.value == "ASSAULT"])
    harassment_incidents = len([i for i in incidents_in_range if i.incident_type.value == "HARASSMENT"])
    accident_incidents = len([i for i in incidents_in_range if i.incident_type.value == "ACCIDENT"])
    suspicious_incidents = len([i for i in incidents_in_range if i.incident_type.value == "SUSPICIOUS_ACTIVITY"])
    vandalism_incidents = len([i for i in incidents_in_range if i.incident_type.value == "VANDALISM"])
    medical_incidents = len([i for i in incidents_in_range if i.incident_type.value == "MEDICAL_EMERGENCY"])
    fire_incidents = len([i for i in incidents_in_range if i.incident_type.value == "FIRE"])
    other_incidents = len([i for i in incidents_in_range if i.incident_type.value == "OTHER"])

    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": days
        },
        "authority": {
            "name": authority.name,
            "department": authority.department,
            "jurisdiction_radius_km": round(authority.radius_meters / 1000, 2)
        },
        "alerts": {
            "total": total_alerts,
            "active": active_alerts,
            "resolved": resolved_alerts,
            "false_alarms": false_alarms,
            "by_type": {
                "sos": sos_alerts,
                "voice_trigger": voice_alerts,
                "ai_analysis": ai_alerts
            },
            "daily": daily_stats
        },
        "incidents": {
            "total": total_incidents,
            "submitted": submitted_incidents,
            "reviewing": reviewing_incidents,
            "resolved": resolved_incidents,
            "by_type": {
                "theft": theft_incidents,
                "assault": assault_incidents,
                "harassment": harassment_incidents,
                "accident": accident_incidents,
                "suspicious_activity": suspicious_incidents,
                "vandalism": vandalism_incidents,
                "medical_emergency": medical_incidents,
                "fire": fire_incidents,
                "other": other_incidents
            }
        }
    }



@router.get("/admin/agent-stats/{agent_id}")
def get_agent_stats_by_id(
    agent_id: int,
    days: int = 30,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Get statistics for a specific agent (super admin only).

    Args:
        agent_id: Authority ID
        days: Number of days to get statistics for
        current_user: Current super admin
        db: Database session

    Returns:
        Statistics for the specified agent
    """
    from datetime import datetime, timedelta

    # Get authority
    authority = db.query(GovAuthority).filter(GovAuthority.id == agent_id).first()

    if not authority:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authority not found"
        )

    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    # Get all alerts in jurisdiction
    alerts_in_jurisdiction = db.query(Alert).filter(
        Alert.created_at >= start_date,
        Alert.created_at <= end_date
    ).all()

    # Filter alerts by distance
    alerts_in_range = []
    for alert in alerts_in_jurisdiction:
        if alert.location_lat and alert.location_lng:
            distance = calculate_distance(
                authority.latitude, authority.longitude,
                alert.location_lat, alert.location_lng
            )
            if distance <= authority.radius_meters:
                alerts_in_range.append(alert)

    # Calculate statistics  
    total_alerts = len(alerts_in_range)
    active_alerts = len([a for a in alerts_in_range if a.status == AlertStatus.TRIGGERED])
    resolved_alerts = len([a for a in alerts_in_range if a.status == AlertStatus.SAFE])
    false_alarms = len([a for a in alerts_in_range if a.status == AlertStatus.CANCELLED])

    # Count by type
    sos_alerts = len([a for a in alerts_in_range if a.type == "sos"])
    voice_alerts = len([a for a in alerts_in_range if a.type == "voice_trigger"])
    ai_alerts = len([a for a in alerts_in_range if a.type == "ai_analysis"])

    # Daily breakdown
    daily_stats = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).date()
        daily_stats[str(date)] = {
            "total": 0,
            "active": 0,
            "resolved": 0
        }

    for alert in alerts_in_range:
        date_key = str(alert.created_at.date())
        if date_key in daily_stats:
            daily_stats[date_key]["total"] += 1
            if alert.status == AlertStatus.TRIGGERED:
                daily_stats[date_key]["active"] += 1
            elif alert.status == AlertStatus.SAFE:
                daily_stats[date_key]["resolved"] += 1

    # Get incident reports
    incidents = db.query(IncidentReport).filter(
        IncidentReport.created_at >= start_date,
        IncidentReport.created_at <= end_date
    ).all()

    incidents_in_range = []
    for incident in incidents:
        distance = calculate_distance(
            authority.latitude, authority.longitude,
            incident.location_lat, incident.location_lng
        )
        if distance <= authority.radius_meters:
            incidents_in_range.append(incident)

    total_incidents = len(incidents_in_range)
    submitted_incidents = len([i for i in incidents_in_range if i.status == IncidentStatus.SUBMITTED])
    reviewing_incidents = len([i for i in incidents_in_range if i.status == IncidentStatus.REVIEWING])
    resolved_incidents = len([i for i in incidents_in_range if i.status == IncidentStatus.RESOLVED])

    # Count by incident type
    theft_incidents = len([i for i in incidents_in_range if i.incident_type.value == "THEFT"])
    assault_incidents = len([i for i in incidents_in_range if i.incident_type.value == "ASSAULT"])
    harassment_incidents = len([i for i in incidents_in_range if i.incident_type.value == "HARASSMENT"])
    accident_incidents = len([i for i in incidents_in_range if i.incident_type.value == "ACCIDENT"])
    suspicious_incidents = len([i for i in incidents_in_range if i.incident_type.value == "SUSPICIOUS_ACTIVITY"])
    vandalism_incidents = len([i for i in incidents_in_range if i.incident_type.value == "VANDALISM"])
    medical_incidents = len([i for i in incidents_in_range if i.incident_type.value == "MEDICAL_EMERGENCY"])
    fire_incidents = len([i for i in incidents_in_range if i.incident_type.value == "FIRE"])
    other_incidents = len([i for i in incidents_in_range if i.incident_type.value == "OTHER"])

    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": days
        },
        "authority": {
            "id": authority.id,
            "name": authority.name,
            "department": authority.department,
            "user_email": authority.user.email if authority.user else None,
            "user_name": authority.user.name if authority.user else None,
            "jurisdiction_radius_km": round(authority.radius_meters / 1000, 2)
        },
        "alerts": {
            "total": total_alerts,
            "active": active_alerts,
            "resolved": resolved_alerts,
            "false_alarms": false_alarms,
            "by_type": {
                "sos": sos_alerts,
                "voice_trigger": voice_alerts,
                "ai_analysis": ai_alerts
            },
            "daily": daily_stats
        },
        "incidents": {
            "total": total_incidents,
            "submitted": submitted_incidents,
            "reviewing": reviewing_incidents,
            "resolved": resolved_incidents,
            "by_type": {
                "theft": theft_incidents,
                "assault": assault_incidents,
                "harassment": harassment_incidents,
                "accident": accident_incidents,
                "suspicious_activity": suspicious_incidents,
                "vandalism": vandalism_incidents,
                "medical_emergency": medical_incidents,
                "fire": fire_incidents,
                "other": other_incidents
            }
        },
        "alerts_list": [
            {
                "id": alert.id,
                "user_name": alert.user.name,
                "type": alert.type,
                "status": alert.status.value,
                "created_at": alert.created_at.isoformat(),
                "location_lat": alert.location_lat,
                "location_lng": alert.location_lng
            }
            for alert in alerts_in_range[:50]  # Limit to 50 most recent
        ]
    }


@router.get("/admin/overall-stats")
def get_overall_statistics(
    days: int = 30,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """
    Get overall statistics for all agents (super admin only).

    Args:
        days: Number of days to get statistics for
        current_user: Current super admin
        db: Database session

    Returns:
        Aggregated statistics for all agents
    """
    from datetime import datetime, timedelta

    # Get all active authorities
    authorities = db.query(GovAuthority).filter(GovAuthority.is_active == True).all()

    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    # Overall stats
    total_authorities = len(authorities)
    total_alerts = 0
    total_active = 0
    total_resolved = 0
    total_false_alarms = 0
    total_sos = 0
    total_voice = 0
    total_ai = 0
    total_incidents = 0
    total_submitted_incidents = 0
    total_reviewing_incidents = 0
    total_resolved_incidents = 0
    total_theft = 0
    total_assault = 0
    total_harassment = 0
    total_accident = 0
    total_suspicious = 0
    total_vandalism = 0
    total_medical = 0
    total_fire = 0
    total_other = 0

    # Per-agent stats
    agent_stats = []

    for authority in authorities:
        # Get alerts for this authority
        alerts_in_jurisdiction = db.query(Alert).filter(
            Alert.created_at >= start_date,
            Alert.created_at <= end_date
        ).all()

        alerts_in_range = []
        for alert in alerts_in_jurisdiction:
            if alert.location_lat and alert.location_lng:
                distance = calculate_distance(
                    authority.latitude, authority.longitude,
                    alert.location_lat, alert.location_lng
                )
                if distance <= authority.radius_meters:
                    alerts_in_range.append(alert)

        # Count alerts
        agent_total = len(alerts_in_range)
        agent_active = len([a for a in alerts_in_range if a.status == AlertStatus.TRIGGERED])
        agent_resolved = len([a for a in alerts_in_range if a.status == AlertStatus.SAFE])
        agent_false = len([a for a in alerts_in_range if a.status == AlertStatus.CANCELLED])
        agent_sos = len([a for a in alerts_in_range if a.type == "sos"])
        agent_voice = len([a for a in alerts_in_range if a.type == "voice_trigger"])
        agent_ai = len([a for a in alerts_in_range if a.type == "ai_analysis"])

        # Get incidents
        incidents = db.query(IncidentReport).filter(
            IncidentReport.created_at >= start_date,
            IncidentReport.created_at <= end_date
        ).all()

        incidents_in_range = []
        for incident in incidents:
            distance = calculate_distance(
                authority.latitude, authority.longitude,
                incident.location_lat, incident.location_lng
            )
            if distance <= authority.radius_meters:
                incidents_in_range.append(incident)

        agent_incidents = len(incidents_in_range)
        agent_submitted = len([i for i in incidents_in_range if i.status == IncidentStatus.SUBMITTED])
        agent_reviewing = len([i for i in incidents_in_range if i.status == IncidentStatus.REVIEWING])
        agent_resolved_inc = len([i for i in incidents_in_range if i.status == IncidentStatus.RESOLVED])

        # Count incident types for this agent
        agent_theft = len([i for i in incidents_in_range if i.incident_type.value == "THEFT"])
        agent_assault = len([i for i in incidents_in_range if i.incident_type.value == "ASSAULT"])
        agent_harassment = len([i for i in incidents_in_range if i.incident_type.value == "HARASSMENT"])
        agent_accident = len([i for i in incidents_in_range if i.incident_type.value == "ACCIDENT"])
        agent_suspicious = len([i for i in incidents_in_range if i.incident_type.value == "SUSPICIOUS_ACTIVITY"])
        agent_vandalism = len([i for i in incidents_in_range if i.incident_type.value == "VANDALISM"])
        agent_medical = len([i for i in incidents_in_range if i.incident_type.value == "MEDICAL_EMERGENCY"])
        agent_fire = len([i for i in incidents_in_range if i.incident_type.value == "FIRE"])
        agent_other = len([i for i in incidents_in_range if i.incident_type.value == "OTHER"])

        # Add to totals
        total_alerts += agent_total
        total_active += agent_active
        total_resolved += agent_resolved
        total_false_alarms += agent_false
        total_sos += agent_sos
        total_voice += agent_voice
        total_ai += agent_ai
        total_incidents += agent_incidents
        total_submitted_incidents += agent_submitted
        total_reviewing_incidents += agent_reviewing
        total_theft += agent_theft
        total_assault += agent_assault
        total_harassment += agent_harassment
        total_accident += agent_accident
        total_suspicious += agent_suspicious
        total_vandalism += agent_vandalism
        total_medical += agent_medical
        total_fire += agent_fire
        total_other += agent_other
        total_resolved_incidents += agent_resolved_inc

        # Add agent stats
        agent_stats.append({
            "id": authority.id,
            "name": authority.name,
            "department": authority.department,
            "user_name": authority.user.name if authority.user else None,
            "alerts": {
                "total": agent_total,
                "active": agent_active,
                "resolved": agent_resolved,
                "false_alarms": agent_false
            },
            "incidents": {
                "total": agent_incidents,
                "submitted": agent_submitted,
                "reviewing": agent_reviewing,
                "resolved": agent_resolved_inc
            }
        })

    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": days
        },
        "summary": {
            "total_agents": total_authorities,
            "total_alerts": total_alerts,
            "active_alerts": total_active,
            "resolved_alerts": total_resolved,
            "false_alarms": total_false_alarms,
            "by_type": {
                "sos": total_sos,
                "voice_trigger": total_voice,
                "ai_analysis": total_ai
            },
            "total_incidents": total_incidents,
            "submitted_incidents": total_submitted_incidents,
            "reviewing_incidents": total_reviewing_incidents,
            "resolved_incidents": total_resolved_incidents,
            "incidents_by_type": {
                "theft": total_theft,
                "assault": total_assault,
                "harassment": total_harassment,
                "accident": total_accident,
                "suspicious_activity": total_suspicious,
                "vandalism": total_vandalism,
                "medical_emergency": total_medical,
                "fire": total_fire,
                "other": total_other
            }
        },
        "agents": agent_stats
    }



@router.get("/stats/download-pdf")
async def download_agent_report_pdf(
    days: int = 30,
    current_user: User = Depends(require_govt_agent),
    db: Session = Depends(get_db)
):
    """Download PDF report for the current government agent with AI insights."""
    from datetime import datetime, timedelta

    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    # Get authority info
    authority = db.query(GovAuthority).filter(
        GovAuthority.user_id == current_user.id
    ).first()

    # Get stats (same logic as /stats endpoint)
    alerts_in_jurisdiction = db.query(Alert).filter(
        Alert.created_at >= start_date,
        Alert.created_at <= end_date
    ).all()

    alerts_in_range = []
    for alert in alerts_in_jurisdiction:
        if alert.location_lat and alert.location_lng:
            distance = calculate_distance(
                authority.latitude, authority.longitude,
                alert.location_lat, alert.location_lng
            )
            if distance <= authority.radius_meters:
                alerts_in_range.append(alert)

    # Calculate statistics
    total_alerts = len(alerts_in_range)
    active_alerts = len([a for a in alerts_in_range if a.status == AlertStatus.TRIGGERED])
    resolved_alerts = len([a for a in alerts_in_range if a.status == AlertStatus.SAFE])
    false_alarms = len([a for a in alerts_in_range if a.status == AlertStatus.CANCELLED])

    sos_alerts = len([a for a in alerts_in_range if a.type == "sos"])
    voice_alerts = len([a for a in alerts_in_range if a.type == "voice_trigger"])
    ai_alerts = len([a for a in alerts_in_range if a.type == "ai_analysis"])

    # Daily breakdown
    daily_stats = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).date()
        daily_stats[str(date)] = {
            "total": 0,
            "active": 0,
            "resolved": 0
        }

    for alert in alerts_in_range:
        date_key = str(alert.created_at.date())
        if date_key in daily_stats:
            daily_stats[date_key]["total"] += 1
            if alert.status == AlertStatus.TRIGGERED:
                daily_stats[date_key]["active"] += 1
            elif alert.status == AlertStatus.SAFE:
                daily_stats[date_key]["resolved"] += 1

    # Get incidents
    incidents_in_jurisdiction = db.query(IncidentReport).filter(
        IncidentReport.created_at >= start_date,
        IncidentReport.created_at <= end_date
    ).all()

    incidents_in_range = []
    for incident in incidents_in_jurisdiction:
        if incident.location_lat and incident.location_lng:
            distance = calculate_distance(
                authority.latitude, authority.longitude,
                incident.location_lat, incident.location_lng
            )
            if distance <= authority.radius_meters:
                incidents_in_range.append(incident)

    total_incidents = len(incidents_in_range)
    submitted_incidents = len([i for i in incidents_in_range if i.status == IncidentStatus.SUBMITTED])
    reviewing_incidents = len([i for i in incidents_in_range if i.status == IncidentStatus.REVIEWING])
    resolved_incidents = len([i for i in incidents_in_range if i.status == IncidentStatus.RESOLVED])

    # Count by incident type
    theft_incidents = len([i for i in incidents_in_range if i.incident_type.value == "THEFT"])
    assault_incidents = len([i for i in incidents_in_range if i.incident_type.value == "ASSAULT"])
    harassment_incidents = len([i for i in incidents_in_range if i.incident_type.value == "HARASSMENT"])
    accident_incidents = len([i for i in incidents_in_range if i.incident_type.value == "ACCIDENT"])
    suspicious_incidents = len([i for i in incidents_in_range if i.incident_type.value == "SUSPICIOUS_ACTIVITY"])
    vandalism_incidents = len([i for i in incidents_in_range if i.incident_type.value == "VANDALISM"])
    medical_incidents = len([i for i in incidents_in_range if i.incident_type.value == "MEDICAL_EMERGENCY"])
    fire_incidents = len([i for i in incidents_in_range if i.incident_type.value == "FIRE"])
    other_incidents = len([i for i in incidents_in_range if i.incident_type.value == "OTHER"])

    # Debug logging
    from loguru import logger
    logger.info(f"PDF Generation - Total incidents: {total_incidents}")
    logger.info(f"PDF Generation - Incident types: theft={theft_incidents}, assault={assault_incidents}, harassment={harassment_incidents}")

    # Generate PDF
    alerts_data = {
        "total": total_alerts,
        "active": active_alerts,
        "resolved": resolved_alerts,
        "false_alarms": false_alarms,
        "by_type": {
            "sos": sos_alerts,
            "voice_trigger": voice_alerts,
            "ai_analysis": ai_alerts
        }
    }

    incidents_data = {
        "total": total_incidents,
        "submitted": submitted_incidents,
        "reviewing": reviewing_incidents,
        "resolved": resolved_incidents,
        "by_type": {
            "theft": theft_incidents,
            "assault": assault_incidents,
            "harassment": harassment_incidents,
            "accident": accident_incidents,
            "suspicious_activity": suspicious_incidents,
            "vandalism": vandalism_incidents,
            "medical_emergency": medical_incidents,
            "fire": fire_incidents,
            "other": other_incidents
        }
    }

    pdf_buffer = await pdf_report_service.generate_agent_report(
        authority_name=authority.name,
        authority_department=authority.department or "Government Authority",
        period_start=start_date.isoformat(),
        period_end=end_date.isoformat(),
        period_days=days,
        alerts_data=alerts_data,
        incidents_data=incidents_data,
        daily_data=daily_stats
    )

    filename = f"{authority.name.replace(' ', '_')}_report_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/admin/overall-stats/download-pdf")
async def download_overall_report_pdf(
    days: int = 30,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Download overall system PDF report for admin with AI insights."""
    from datetime import datetime, timedelta

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    # Get all authorities
    authorities = db.query(GovAuthority).all()
    total_authorities = len(authorities)

    # System-wide statistics
    total_alerts = 0
    total_active = 0
    total_resolved = 0
    total_false_alarms = 0
    total_sos = 0
    total_voice = 0
    total_ai = 0
    total_incidents = 0
    total_submitted_incidents = 0
    total_reviewing_incidents = 0
    total_resolved_incidents = 0

    agent_stats = []

    for authority in authorities:
        # Get alerts in jurisdiction
        alerts_in_jurisdiction = db.query(Alert).filter(
            Alert.created_at >= start_date,
            Alert.created_at <= end_date
        ).all()

        alerts_in_range = []
        for alert in alerts_in_jurisdiction:
            if alert.location_lat and alert.location_lng:
                distance = calculate_distance(
                    authority.latitude, authority.longitude,
                    alert.location_lat, alert.location_lng
                )
                if distance <= authority.radius_meters:
                    alerts_in_range.append(alert)

        agent_total = len(alerts_in_range)
        agent_active = len([a for a in alerts_in_range if a.status == AlertStatus.TRIGGERED])
        agent_resolved = len([a for a in alerts_in_range if a.status == AlertStatus.SAFE])
        agent_false = len([a for a in alerts_in_range if a.status == AlertStatus.CANCELLED])

        # Get incidents
        incidents_in_jurisdiction = db.query(IncidentReport).filter(
            IncidentReport.created_at >= start_date,
            IncidentReport.created_at <= end_date
        ).all()

        incidents_in_range = []
        for incident in incidents_in_jurisdiction:
            if incident.location_lat and incident.location_lng:
                distance = calculate_distance(
                    authority.latitude, authority.longitude,
                    incident.location_lat, incident.location_lng
                )
                if distance <= authority.radius_meters:
                    incidents_in_range.append(incident)

        agent_total_inc = len(incidents_in_range)
        agent_submitted = len([i for i in incidents_in_range if i.status == IncidentStatus.SUBMITTED])
        agent_reviewing = len([i for i in incidents_in_range if i.status == IncidentStatus.REVIEWING])
        agent_resolved_inc = len([i for i in incidents_in_range if i.status == IncidentStatus.RESOLVED])

        # Accumulate totals
        total_alerts += agent_total
        total_active += agent_active
        total_resolved += agent_resolved
        total_false_alarms += agent_false
        total_sos += len([a for a in alerts_in_range if a.type == "sos"])
        total_voice += len([a for a in alerts_in_range if a.type == "voice_trigger"])
        total_ai += len([a for a in alerts_in_range if a.type == "ai_analysis"])
        total_incidents += agent_total_inc
        total_submitted_incidents += agent_submitted
        total_reviewing_incidents += agent_reviewing
        total_resolved_incidents += agent_resolved_inc

        agent_stats.append({
            "id": authority.id,
            "name": authority.name,
            "department": authority.department or "N/A",
            "user_name": authority.user.name if authority.user else "N/A",
            "alerts": {
                "total": agent_total,
                "active": agent_active,
                "resolved": agent_resolved,
                "false_alarms": agent_false
            },
            "incidents": {
                "total": agent_total_inc,
                "submitted": agent_submitted,
                "reviewing": agent_reviewing,
                "resolved": agent_resolved_inc
            }
        })

    summary_data = {
        "total_agents": total_authorities,
        "total_alerts": total_alerts,
        "active_alerts": total_active,
        "resolved_alerts": total_resolved,
        "false_alarms": total_false_alarms,
        "by_type": {
            "sos": total_sos,
            "voice_trigger": total_voice,
            "ai_analysis": total_ai
        },
        "total_incidents": total_incidents,
        "submitted_incidents": total_submitted_incidents,
        "reviewing_incidents": total_reviewing_incidents,
        "resolved_incidents": total_resolved_incidents
    }

    # Generate PDF
    pdf_buffer = await pdf_report_service.generate_admin_overall_report(
        period_start=start_date.isoformat(),
        period_end=end_date.isoformat(),
        period_days=days,
        summary_data=summary_data,
        agents_data=agent_stats
    )

    filename = f"overall_system_report_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/admin/agent-stats/{agent_id}/download-pdf")
async def download_agent_stats_pdf(
    agent_id: int,
    days: int = 30,
    current_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db)
):
    """Download PDF report for a specific agent (admin only) with AI insights."""
    from datetime import datetime, timedelta

    # Get the authority
    authority = db.query(GovAuthority).filter(GovAuthority.id == agent_id).first()
    if not authority:
        raise HTTPException(status_code=404, detail="Agent not found")

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    # Same logic as agent download endpoint
    alerts_in_jurisdiction = db.query(Alert).filter(
        Alert.created_at >= start_date,
        Alert.created_at <= end_date
    ).all()

    alerts_in_range = []
    for alert in alerts_in_jurisdiction:
        if alert.location_lat and alert.location_lng:
            distance = calculate_distance(
                authority.latitude, authority.longitude,
                alert.location_lat, alert.location_lng
            )
            if distance <= authority.radius_meters:
                alerts_in_range.append(alert)

    total_alerts = len(alerts_in_range)
    active_alerts = len([a for a in alerts_in_range if a.status == AlertStatus.TRIGGERED])
    resolved_alerts = len([a for a in alerts_in_range if a.status == AlertStatus.SAFE])
    false_alarms = len([a for a in alerts_in_range if a.status == AlertStatus.CANCELLED])

    sos_alerts = len([a for a in alerts_in_range if a.type == "sos"])
    voice_alerts = len([a for a in alerts_in_range if a.type == "voice_trigger"])
    ai_alerts = len([a for a in alerts_in_range if a.type == "ai_analysis"])

    daily_stats = {}
    for i in range(days):
        date = (start_date + timedelta(days=i)).date()
        daily_stats[str(date)] = {"total": 0, "active": 0, "resolved": 0}

    for alert in alerts_in_range:
        date_key = str(alert.created_at.date())
        if date_key in daily_stats:
            daily_stats[date_key]["total"] += 1
            if alert.status == AlertStatus.TRIGGERED:
                daily_stats[date_key]["active"] += 1
            elif alert.status == AlertStatus.SAFE:
                daily_stats[date_key]["resolved"] += 1

    incidents_in_jurisdiction = db.query(IncidentReport).filter(
        IncidentReport.created_at >= start_date,
        IncidentReport.created_at <= end_date
    ).all()

    incidents_in_range = []
    for incident in incidents_in_jurisdiction:
        if incident.location_lat and incident.location_lng:
            distance = calculate_distance(
                authority.latitude, authority.longitude,
                incident.location_lat, incident.location_lng
            )
            if distance <= authority.radius_meters:
                incidents_in_range.append(incident)

    total_incidents = len(incidents_in_range)
    submitted_incidents = len([i for i in incidents_in_range if i.status == IncidentStatus.SUBMITTED])
    reviewing_incidents = len([i for i in incidents_in_range if i.status == IncidentStatus.REVIEWING])
    resolved_incidents = len([i for i in incidents_in_range if i.status == IncidentStatus.RESOLVED])

    # Count by incident type
    theft_incidents = len([i for i in incidents_in_range if i.incident_type.value == "THEFT"])
    assault_incidents = len([i for i in incidents_in_range if i.incident_type.value == "ASSAULT"])
    harassment_incidents = len([i for i in incidents_in_range if i.incident_type.value == "HARASSMENT"])
    accident_incidents = len([i for i in incidents_in_range if i.incident_type.value == "ACCIDENT"])
    suspicious_incidents = len([i for i in incidents_in_range if i.incident_type.value == "SUSPICIOUS_ACTIVITY"])
    vandalism_incidents = len([i for i in incidents_in_range if i.incident_type.value == "VANDALISM"])
    medical_incidents = len([i for i in incidents_in_range if i.incident_type.value == "MEDICAL_EMERGENCY"])
    fire_incidents = len([i for i in incidents_in_range if i.incident_type.value == "FIRE"])
    other_incidents = len([i for i in incidents_in_range if i.incident_type.value == "OTHER"])

    alerts_data = {
        "total": total_alerts,
        "active": active_alerts,
        "resolved": resolved_alerts,
        "false_alarms": false_alarms,
        "by_type": {
            "sos": sos_alerts,
            "voice_trigger": voice_alerts,
            "ai_analysis": ai_alerts
        }
    }

    incidents_data = {
        "total": total_incidents,
        "submitted": submitted_incidents,
        "reviewing": reviewing_incidents,
        "resolved": resolved_incidents,
        "by_type": {
            "theft": theft_incidents,
            "assault": assault_incidents,
            "harassment": harassment_incidents,
            "accident": accident_incidents,
            "suspicious_activity": suspicious_incidents,
            "vandalism": vandalism_incidents,
            "medical_emergency": medical_incidents,
            "fire": fire_incidents,
            "other": other_incidents
        }
    }

    pdf_buffer = await pdf_report_service.generate_agent_report(
        authority_name=authority.name,
        authority_department=authority.department or "Government Authority",
        period_start=start_date.isoformat(),
        period_end=end_date.isoformat(),
        period_days=days,
        alerts_data=alerts_data,
        incidents_data=incidents_data,
        daily_data=daily_stats
    )

    filename = f"{authority.name.replace(' ', '_')}_report_{datetime.now().strftime('%Y%m%d')}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
