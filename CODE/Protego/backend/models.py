"""
SQLAlchemy ORM models for Protego.
Defines User, WalkSession, and Alert database tables.
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Enum as SQLEnum, ARRAY, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum

from database import Base


class UserType(str, enum.Enum):
    """Enum for user type values."""
    REGULAR = "REGULAR"
    GOVT_AGENT = "GOVT_AGENT"
    SUPER_ADMIN = "SUPER_ADMIN"


class AlertStatus(str, enum.Enum):
    """Enum for alert status values."""
    PENDING = "pending"
    CANCELLED = "cancelled"
    TRIGGERED = "triggered"
    SAFE = "safe"


class AlertType(str, enum.Enum):
    """Enum for alert type values."""
    SCREAM = "SCREAM"
    FALL = "FALL"
    DISTRESS = "DISTRESS"
    PANIC = "PANIC"
    MOTION_ANOMALY = "MOTION_ANOMALY"
    SOUND_ANOMALY = "SOUND_ANOMALY"
    VOICE_ACTIVATION = "VOICE_ACTIVATION"
    SOS = "SOS"
    DURESS = "DURESS"  # Silent alert triggered by duress password


class WalkMode(str, enum.Enum):
    """Enum for walk session mode values."""
    MANUAL = "manual"  # User manually started/stopped
    AUTO_GEOFENCE = "auto_geofence"  # Auto-started by leaving safe location
    SILENT = "silent"  # Silent mode (duress password used, frontend shows stopped)


class IncidentType(str, enum.Enum):
    """Enum for incident report type values."""
    THEFT = "THEFT"
    ASSAULT = "ASSAULT"
    HARASSMENT = "HARASSMENT"
    ACCIDENT = "ACCIDENT"
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY"
    VANDALISM = "VANDALISM"
    MEDICAL_EMERGENCY = "MEDICAL_EMERGENCY"
    FIRE = "FIRE"
    OTHER = "OTHER"


class IncidentStatus(str, enum.Enum):
    """Enum for incident report status values."""
    SUBMITTED = "SUBMITTED"
    REVIEWING = "REVIEWING"
    ASSIGNED = "ASSIGNED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class User(Base):
    """
    User model representing a Protego user.

    Attributes:
        id: Primary key
        name: User's full name
        phone: User's phone number
        email: User's email address
        password_hash: Hashed password for authentication
        trusted_contacts: JSON array of trusted contact phone numbers (deprecated - use TrustedContact model)
        created_at: Timestamp when user was created
        updated_at: Timestamp when user was last updated
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    duress_password_hash = Column(String, nullable=True)  # Optional duress password for silent alert
    user_type = Column(SQLEnum(UserType), default=UserType.REGULAR, nullable=False, index=True)
    trusted_contacts = Column(JSON, default=list, nullable=False)  # DEPRECATED: Use TrustedContact model
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    walk_sessions = relationship("WalkSession", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    trusted_contact_list = relationship("TrustedContact", back_populates="user", cascade="all, delete-orphan")
    safe_locations = relationship("SafeLocation", back_populates="user", cascade="all, delete-orphan")
    safety_call_sessions = relationship("SafetyCallSession", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, name='{self.name}', phone='{self.phone}')>"


class TrustedContact(Base):
    """
    Trusted contact model for emergency notifications.

    Attributes:
        id: Primary key
        user_id: Foreign key to User
        name: Contact's full name
        phone: Contact's phone number (E.164 format with country code)
        email: Contact's email address (optional)
        contact_relationship: Relationship to user (e.g., "parent", "spouse", "friend")
        priority: Notification priority (1 = highest priority)
        is_verified: Whether contact has been verified
        is_active: Whether contact should receive alerts
        notes: Optional notes about the contact
        created_at: When the contact was added
        updated_at: When the contact was last updated
    """
    __tablename__ = "trusted_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)  # E.164 format: +12345678900
    email = Column(String, nullable=True)
    contact_relationship = Column(String, nullable=True)  # parent, spouse, friend, etc.
    priority = Column(Integer, default=1, nullable=False)  # 1 = highest priority
    is_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="trusted_contact_list")

    def __repr__(self):
        return f"<TrustedContact(id={self.id}, name='{self.name}', phone='{self.phone}', priority={self.priority})>"


class WalkSession(Base):
    """
    Walk session model representing a user's active safety monitoring session.

    Attributes:
        id: Primary key
        user_id: Foreign key to User
        start_time: When the walk session started
        end_time: When the walk session ended (null if active)
        active: Whether the session is currently active
        location_lat: Starting latitude
        location_lng: Starting longitude
    """
    __tablename__ = "walk_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    active = Column(Boolean, default=True, nullable=False, index=True)
    mode = Column(SQLEnum(WalkMode), default=WalkMode.MANUAL, nullable=False)
    started_by_geofence = Column(Boolean, default=False, nullable=False)  # True if auto-started by leaving safe location
    safe_location_id = Column(Integer, ForeignKey("safe_locations.id"), nullable=True)  # Which safe location triggered auto-start
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    end_latitude = Column(Float, nullable=True)  # Ending latitude when session stopped
    end_longitude = Column(Float, nullable=True)  # Ending longitude when session stopped

    # Relationships
    user = relationship("User", back_populates="walk_sessions")
    alerts = relationship("Alert", back_populates="session", cascade="all, delete-orphan")
    safe_location = relationship("SafeLocation")

    def __repr__(self):
        return f"<WalkSession(id={self.id}, user_id={self.user_id}, active={self.active})>"


class Alert(Base):
    """
    Alert model representing a distress detection event.

    Attributes:
        id: Primary key
        user_id: Foreign key to User
        session_id: Foreign key to WalkSession
        type: Type of alert (scream, fall, etc.)
        confidence: AI model confidence score (0.0 to 1.0)
        status: Alert status (pending, triggered, cancelled, safe)
        location_lat: Latitude where alert occurred
        location_lng: Longitude where alert occurred
        snapshot_url: Optional URL to image/video snapshot
        created_at: When the alert was created
        triggered_at: When the alert was actually triggered (SMS sent)
        cancelled_at: When the alert was cancelled by user
        countdown_started_at: When the countdown timer started (for persistence)
        countdown_expires_at: When the countdown will expire and trigger (for persistence)
    """
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("walk_sessions.id"), nullable=True, index=True)
    type = Column(SQLEnum(AlertType), nullable=False)
    confidence = Column(Float, nullable=False)
    status = Column(SQLEnum(AlertStatus), default=AlertStatus.PENDING, nullable=False, index=True)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    snapshot_url = Column(String, nullable=True)
    is_duress = Column(Boolean, default=False, nullable=False, index=True)  # True if triggered by duress password
    live_tracking_token = Column(String, nullable=True, index=True)  # Token for shareable live tracking link

    # AI Voice Analysis fields
    transcription = Column(Text, nullable=True)  # What was heard
    ai_analysis = Column(Text, nullable=True)  # AI's analysis explanation
    keywords_detected = Column(JSON, nullable=True)  # Keywords found as JSON array

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    triggered_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    countdown_started_at = Column(DateTime(timezone=True), nullable=True)
    countdown_expires_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Relationships
    user = relationship("User", back_populates="alerts")
    session = relationship("WalkSession", back_populates="alerts")

    def __repr__(self):
        return f"<Alert(id={self.id}, type={self.type}, confidence={self.confidence}, status={self.status})>"


class SafeLocation(Base):
    """
    Safe location model for geofencing and auto-walk triggers.

    Attributes:
        id: Primary key
        user_id: Foreign key to User
        name: Location name (e.g., "Home", "Work", "Mom's House")
        latitude: Center point latitude
        longitude: Center point longitude
        radius_meters: Radius in meters (default 100m)
        is_active: Whether geofencing is enabled for this location
        auto_start_walk: Auto-start walk when leaving this location
        auto_stop_walk: Auto-stop walk when entering this location
        notes: Optional notes about the location
        created_at: When the location was added
        updated_at: When the location was last updated
    """
    __tablename__ = "safe_locations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_meters = Column(Integer, default=100, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    auto_start_walk = Column(Boolean, default=True, nullable=False)  # Start walk when leaving
    auto_stop_walk = Column(Boolean, default=True, nullable=False)  # Stop walk when entering
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="safe_locations")

    def __repr__(self):
        return f"<SafeLocation(id={self.id}, name='{self.name}', latitude={self.latitude}, longitude={self.longitude}, radius={self.radius_meters}m)>"


class SafetyCallSession(Base):
    """
    Safety call session model for tracking AI-powered fake safety calls.

    Attributes:
        id: Primary key
        user_id: Foreign key to User
        session_id: Unique session identifier (UUID)
        start_time: When the call started
        end_time: When the call ended (null if active)
        duration_seconds: Call duration in seconds
        start_location_lat: Latitude when call started
        start_location_lng: Longitude when call started
        distress_detected: Whether distress was detected during call
        distress_keywords: Array of detected distress keywords
        alert_triggered: Whether an alert was triggered
        alert_id: Foreign key to Alert if triggered
        conversation_json: Full conversation history as JSON
        created_at: Timestamp when record was created
    """
    __tablename__ = "safety_call_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(String, unique=True, nullable=False, index=True)

    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)

    # Location when call started
    start_location_lat = Column(Float, nullable=True)
    start_location_lng = Column(Float, nullable=True)

    # Distress detection
    distress_detected = Column(Boolean, default=False, nullable=False)
    distress_keywords = Column(ARRAY(String), default=[], nullable=False)
    alert_triggered = Column(Boolean, default=False, nullable=False)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=True)

    # Conversation history (JSON array of {speaker, transcript, timestamp})
    conversation_json = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="safety_call_sessions")
    alert = relationship("Alert", backref="safety_call_session")

    def __repr__(self):
        return f"<SafetyCallSession(id={self.id}, session_id='{self.session_id}', user_id={self.user_id}, duration={self.duration_seconds}s)>"


class GovAuthority(Base):
    """
    Government authority model for location-based alert notifications.

    Attributes:
        id: Primary key
        user_id: Foreign key to User (govt agent account)
        name: Authority name (e.g., "Mumbai Police West Division")
        latitude: Center point latitude for jurisdiction
        longitude: Center point longitude for jurisdiction
        radius_meters: Jurisdiction radius in meters
        phone: Contact phone number (E.164 format)
        email: Contact email address
        department: Department/division name
        is_active: Whether authority should receive alerts
        notes: Optional notes about the authority
        created_at: When the authority was added
        updated_at: When the authority was last updated
    """
    __tablename__ = "gov_authorities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True, unique=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius_meters = Column(Integer, nullable=False)  # Jurisdiction radius
    phone = Column(String, nullable=False)  # E.164 format: +12345678900
    email = Column(String, nullable=True)
    department = Column(String, nullable=True)  # Police, Fire, Medical, etc.
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="gov_authority")

    def __repr__(self):
        return f"<GovAuthority(id={self.id}, name='{self.name}', radius={self.radius_meters}m)>"


class IncidentReport(Base):
    """
    Incident report model for public incident reporting.

    Attributes:
        id: Primary key
        user_id: Foreign key to User (reporter)
        incident_type: Type of incident (THEFT, ASSAULT, etc.)
        status: Current status of the report
        title: Brief title/summary of the incident
        description: Detailed description of what happened
        location_lat: Latitude where incident occurred
        location_lng: Longitude where incident occurred
        location_address: Human-readable address (optional)
        media_files: Array of file paths/URLs for photos/videos
        witness_name: Witness name if any (optional)
        witness_phone: Witness contact number (optional)
        is_anonymous: Whether reporter wants to remain anonymous
        assigned_authority_id: Which government authority is handling this
        authority_notes: Notes from government authority
        created_at: When the report was submitted
        updated_at: When the report was last updated
    """
    __tablename__ = "incident_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    incident_type = Column(SQLEnum(IncidentType), nullable=False, index=True)
    status = Column(SQLEnum(IncidentStatus), default=IncidentStatus.SUBMITTED, nullable=False, index=True)

    # Incident details
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)

    # Location
    location_lat = Column(Float, nullable=False, index=True)
    location_lng = Column(Float, nullable=False, index=True)
    location_address = Column(String, nullable=True)

    # Media
    media_files = Column(ARRAY(String), default=list, nullable=False)  # Array of file paths

    # Witness information
    witness_name = Column(String, nullable=True)
    witness_phone = Column(String, nullable=True)

    # Privacy
    is_anonymous = Column(Boolean, default=False, nullable=False)

    # Authority assignment
    assigned_authority_id = Column(Integer, ForeignKey("gov_authorities.id"), nullable=True, index=True)
    authority_notes = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", backref="incident_reports")
    assigned_authority = relationship("GovAuthority", backref="assigned_incidents")

    def __repr__(self):
        return f"<IncidentReport(id={self.id}, type='{self.incident_type}', status='{self.status}')>"
