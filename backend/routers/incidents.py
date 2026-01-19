"""
Incident reporting router for public incident reports.
"""

import os
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from database import get_db
from models import User, IncidentReport, IncidentType, IncidentStatus, GovAuthority
from auth import get_current_user
from services.alert_manager import calculate_distance, get_authorities_in_radius
from services.twilio_service import twilio_service
from services.r2_service import r2_service

logger = logging.getLogger(__name__)

router = APIRouter()


class CreateIncidentRequest(BaseModel):
    """Schema for creating an incident report."""
    incident_type: IncidentType = Field(..., description="Type of incident")
    title: str = Field(..., min_length=3, max_length=200, description="Brief title")
    description: str = Field(..., min_length=10, description="Detailed description")
    location_lat: float = Field(..., description="Incident latitude")
    location_lng: float = Field(..., description="Incident longitude")
    location_address: Optional[str] = Field(None, description="Human-readable address")
    witness_name: Optional[str] = Field(None, description="Witness name")
    witness_phone: Optional[str] = Field(None, description="Witness phone")
    is_anonymous: bool = Field(False, description="Report anonymously")


class UpdateIncidentStatusRequest(BaseModel):
    """Schema for updating incident status (govt agents/admins only)."""
    status: IncidentStatus = Field(..., description="New status")
    authority_notes: Optional[str] = Field(None, description="Notes from authority")


class IncidentResponse(BaseModel):
    """Schema for incident report response."""
    id: int
    user_id: int
    reporter_name: str
    reporter_phone: str
    reporter_email: str
    incident_type: str
    status: str
    title: str
    description: str
    location_lat: float
    location_lng: float
    location_address: Optional[str]
    media_files: List[str]
    witness_name: Optional[str]
    witness_phone: Optional[str]
    is_anonymous: bool
    assigned_authority_id: Optional[int]
    assigned_authority_name: Optional[str]
    authority_notes: Optional[str]
    created_at: str
    updated_at: Optional[str]


@router.post("/reports")
async def create_incident_report(
    data: CreateIncidentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new incident report.

    Args:
        data: Incident report data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created incident report with assigned authority info
    """
    try:
        # Create incident report
        incident = IncidentReport(
            user_id=current_user.id,
            incident_type=data.incident_type,
            title=data.title,
            description=data.description,
            location_lat=data.location_lat,
            location_lng=data.location_lng,
            location_address=data.location_address,
            witness_name=data.witness_name,
            witness_phone=data.witness_phone,
            is_anonymous=data.is_anonymous,
            status=IncidentStatus.SUBMITTED
        )

        db.add(incident)
        db.commit()
        db.refresh(incident)

        logger.info(f"Incident report {incident.id} created by user {current_user.id}")

        # Find authorities in jurisdiction
        authorities = get_authorities_in_radius(db, data.location_lat, data.location_lng)

        if authorities:
            # Assign to the first authority (you could implement more complex logic)
            incident.assigned_authority_id = authorities[0].id
            incident.status = IncidentStatus.REVIEWING
            db.commit()
            db.refresh(incident)

            logger.info(f"Incident {incident.id} assigned to authority {authorities[0].name}")

            # Notify all authorities in jurisdiction
            for authority in authorities:
                try:
                    reporter_info = "Anonymous Reporter" if data.is_anonymous else f"{current_user.name} ({current_user.phone})"
                    location_url = f"https://www.google.com/maps?q={data.location_lat},{data.location_lng}"
                    message = (
                        f"🚨 New Incident Report #{incident.id}\n\n"
                        f"Type: {data.incident_type.value}\n"
                        f"Title: {data.title}\n"
                        f"Location: {data.location_address or f'{data.location_lat}, {data.location_lng}'}\n"
                        f"Map: {location_url}\n"
                        f"Reporter: {reporter_info}\n\n"
                        f"Description: {data.description[:200]}\n\n"
                        f"View full report in your dashboard."
                    )

                    # Try WhatsApp first, then fall back to SMS
                    whatsapp_sent = twilio_service.send_whatsapp(authority.phone, message)
                    if not whatsapp_sent:
                        twilio_service.send_sms(authority.phone, message)
                        logger.info(f"Incident notification sent via SMS to authority {authority.name}")
                    else:
                        logger.info(f"Incident notification sent via WhatsApp to authority {authority.name}")

                except Exception as e:
                    logger.error(f"Failed to notify authority {authority.name}: {str(e)}")

        return {
            "id": incident.id,
            "incident_type": incident.incident_type.value,
            "status": incident.status.value,
            "title": incident.title,
            "assigned_authority": authorities[0].name if authorities else None,
            "created_at": incident.created_at.isoformat(),
            "message": "Incident report submitted successfully"
        }

    except Exception as e:
        logger.error(f"Error creating incident report: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create incident report: {str(e)}"
        )


@router.post("/reports/{incident_id}/media")
async def upload_incident_media(
    incident_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload a photo/video for an incident report.

    Args:
        incident_id: Incident report ID
        file: Media file to upload
        current_user: Current authenticated user
        db: Database session

    Returns:
        File path and updated incident info
    """
    # Get incident and verify ownership
    incident = db.query(IncidentReport).filter(IncidentReport.id == incident_id).first()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident report not found"
        )

    if incident.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only upload media to your own incident reports"
        )

    try:
        # Read file content
        content = await file.read()

        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        filename = f"incident_{incident_id}_{timestamp}{file_extension}"

        # Upload to R2
        object_key = f"incidents/{filename}"
        public_url = r2_service.upload_file(
            file_content=content,
            object_key=object_key,
            content_type=file.content_type or "application/octet-stream"
        )

        if not public_url:
            raise Exception("Failed to upload file to R2")

        # Add public URL to incident's media_files array
        if incident.media_files is None:
            incident.media_files = []

        incident.media_files = incident.media_files + [public_url]
        db.commit()

        logger.info(f"Media file uploaded to R2 for incident {incident_id}: {filename}")

        return {
            "file_url": public_url,
            "filename": filename,
            "message": "File uploaded successfully"
        }

    except Exception as e:
        logger.error(f"Error uploading media: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.get("/reports/my")
def get_my_incident_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all incident reports submitted by the current user.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of user's incident reports
    """
    incidents = db.query(IncidentReport).filter(
        IncidentReport.user_id == current_user.id
    ).order_by(IncidentReport.created_at.desc()).all()

    result = []
    for incident in incidents:
        authority = None
        if incident.assigned_authority_id:
            authority = db.query(GovAuthority).filter(
                GovAuthority.id == incident.assigned_authority_id
            ).first()

        result.append({
            "id": incident.id,
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
            "assigned_authority_name": authority.name if authority else None,
            "authority_notes": incident.authority_notes,
            "created_at": incident.created_at.isoformat(),
            "updated_at": incident.updated_at.isoformat() if incident.updated_at else None
        })

    return {"incidents": result}


@router.get("/reports/{incident_id}")
def get_incident_report(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific incident report.

    Args:
        incident_id: Incident report ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Incident report details
    """
    incident = db.query(IncidentReport).filter(IncidentReport.id == incident_id).first()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident report not found"
        )

    # Check if user has access (reporter or assigned authority)
    is_reporter = incident.user_id == current_user.id
    is_authority = False

    if current_user.user_type.value in ["GOVT_AGENT", "SUPER_ADMIN"]:
        if incident.assigned_authority_id:
            authority = db.query(GovAuthority).filter(
                GovAuthority.id == incident.assigned_authority_id,
                GovAuthority.user_id == current_user.id
            ).first()
            is_authority = authority is not None or current_user.user_type.value == "SUPER_ADMIN"

    if not (is_reporter or is_authority):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this incident report"
        )

    # Get reporter info
    reporter = db.query(User).filter(User.id == incident.user_id).first()

    # Get authority info
    authority = None
    if incident.assigned_authority_id:
        authority = db.query(GovAuthority).filter(
            GovAuthority.id == incident.assigned_authority_id
        ).first()

    return {
        "id": incident.id,
        "user_id": incident.user_id,
        "reporter_name": "Anonymous" if incident.is_anonymous else reporter.name,
        "reporter_phone": "Hidden" if incident.is_anonymous else reporter.phone,
        "reporter_email": "Hidden" if incident.is_anonymous else reporter.email,
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
    }


@router.put("/reports/{incident_id}/status")
def update_incident_status(
    incident_id: int,
    data: UpdateIncidentStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update incident status (govt agents and admins only).

    Args:
        incident_id: Incident report ID
        data: Status update data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated incident info
    """
    # Check if user is govt agent or super admin
    if current_user.user_type.value not in ["GOVT_AGENT", "SUPER_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only government agents and admins can update incident status"
        )

    incident = db.query(IncidentReport).filter(IncidentReport.id == incident_id).first()

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident report not found"
        )

    # Verify authority if govt agent
    if current_user.user_type.value == "GOVT_AGENT":
        authority = db.query(GovAuthority).filter(
            GovAuthority.user_id == current_user.id,
            GovAuthority.id == incident.assigned_authority_id
        ).first()

        if not authority:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update incidents assigned to your authority"
            )

    # Update status and notes
    incident.status = data.status
    if data.authority_notes:
        incident.authority_notes = data.authority_notes

    db.commit()
    db.refresh(incident)

    logger.info(f"Incident {incident_id} status updated to {data.status.value} by user {current_user.id}")

    return {
        "id": incident.id,
        "status": incident.status.value,
        "authority_notes": incident.authority_notes,
        "message": "Incident status updated successfully"
    }
