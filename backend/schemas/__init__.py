"""Pydantic schemas package."""

# Base schemas (users, walks, alerts, contacts)
from .base import (
    # User schemas
    UserCreate,
    UserRegister,
    UserLogin,
    UserUpdate,
    DuressPasswordSet,
    DuressPasswordRemove,
    UserResponse,
    Token,
    AuthResponse,
    TrustedContactAdd,
    TrustedContactRemove,
    # Trusted contact schemas
    TrustedContactCreate,
    TrustedContactUpdate,
    TrustedContactResponse,
    # Walk session schemas
    WalkSessionStart,
    WalkSessionStop,
    WalkSessionResponse,
    # Alert schemas
    AlertCreate,
    AlertCancel,
    AlertResponse,
    AlertWithUser,
    # Pagination schemas
    PaginationMeta,
    PaginatedAlertsResponse,
)

# Safety call schemas
from .safety_call import (
    StartCallRequest,
    StartCallResponse,
    TranscriptEvent,
    EndCallResponse,
    CallHistoryItem,
    CallStatsResponse
)

__all__ = [
    # User schemas
    "UserCreate",
    "UserRegister",
    "UserLogin",
    "UserUpdate",
    "DuressPasswordSet",
    "DuressPasswordRemove",
    "UserResponse",
    "Token",
    "AuthResponse",
    "TrustedContactAdd",
    "TrustedContactRemove",
    # Trusted contact schemas
    "TrustedContactCreate",
    "TrustedContactUpdate",
    "TrustedContactResponse",
    # Walk session schemas
    "WalkSessionStart",
    "WalkSessionStop",
    "WalkSessionResponse",
    # Alert schemas
    "AlertCreate",
    "AlertCancel",
    "AlertResponse",
    "AlertWithUser",
    # Pagination schemas
    "PaginationMeta",
    "PaginatedAlertsResponse",
    # Safety call schemas
    "StartCallRequest",
    "StartCallResponse",
    "TranscriptEvent",
    "EndCallResponse",
    "CallHistoryItem",
    "CallStatsResponse"
]
