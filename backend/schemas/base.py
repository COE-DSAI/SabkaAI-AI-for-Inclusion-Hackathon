"""Pydantic schemas for request/response validation."""

from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
from models import AlertStatus, AlertType, UserType


# ==================== User Schemas ====================

class UserCreate(BaseModel):
    """Schema for creating a new user (sign up)."""
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")  # E.164 format
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    password: str = Field(..., min_length=8, max_length=100)
    trusted_contacts: List[str] = Field(default_factory=list)

    @validator("trusted_contacts")
    def validate_contacts(cls, v):
        """Validate that trusted contacts are valid phone numbers."""
        for contact in v:
            if not contact.startswith("+"):
                raise ValueError("Phone numbers must be in E.164 format (e.g., +1234567890)")
        return v


# Alias for compatibility with auth router
UserRegister = UserCreate


class UserLogin(BaseModel):
    """Schema for user login."""
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    password: str = Field(..., min_length=1)


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = None
    trusted_contacts: Optional[List[str]] = None


class DuressPasswordSet(BaseModel):
    """Schema for setting/updating duress password."""
    current_password: str = Field(..., min_length=1, description="Current main password for verification")
    duress_password: str = Field(..., min_length=8, max_length=100, description="New duress password (must be different from main password)")

    @validator("duress_password")
    def validate_duress_password(cls, v, values):
        """Ensure duress password is different from main password."""
        if "current_password" in values and v == values["current_password"]:
            raise ValueError("Duress password must be different from main password")
        return v


class DuressPasswordRemove(BaseModel):
    """Schema for removing duress password."""
    current_password: str = Field(..., min_length=1, description="Current main password for verification")


class UserResponse(BaseModel):
    """Schema for user response."""
    id: int
    name: str
    phone: str
    email: str
    user_type: UserType
    trusted_contacts: List[str]
    created_at: datetime

    @property
    def has_duress_password(self) -> bool:
        """Computed field - never expose the actual password."""
        return bool(getattr(self, 'duress_password_hash', None))

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for authentication token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class AuthResponse(BaseModel):
    """Schema for authentication response (alias for Token)."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TrustedContactAdd(BaseModel):
    """Schema for adding a trusted contact (legacy - uses JSON field)."""
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")
    name: Optional[str] = None


class TrustedContactRemove(BaseModel):
    """Schema for removing a trusted contact (legacy - uses JSON field)."""
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")


# ==================== Trusted Contact Schemas ====================

class TrustedContactCreate(BaseModel):
    """Schema for creating a new trusted contact."""
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., pattern=r"^\+?[1-9]\d{1,14}$")  # E.164 format
    email: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    contact_relationship: Optional[str] = Field(None, max_length=50)
    priority: Optional[int] = Field(1, ge=1, le=10)
    notes: Optional[str] = Field(None, max_length=500)


class TrustedContactUpdate(BaseModel):
    """Schema for updating a trusted contact."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^\+?[1-9]\d{1,14}$")
    email: Optional[str] = Field(None, pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
    contact_relationship: Optional[str] = Field(None, max_length=50)
    priority: Optional[int] = Field(None, ge=1, le=10)
    is_active: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=500)


class TrustedContactResponse(BaseModel):
    """Schema for trusted contact response."""
    id: int
    user_id: int
    name: str
    phone: str
    email: Optional[str]
    contact_relationship: Optional[str]
    priority: int
    is_verified: bool
    is_active: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ==================== Walk Session Schemas ====================

class WalkSessionStart(BaseModel):
    """Schema for starting a walk session."""
    user_id: int
    location_lat: Optional[float] = Field(None, ge=-90, le=90)
    location_lng: Optional[float] = Field(None, ge=-180, le=180)
    mode: Optional[str] = Field("manual", description="Walk mode: manual, auto_geofence, or silent")
    safe_location_id: Optional[int] = Field(None, description="Safe location ID if auto-started by geofence")


class WalkSessionStop(BaseModel):
    """Schema for stopping a walk session."""
    session_id: int
    password: Optional[str] = Field(None, description="Password to verify stop (checks both main and duress)")
    location_lat: Optional[float] = Field(None, description="Ending latitude")
    location_lng: Optional[float] = Field(None, description="Ending longitude")


class WalkSessionResponse(BaseModel):
    """Schema for walk session response."""
    id: int
    user_id: int
    start_time: datetime
    end_time: Optional[datetime]
    active: bool
    mode: str
    started_by_geofence: bool
    safe_location_id: Optional[int]
    location_lat: Optional[float]
    location_lng: Optional[float]

    class Config:
        from_attributes = True


# ==================== Alert Schemas ====================

class AlertCreate(BaseModel):
    """Schema for creating an alert."""
    user_id: int
    session_id: Optional[int] = None
    type: AlertType
    confidence: float = Field(..., ge=0.0, le=1.0)
    location_lat: Optional[float] = Field(None, ge=-90, le=90)
    location_lng: Optional[float] = Field(None, ge=-180, le=180)
    snapshot_url: Optional[str] = None
    # AI Analysis fields
    transcription: Optional[str] = None
    ai_analysis: Optional[str] = None
    keywords_detected: Optional[List[str]] = None


class AlertCancel(BaseModel):
    """Schema for cancelling an alert."""
    alert_id: int


class AlertResponse(BaseModel):
    """Schema for alert response."""
    id: int
    user_id: int
    session_id: Optional[int]
    type: AlertType
    confidence: float
    status: AlertStatus
    location_lat: Optional[float]
    location_lng: Optional[float]
    snapshot_url: Optional[str]
    created_at: datetime
    triggered_at: Optional[datetime]
    cancelled_at: Optional[datetime]

    class Config:
        from_attributes = True


class AlertWithUser(AlertResponse):
    """Schema for alert response with user details."""
    user_name: str
    user_phone: str

    class Config:
        from_attributes = True


# ==================== Pagination Schemas ====================

class PaginationMeta(BaseModel):
    """Schema for pagination metadata."""
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, le=100, description="Items per page")
    total_items: int = Field(..., ge=0, description="Total number of items")
    total_pages: int = Field(..., ge=0, description="Total number of pages")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_prev: bool = Field(..., description="Whether there is a previous page")


class PaginatedAlertsResponse(BaseModel):
    """Schema for paginated alerts response."""
    items: List[AlertResponse]
    meta: PaginationMeta
