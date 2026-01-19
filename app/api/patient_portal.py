from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime

router = APIRouter()

# --- In-Memory Report Store ---
# Format: { "PHONE_NUMBER": { "report_id": "REP-123", "data": {...} } }
_patient_reports = {}

from app.utils.health_card_generator import generate_health_card
from app.utils.report_formatter import format_web_recommendation

class FindingItem(BaseModel):
    name: str
    status: str
    severity: str
    detected: bool

class ContactItem(BaseModel):
    name: str
    number: str
    available: str

class PatientReportResponse(BaseModel):
    patient_phone: str
    report_id: str
    risk_level: str
    recommendation: str
    timestamp: str
    card_url: Optional[str] = None
    details: Optional[Dict] = {}
    findings: Optional[List[FindingItem]] = []
    medical_contacts: Optional[List[ContactItem]] = []
    next_steps: Optional[List[str]] = []
    disclaimer: Optional[str] = None

class ReportService:
    def save_report(self, phone: str, result, language: str):
        """Save a report and generate a physical health card image"""
        report_id = f"REP-{int(datetime.now().timestamp())}"
        
        # 1. Generate the physical JPG file
        image_path = generate_health_card(result, language)
        
        # 2. Convert local path to a reachable URL (via the /data mount)
        # image_path looks like "data/health_cards/card_xyz.jpg"
        card_url = f"/{image_path}" if image_path else None
        
        # 3. Get enhanced web format
        enhanced_data = format_web_recommendation(result, language)
        
        _patient_reports[phone] = {
            "report_id": report_id,
            "risk_level": result.overall_risk_level,
            "recommendation": enhanced_data["base_recommendation"],
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "card_url": card_url,
            "details": {
                "primary_concern": result.primary_concern,
                "screenings": {k: v.detected for k, v in result.screenings.items()}
            },
            "findings": enhanced_data["findings"],
            "medical_contacts": enhanced_data["contacts"],
            "next_steps": enhanced_data["next_steps"],
            "disclaimer": enhanced_data["disclaimer"]
        }
        return report_id

    def get_report(self, phone: str) -> Optional[dict]:
        """Retrieve report by phone number (acting as key)"""
        return _patient_reports.get(phone)

report_service = ReportService()

# --- Endpoints ---

@router.get("/report/{phone_key}", response_model=PatientReportResponse)
async def get_patient_report(phone_key: str):
    """
    Retrieve a medical report using the patient's phone number as the key.
    """
    report = report_service.get_report(phone_key)
    
    if not report:
        raise HTTPException(status_code=404, detail="No report found for this number")
        
    return {
        "patient_phone": phone_key,
        "report_id": report["report_id"],
        "risk_level": report["risk_level"],
        "recommendation": report["recommendation"],
        "timestamp": report["timestamp"],
        "card_url": report.get("card_url"),
        "details": report["details"],
        "findings": report.get("findings", []),
        "medical_contacts": report.get("medical_contacts", []),
        "next_steps": report.get("next_steps", []),
        "disclaimer": report.get("disclaimer")
    }
