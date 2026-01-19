"""
Seed initial doctor data for the demo.
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.database import async_session_maker, init_db
from app.database.models import Doctor

async def seed():
    await init_db()
    
    async with async_session_maker() as db:
        # Check if doctors exist
        # If not, add them
        
        doctors = [
            Doctor(
                name="Dr. Priya Sharma",
                specialty="Pulmonologist",
                phone_number="+919876543210",
                city="Delhi",
                state="Delhi",
                login_key="DOC-PRIYA-123"
            ),
            Doctor(
                name="Dr. Rajesh Koothrappali",
                specialty="General Practitioner",
                phone_number="+919876543211",
                city="Mumbai",
                state="Maharashtra",
                login_key="DOC-RAJ-456"
            ),
             Doctor(
                name="Dr. Ayesha Khan",
                specialty="Respiratory Specialist",
                phone_number="+919876543212",
                city="Bangalore",
                state="Karnataka",
                login_key="DOC-AYESHA-789"
            )
        ]
        
        for doc in doctors:
            print(f"Adding {doc.name} (Key: {doc.login_key})...")
            db.add(doc)
            
        await db.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(seed())
