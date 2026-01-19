from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# --- Schemas ---
class DoctorLoginRequest(BaseModel):
    login_key: str

class DoctorLoginResponse(BaseModel):
    id: str
    name: str
    city: str

class Referral(BaseModel):
    id: int
    patient_phone: str
    risk_level: str
    condition: str
    timestamp: str
    distance_km: float

# --- In-Memory Service (No SQL) ---
class DoctorService:
    def __init__(self):
        # Doctors mapped by STATE/REGION they serve
        self.doctors = {
            "DOC-PRIYA": {"id": "1", "name": "Priya Sharma", "city": "Delhi", "state": "Delhi"},
            "DOC-RAJ": {"id": "2", "name": "Rajesh Koothrappali", "city": "Mumbai", "state": "Maharashtra"},
            "DOC-AYESHA": {"id": "3", "name": "Ayesha Khan", "city": "Bangalore", "state": "Karnataka"}
        }
        
        # Empty list - will be populated by REAL Twilio calls
        self.referrals = []

    def get_doctor(self, key: str):
        return self.doctors.get(key)

    def get_referrals_for_doctor(self, doctor_id: str):
        """
        Smart Routing: Return patients in the same STATE as the doctor.
        """
        # Find doctor details first
        doc = next((d for d in self.doctors.values() if d["id"] == doctor_id), None)
        if not doc:
            return []

        results = []
        for r in self.referrals:
            # GEOLOCATION MATCHING LOGIC:
            # Match if patient's state matches doctor's state
            if r.get("state") == doc["state"]:
                results.append(Referral(
                    id=r["id"],
                    patient_phone=r["phone"],
                    risk_level=r["risk"],
                    condition=r["cond"],
                    timestamp=datetime.now().strftime("%H:%M"),
                    distance_km=2.4 if r["risk"] == "urgent" else 12.5 # Mock distance
                ))
        return results

    def add_real_call_referral(self, call_data: dict, risk_level: str, condition: str):
        """
        Ingest REAL Twilio calls into the doctor dashboard
        """
        new_ref = {
            "id": int(datetime.now().timestamp()),
            "phone": call_data.get("caller_number", "Unknown"),
            "risk": risk_level,
            "cond": condition,
            "city": call_data.get("city", "Unknown"),
            "state": call_data.get("state", "Delhi") # Default to Delhi if Twilio lookup fails
        }
        self.referrals.insert(0, new_ref) # Add to top
        # Keep list size manageable
        if len(self.referrals) > 50:
            self.referrals.pop()

doc_service = DoctorService()

# --- Endpoints ---

@router.post("/login", response_model=DoctorLoginResponse)
async def doctor_login(login: DoctorLoginRequest):
    doctor = doc_service.get_doctor(login.login_key)
    if not doctor:
        raise HTTPException(status_code=401, detail="Invalid access key")
    return {
        "id": doctor["id"], # Return ID, not key
        "name": doctor["name"],
        "city": doctor["city"]
    }

@router.get("/referrals/{doc_id}", response_model=List[Referral])
async def get_referrals(doc_id: str):
    return doc_service.get_referrals_for_doctor(doc_id)