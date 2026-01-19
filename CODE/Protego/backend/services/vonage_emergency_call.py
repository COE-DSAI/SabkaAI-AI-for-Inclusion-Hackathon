"""
Vonage Emergency Voice Call Service

Sends pre-recorded emergency voice calls to emergency contacts
when an alert is triggered.
"""

import logging
import httpx
import jwt
import time
import uuid
from pathlib import Path
from typing import Dict, List
from config import settings

logger = logging.getLogger(__name__)


class VonageEmergencyCallService:
    """Service for sending emergency voice calls via Vonage."""

    def __init__(self):
        """Initialize Vonage Emergency Call client."""
        self.test_mode = settings.test_mode

        # Vonage API configuration
        self.api_key = settings.vonage_api_key
        self.api_secret = settings.vonage_api_secret
        self.application_id = settings.vonage_application_id
        self.private_key_path = settings.vonage_private_key_path
        self.vonage_number = settings.vonage_number

        # HTTP client for Vonage API
        self.http_client = httpx.AsyncClient(timeout=30.0)

        logger.info(f"Vonage Emergency Call service initialized (test_mode={self.test_mode})")
        logger.info(f"Vonage config: API_KEY={self.api_key[:4]}..., APP_ID={self.application_id}, NUMBER={self.vonage_number}")

    def _generate_jwt(self) -> str:
        """
        Generate JWT token for Vonage API authentication.

        Returns:
            JWT token string
        """
        try:
            # Read private key
            private_key = Path(self.private_key_path).read_text()

            # JWT payload
            now = int(time.time())
            payload = {
                "application_id": self.application_id,
                "iat": now,
                "exp": now + 300,  # 5 minutes expiry
                "jti": str(uuid.uuid4())
            }

            # Generate JWT
            token = jwt.encode(
                payload,
                private_key,
                algorithm="RS256"
            )

            return token

        except Exception as e:
            logger.error(f"Failed to generate JWT: {e}")
            raise

    async def send_emergency_call(
        self,
        to_phone: str,
        user_name: str,
        location_url: str
    ) -> Dict:
        """
        Send emergency voice call to a contact.

        Args:
            to_phone: Contact's phone number (E.164 format: +919056690327)
            user_name: Name of the person in danger
            location_url: Google Maps URL for location

        Returns:
            Dict with success status and call details
        """
        logger.info(f"[VONAGE] Initiating emergency call to {to_phone} for {user_name}")

        if self.test_mode:
            logger.info(f"[TEST MODE] Emergency call to {to_phone} for {user_name} - SIMULATED")
            return {
                "success": True,
                "call_uuid": f"test-emergency-{uuid.uuid4().hex[:16]}",
                "status": "completed",
                "test_mode": True,
                "message": "Test mode: Emergency call simulated"
            }

        try:
            # Generate JWT for authentication
            jwt_token = self._generate_jwt()

            # Build emergency message
            message = (
                f"This is an urgent message from Protego Safety App. "
                f"{user_name} has triggered an emergency alert and needs your help immediately. "
                f"Their current location has been sent to you on WhatsApp with a map link. "
                f"Please check your WhatsApp messages and contact them right away. "
                f"This is not a test. Please respond immediately."
            )

            # NCCO (Nexmo Call Control Objects) - defines call flow
            # Repeat the message twice for urgency
            ncco = [
                {
                    "action": "talk",
                    "text": message,
                    "voiceName": "Aditi",  # Indian English female voice
                    "volume": 2  # Default volume
                },
                {
                    "action": "talk",
                    "text": "I repeat. " + message,
                    "voiceName": "Aditi",
                    "volume": 2
                }
            ]

            # Make API call to initiate call
            response = await self.http_client.post(
                "https://api.nexmo.com/v1/calls",
                headers={
                    "Authorization": f"Bearer {jwt_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "to": [
                        {
                            "type": "phone",
                            "number": to_phone
                        }
                    ],
                    "from": {
                        "type": "phone",
                        "number": self.vonage_number
                    },
                    "ncco": ncco
                }
            )

            response.raise_for_status()
            result = response.json()

            call_uuid = result["uuid"]
            logger.info(f"Emergency call initiated to {to_phone}. UUID: {call_uuid}")

            return {
                "success": True,
                "call_uuid": call_uuid,
                "status": result.get("status"),
                "to_phone": to_phone,
                "user_name": user_name
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"Vonage API error: {e.response.status_code} - {e.response.text}")
            return {
                "success": False,
                "error": f"Vonage API error: {e.response.text}",
                "to_phone": to_phone
            }
        except Exception as e:
            logger.error(f"Unexpected error sending emergency call: {e}")
            return {
                "success": False,
                "error": str(e),
                "to_phone": to_phone
            }

    async def send_emergency_calls_to_contacts(
        self,
        contact_phones: List[str],
        user_name: str,
        location_url: str
    ) -> Dict:
        """
        Send emergency calls to multiple contacts.

        Args:
            contact_phones: List of contact phone numbers
            user_name: Name of the person in danger
            location_url: Google Maps URL for location

        Returns:
            Dict with results for all contacts
        """
        results = []
        success_count = 0

        for phone in contact_phones:
            result = await self.send_emergency_call(phone, user_name, location_url)
            results.append(result)
            if result.get("success"):
                success_count += 1

        return {
            "success": success_count > 0,
            "total_contacts": len(contact_phones),
            "successful_calls": success_count,
            "results": results
        }

    async def cleanup(self):
        """Cleanup service resources."""
        await self.http_client.aclose()


# Global service instance
vonage_emergency_service = VonageEmergencyCallService()
