"""
Safe Locations Router for Protego.
Handles CRUD operations for user-defined safe locations and geofencing.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import math

from database import get_db
from models import User, SafeLocation
from auth import get_current_user

router = APIRouter()


# ==================== Request/Response Schemas ====================

class SafeLocationCreate(BaseModel):
    """Request to create a new safe location."""
    name: str = Field(..., min_length=1, max_length=100, description="Location name (e.g., 'Home', 'Work')")
    latitude: float = Field(..., ge=-90, le=90, description="Center point latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Center point longitude")
    radius_meters: int = Field(default=100, ge=10, le=200, description="Radius in meters (10-200)")
    auto_start_walk: bool = Field(default=True, description="Auto-start walk when leaving")
    auto_stop_walk: bool = Field(default=True, description="Auto-stop walk when entering")
    notes: Optional[str] = Field(None, max_length=500, description="Optional notes")


class SafeLocationUpdate(BaseModel):
    """Request to update a safe location."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    radius_meters: Optional[int] = Field(None, ge=10, le=200)
    is_active: Optional[bool] = None
    auto_start_walk: Optional[bool] = None
    auto_stop_walk: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=500)


class SafeLocationResponse(BaseModel):
    """Response for safe location."""
    id: int
    name: str
    latitude: float
    longitude: float
    radius_meters: int
    is_active: bool
    auto_start_walk: bool
    auto_stop_walk: bool
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class CheckGeofenceRequest(BaseModel):
    """Request to check if user is inside/outside any safe locations."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class CheckGeofenceResponse(BaseModel):
    """Response for geofence check."""
    inside_safe_location: bool
    safe_location_id: Optional[int]
    safe_location_name: Optional[str]
    distance_meters: Optional[float]
    should_auto_start_walk: bool  # True if outside all auto-start locations
    should_auto_stop_walk: bool  # True if inside an auto-stop location


# ==================== Helper Functions ====================

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.
    Returns distance in meters.
    """
    # Earth's radius in meters
    R = 6371000

    # Convert to radians
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    # Haversine formula
    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * \
        math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = R * c
    return distance


def is_inside_geofence(
    user_lat: float,
    user_lon: float,
    location_lat: float,
    location_lon: float,
    radius_meters: int
) -> bool:
    """Check if user coordinates are inside a geofence."""
    distance = calculate_distance(user_lat, user_lon, location_lat, location_lon)
    return distance <= radius_meters


# ==================== Endpoints ====================

@router.post("/", response_model=SafeLocationResponse, status_code=status.HTTP_201_CREATED)
async def create_safe_location(
    request: SafeLocationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new safe location for the current user.
    Maximum 10 safe locations per user.
    """
    # Check limit (10 safe locations per user)
    existing_count = db.query(SafeLocation).filter(
        SafeLocation.user_id == current_user.id
    ).count()

    if existing_count >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 safe locations allowed per user"
        )

    # Create new safe location
    new_location = SafeLocation(
        user_id=current_user.id,
        name=request.name,
        latitude=request.latitude,
        longitude=request.longitude,
        radius_meters=request.radius_meters,
        auto_start_walk=request.auto_start_walk,
        auto_stop_walk=request.auto_stop_walk,
        notes=request.notes
    )

    db.add(new_location)
    db.commit()
    db.refresh(new_location)

    return new_location


@router.get("/", response_model=List[SafeLocationResponse])
async def get_safe_locations(
    include_inactive: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all safe locations for the current user.
    By default, only returns active locations.
    """
    query = db.query(SafeLocation).filter(
        SafeLocation.user_id == current_user.id
    )

    if not include_inactive:
        query = query.filter(SafeLocation.is_active == True)

    locations = query.order_by(SafeLocation.created_at.desc()).all()
    return locations


@router.get("/{location_id}", response_model=SafeLocationResponse)
async def get_safe_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific safe location by ID."""
    location = db.query(SafeLocation).filter(
        SafeLocation.id == location_id,
        SafeLocation.user_id == current_user.id
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Safe location not found"
        )

    return location


@router.patch("/{location_id}", response_model=SafeLocationResponse)
async def update_safe_location(
    location_id: int,
    request: SafeLocationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a safe location."""
    location = db.query(SafeLocation).filter(
        SafeLocation.id == location_id,
        SafeLocation.user_id == current_user.id
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Safe location not found"
        )

    # Update fields if provided
    update_data = request.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(location, field, value)

    db.commit()
    db.refresh(location)

    return location


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_safe_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a safe location."""
    location = db.query(SafeLocation).filter(
        SafeLocation.id == location_id,
        SafeLocation.user_id == current_user.id
    ).first()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Safe location not found"
        )

    db.delete(location)
    db.commit()


@router.post("/check-geofence", response_model=CheckGeofenceResponse)
async def check_geofence(
    request: CheckGeofenceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check if user's current location is inside any safe location geofence.
    Used by frontend for auto-start/stop walk decisions.
    """
    # Get all active safe locations
    safe_locations = db.query(SafeLocation).filter(
        SafeLocation.user_id == current_user.id,
        SafeLocation.is_active == True
    ).all()

    # Check each safe location
    inside_location = None
    min_distance = float('inf')

    for location in safe_locations:
        distance = calculate_distance(
            request.latitude,
            request.longitude,
            location.latitude,
            location.longitude
        )

        if distance < min_distance:
            min_distance = distance

        # Check if inside this geofence
        if distance <= location.radius_meters:
            inside_location = location
            break  # Found the location user is inside

    # Determine auto-start/stop behavior
    should_auto_stop = False
    should_auto_start = False

    if inside_location:
        # Inside a safe location
        should_auto_stop = inside_location.auto_stop_walk
        should_auto_start = False
    else:
        # Outside all safe locations
        # Should auto-start if user has any auto-start locations configured
        has_auto_start_location = any(loc.auto_start_walk for loc in safe_locations)
        should_auto_start = has_auto_start_location
        should_auto_stop = False

    return CheckGeofenceResponse(
        inside_safe_location=inside_location is not None,
        safe_location_id=inside_location.id if inside_location else None,
        safe_location_name=inside_location.name if inside_location else None,
        distance_meters=min_distance if min_distance != float('inf') else None,
        should_auto_start_walk=should_auto_start,
        should_auto_stop_walk=should_auto_stop
    )


@router.get("/nearest/{latitude}/{longitude}")
async def get_nearest_safe_location(
    latitude: float,
    longitude: float,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Find the nearest safe location to the given coordinates.
    Useful for "navigate to nearest safe location" feature.
    """
    safe_locations = db.query(SafeLocation).filter(
        SafeLocation.user_id == current_user.id,
        SafeLocation.is_active == True
    ).all()

    if not safe_locations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No safe locations configured"
        )

    # Find nearest location
    nearest = None
    min_distance = float('inf')

    for location in safe_locations:
        distance = calculate_distance(
            latitude,
            longitude,
            location.latitude,
            location.longitude
        )

        if distance < min_distance:
            min_distance = distance
            nearest = location

    return {
        "id": nearest.id,
        "name": nearest.name,
        "latitude": nearest.latitude,
        "longitude": nearest.longitude,
        "distance_meters": round(min_distance, 2),
        "inside_geofence": min_distance <= nearest.radius_meters
    }
