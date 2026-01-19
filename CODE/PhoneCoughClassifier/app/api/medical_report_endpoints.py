from fastapi import APIRouter

router = APIRouter()

@router.get("/medical-reports")
async def get_medical_reports():
    return {"status": "ok"}