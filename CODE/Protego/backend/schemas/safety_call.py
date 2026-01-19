"""
Pydantic schemas for safety call API.
"""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class StartCallRequest(BaseModel):
    """Request to start a safety call."""
    location: Optional[Dict[str, float]] = None


class StartCallResponse(BaseModel):
    """Response when starting a safety call."""
    session_id: str
    connection: Dict[str, Any]
    system_instructions: str


class TranscriptEvent(BaseModel):
    """Transcript event from frontend."""
    session_id: str
    transcript: str
    speaker: str = "user"


class EndCallResponse(BaseModel):
    """Response when ending a call."""
    session_id: str
    duration_seconds: int
    distress_detected: bool
    alerts_triggered: int


class CallHistoryItem(BaseModel):
    """Safety call history item."""
    id: int
    session_id: str
    start_time: datetime
    end_time: Optional[datetime]
    duration_seconds: Optional[int]
    distress_detected: bool
    distress_keywords: List[str]
    alert_triggered: bool

    class Config:
        from_attributes = True


class CallStatsResponse(BaseModel):
    """User's safety call statistics."""
    total_calls: int
    total_duration_seconds: int
    distress_detected_count: int
    alerts_triggered_count: int
