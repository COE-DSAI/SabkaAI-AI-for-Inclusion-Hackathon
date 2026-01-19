"""
Safety call router - API endpoints for safety call feature.
"""

from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List
import json
import logging
import asyncio

from database import get_db
from models import User
from auth import get_current_user
from config import settings
from services.safety_call import safety_call_manager
from services.twilio_voice_call import twilio_voice_service
from services.vonage_voice_call import vonage_voice_service
from repositories import SafetyCallRepository
from schemas.safety_call import (
    StartCallRequest,
    StartCallResponse,
    TranscriptEvent,
    EndCallResponse,
    CallHistoryItem,
    CallStatsResponse
)
import base64
import traceback
import websockets as ws_lib

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/safety-call", tags=["Safety Call"])


@router.post("/start", response_model=StartCallResponse)
async def start_safety_call(
    request: StartCallRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a new safety call session.
    Returns connection details for Azure Realtime WebSocket.
    """
    # Check if safety call feature is enabled
    if not settings.safety_call_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Safety call feature is currently disabled"
        )

    try:
        result = await safety_call_manager.create_session(
            user_id=current_user.id,
            user_name=current_user.name,
            location=request.location
        )

        return StartCallResponse(
            session_id=result["session_id"],
            connection=result["connection"],
            system_instructions=result["system_instructions"]
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start safety call: {str(e)}"
        )


@router.post("/transcript")
async def handle_transcript(
    event: TranscriptEvent,
    current_user: User = Depends(get_current_user)
):
    """
    Handle transcript from frontend for distress detection.
    Frontend sends this whenever user speaks.
    """
    try:
        # Check if session has exceeded max duration
        exceeded = await safety_call_manager.check_session_duration(event.session_id)
        if exceeded:
            return {
                "status": "session_terminated",
                "reason": f"Call exceeded maximum duration of {settings.safety_call_max_duration_minutes} minutes"
            }

        result = await safety_call_manager.handle_transcript(
            session_id=event.session_id,
            transcript=event.transcript,
            speaker=event.speaker
        )

        if result:
            return {
                "status": "distress_detected",
                "distress_info": result
            }

        return {"status": "processed"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process transcript: {str(e)}"
        )


@router.post("/end/{session_id}", response_model=EndCallResponse)
async def end_safety_call(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """End active safety call session."""
    try:
        summary = await safety_call_manager.end_session(session_id)

        if not summary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        return EndCallResponse(
            session_id=summary["session_id"],
            duration_seconds=summary["duration_seconds"],
            distress_detected=summary["distress_detected"],
            alerts_triggered=summary["alerts_triggered"]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end call: {str(e)}"
        )


@router.get("/history", response_model=List[CallHistoryItem])
async def get_call_history(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's safety call history."""
    try:
        repo = SafetyCallRepository(db)
        sessions = repo.get_user_sessions(
            user_id=current_user.id,
            limit=limit,
            offset=offset
        )

        return [
            CallHistoryItem(
                id=s.id,
                session_id=s.session_id,
                start_time=s.start_time,
                end_time=s.end_time,
                duration_seconds=s.duration_seconds,
                distress_detected=s.distress_detected,
                distress_keywords=s.distress_keywords or [],
                alert_triggered=s.alert_triggered
            )
            for s in sessions
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get call history: {str(e)}"
        )


@router.get("/stats", response_model=CallStatsResponse)
async def get_call_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's safety call statistics."""
    try:
        repo = SafetyCallRepository(db)
        stats = repo.get_user_stats(current_user.id)

        return CallStatsResponse(**stats)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get stats: {str(e)}"
        )


@router.get("/active")
async def get_active_sessions(
    current_user: User = Depends(get_current_user)
):
    """Get count of active safety call sessions."""
    return {
        "active_sessions": safety_call_manager.get_active_session_count()
    }


# ========================================
# Twilio Voice Call Endpoints
# ========================================

@router.post("/voice/initiate")
async def initiate_voice_call(
    current_user: User = Depends(get_current_user),
    location: dict = None
):
    """
    Initiate an outbound AI-powered safety call to user's phone via Twilio.

    This triggers a real phone call to the user where they can talk to an AI
    safety companion that monitors for distress and triggers alerts if needed.
    """
    if not settings.safety_call_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Safety call feature is currently disabled"
        )

    if not current_user.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User phone number not set. Please update your profile."
        )

    try:
        result = await twilio_voice_service.initiate_safety_call(
            user_id=current_user.id,
            user_name=current_user.name,
            user_phone=current_user.phone,
            location=location
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to initiate call")
            )

        return {
            "success": True,
            "call_sid": result["call_sid"],
            "status": result["status"],
            "test_mode": result.get("test_mode", False),
            "message": "Safety call initiated. You will receive a call shortly."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating voice call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate call: {str(e)}"
        )


@router.post("/voice/end/{call_sid}")
async def end_voice_call(
    call_sid: str,
    current_user: User = Depends(get_current_user)
):
    """End an active Twilio voice call."""
    try:
        summary = await twilio_voice_service.end_call(call_sid)

        if not summary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )

        return {
            "success": True,
            "call_sid": summary["call_sid"],
            "duration_seconds": summary["duration_seconds"],
            "status": summary["status"],
            "transcripts_count": len(summary["transcripts"]),
            "alerts_triggered": len(summary["alerts_triggered"])
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending voice call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end call: {str(e)}"
        )


@router.get("/voice/active")
async def get_active_voice_calls(
    current_user: User = Depends(get_current_user)
):
    """Get count of active Twilio voice calls."""
    return {
        "active_calls": twilio_voice_service.get_active_call_count()
    }


@router.post("/twiml")
async def twiml_handler(request: Request):
    """
    TwiML handler for Twilio Voice calls.

    This endpoint returns TwiML instructions when Twilio calls connect.
    It sets up the Media Streams connection for real-time audio.
    """
    # Generate TwiML that connects to Media Streams
    twiml = twilio_voice_service.generate_twiml_for_stream()

    return Response(content=twiml, media_type="application/xml")


@router.post("/twiml/status")
async def twiml_status_callback(request: Request):
    """
    Status callback handler for Twilio Voice calls.

    Twilio sends status updates (initiated, ringing, answered, completed) here.
    """
    try:
        form_data = await request.form()
        call_sid = form_data.get("CallSid")
        call_status = form_data.get("CallStatus")

        logger.info(f"Call {call_sid} status: {call_status}")

        # Update call session status
        session = twilio_voice_service.get_active_call(call_sid)
        if session:
            session.status = call_status

            # If call completed/failed, clean up
            if call_status in ["completed", "failed", "busy", "no-answer"]:
                await twilio_voice_service.end_call(call_sid)

        return {"status": "received"}

    except Exception as e:
        logger.error(f"Error in TwiML status callback: {e}")
        return {"status": "error", "message": str(e)}


@router.websocket("/media-stream")
async def media_stream_handler(websocket: WebSocket):
    """
    WebSocket handler for Twilio Media Streams.

    This receives real-time audio from the phone call and sends AI responses back.

    Flow:
    1. Twilio connects via WebSocket after call is answered
    2. User audio comes in as μ-law base64 encoded chunks
    3. We send audio to AI provider (Deepgram → LLM → ElevenLabs)
    4. AI audio responses go back to Twilio as μ-law base64
    5. User hears AI speaking on the phone
    """
    await websocket.accept()

    call_sid = None
    stream_sid = None

    try:
        logger.info("Media stream WebSocket connected")

        async for message in websocket.iter_text():
            try:
                data = json.loads(message)
                event = data.get("event")

                if event == "start":
                    # Stream started - extract call details
                    start_data = data.get("start", {})
                    call_sid = start_data.get("callSid")
                    stream_sid = start_data.get("streamSid")

                    logger.info(f"Media stream started: call={call_sid}, stream={stream_sid}")

                    # Set WebSocket on session for sending AI audio back
                    session = twilio_voice_service.get_active_call(call_sid)
                    if session:
                        session.set_websocket(websocket)

                    # Notify service
                    await twilio_voice_service.handle_media_stream_event(call_sid, data)

                elif event == "media":
                    # Incoming audio from user
                    if call_sid:
                        await twilio_voice_service.handle_media_stream_event(call_sid, data)

                elif event == "stop":
                    # Stream stopped
                    logger.info(f"Media stream stopped: call={call_sid}")
                    if call_sid:
                        await twilio_voice_service.handle_media_stream_event(call_sid, data)
                    break

            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in media stream: {e}")
            except Exception as e:
                logger.error(f"Error processing media stream message: {e}")

    except WebSocketDisconnect:
        logger.info(f"Media stream WebSocket disconnected: call={call_sid}")
    except Exception as e:
        logger.error(f"Media stream WebSocket error: {e}")
    finally:
        # Clean up
        if call_sid:
            await twilio_voice_service.end_call(call_sid)


# ========================================
# Vonage Voice Call Endpoints
# ========================================

@router.post("/vonage/initiate")
async def initiate_vonage_call(
    current_user: User = Depends(get_current_user),
    location: dict = None
):
    """
    Initiate an outbound AI-powered safety call via Vonage Voice API.
    Uses native 16kHz PCM audio - no codec conversion needed!
    Better audio quality than Twilio.
    """
    if not settings.safety_call_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Safety call feature is currently disabled"
        )

    if not current_user.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User phone number not set. Please update your profile."
        )

    try:
        result = await vonage_voice_service.initiate_safety_call(
            user_id=current_user.id,
            user_name=current_user.name,
            user_phone=current_user.phone,
            location=location
        )

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to initiate call")
            )

        return {
            "success": True,
            "call_uuid": result["call_uuid"],
            "status": result["status"],
            "test_mode": result.get("test_mode", False),
            "message": "Safety call initiated via Vonage. You will receive a call shortly."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating Vonage call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate call: {str(e)}"
        )


@router.post("/vonage/test-initiate")
async def test_initiate_vonage_call(
    location: dict = None
):
    """
    Test endpoint for Vonage call initiation (no auth required).
    Always runs in test mode for testing purposes.
    """
    # Hardcoded test values for testing
    test_user_id = "1"
    test_user_name = "Test User"
    test_user_phone = "919056690327"  # The phone number from your test script

    try:
        # Force test mode on
        original_test_mode = vonage_voice_service.test_mode
        vonage_voice_service.test_mode = True

        result = await vonage_voice_service.initiate_safety_call(
            user_id=test_user_id,
            user_name=test_user_name,
            user_phone=test_user_phone,
            location=location
        )

        # Restore original test mode
        vonage_voice_service.test_mode = original_test_mode

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get("error", "Failed to initiate call")
            )

        return {
            "success": True,
            "call_uuid": result["call_uuid"],
            "status": result["status"],
            "test_mode": result.get("test_mode", False),
            "message": "Test call initiated (simulated). WebSocket will connect shortly."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating test Vonage call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate test call: {str(e)}"
        )


@router.post("/vonage/end/{call_uuid}")
async def end_vonage_call(
    call_uuid: str,
    current_user: User = Depends(get_current_user)
):
    """End an active Vonage voice call."""
    try:
        summary = await vonage_voice_service.end_call(call_uuid)

        if not summary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )

        return {
            "success": True,
            "call_uuid": summary["call_uuid"],
            "duration_seconds": summary["duration_seconds"],
            "status": summary["status"],
            "transcripts_count": len(summary["transcripts"]),
            "alerts_triggered": len(summary["alerts_triggered"])
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending Vonage call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end call: {str(e)}"
        )


@router.get("/vonage/active")
async def get_active_vonage_calls(
    current_user: User = Depends(get_current_user)
):
    """Get count of active Vonage voice calls."""
    return {
        "active_calls": vonage_voice_service.get_active_call_count()
    }


@router.post("/vonage-status")
async def vonage_status_callback(request: Request):
    """
    Status callback from Vonage Voice API.

    Vonage sends call status updates here.
    """
    try:
        data = await request.json()
        call_uuid = data.get("uuid")
        status = data.get("status")

        logger.info(f"Vonage call {call_uuid} status: {status}")

        # Update call session status
        session = vonage_voice_service.get_active_call(call_uuid)
        if session:
            session.status = status

            # If call ended, clean up
            if status in ["completed", "failed", "rejected", "timeout", "cancelled"]:
                await vonage_voice_service.end_call(call_uuid)

        return {"status": "received"}

    except Exception as e:
        logger.error(f"Error in Vonage status callback: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/vonage-events")
async def vonage_events_callback(request: Request):
    """
    Event callback from Vonage Voice WebSocket connection.

    Receives events about WebSocket connection state.
    """
    try:
        data = await request.json()
        logger.info(f"Vonage WebSocket event: {data}")
        return {"status": "received"}

    except Exception as e:
        logger.error(f"Error in Vonage events callback: {e}")
        return {"status": "error", "message": str(e)}


@router.websocket("/vonage-stream")
async def vonage_stream_handler(websocket: WebSocket):
    """
    WebSocket handler for Vonage Voice audio streaming.

    Receives 16kHz Linear PCM audio directly from Vonage - NO conversion needed!

    Flow:
    1. User speaks → Vonage → WebSocket → 16kHz PCM audio
    2. Backend → Deepgram STT → Text
    3. Backend → MegaLLM → AI response text
    4. Backend → ElevenLabs TTS → 16kHz PCM audio
    5. Backend → WebSocket → Vonage → User hears AI
    """
    await websocket.accept()

    call_uuid = None
    session = None

    try:
        logger.info("Vonage stream WebSocket connected")

        # Get call info from first message
        # Vonage sends metadata in different formats - let's debug what we receive
        first_message = await websocket.receive_text()
        logger.info(f"Vonage raw first message: {first_message}")

        try:
            data = json.loads(first_message)
            logger.info(f"Vonage parsed message: {type(data)} - {data}")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            logger.info(f"Message length: {len(first_message)}")
            logger.info(f"Message preview: {first_message[:200]}...")
            await websocket.close(code=1003, reason="Invalid JSON format")
            return

        # Try different ways to find the call UUID
        call_uuid = None

        # Method 1: Direct uuid field
        if "uuid" in data:
            call_uuid = data["uuid"]
            logger.info(f"Found UUID in top-level: {call_uuid}")

        # Method 2: Try nested structure
        elif "data" in data and "uuid" in data["data"]:
            call_uuid = data["data"]["uuid"]
            logger.info(f"Found UUID in data.uuid: {call_uuid}")

        # Method 3: Try other field names
        elif "call_uuid" in data:
            call_uuid = data["call_uuid"]
            logger.info(f"Found call_uuid field: {call_uuid}")

        # Method 4: Try conversation_uuid
        elif "conversation_uuid" in data:
            call_uuid = data["conversation_uuid"]
            logger.info(f"Found conversation_uuid: {call_uuid}")

        # In Vonage WebSocket, user info is at top level (not in headers)
        user_id = data.get("user_id")
        user_name = data.get("user_name")
        user_phone = data.get("user_phone")

        logger.info(f"Vonage stream parsed: call={call_uuid}, user={user_name}, phone={user_phone}")
        logger.info(f"Available message keys: {list(data.keys())}")

        # Since Vonage doesn't send call UUID in WebSocket message,
        # we need to find the active session by phone number
        session = None
        call_uuid = None

        if user_phone:
            # Find the active call for this phone number
            for uuid, sess in vonage_voice_service.active_calls.items():
                if sess.user_phone == user_phone:
                    session = sess
                    call_uuid = uuid
                    logger.info(f"Found session for phone {user_phone}: call_uuid={call_uuid}")
                    break

        if not session:
            logger.error(f"No active session found for phone {user_phone}. Active calls: {list(vonage_voice_service.active_calls.keys())}")
            await websocket.close(code=1008, reason="Session not found")
            return

        if session:
            session.set_websocket(websocket)

            # Initialize Azure OpenAI Realtime API for this call
            try:
                import aiohttp

                logger.info(f"Initializing Azure OpenAI Realtime connection for call {call_uuid}")

                # WebSocket URL for Azure OpenAI Realtime API with API key in query params
                websocket_url = f"{settings.azure_openai_realtime_endpoint}?api-version=2024-10-01-preview&deployment={settings.azure_openai_realtime_deployment}&api-key={settings.azure_openai_realtime_api_key}"

                # Connect using aiohttp which supports headers properly
                aiohttp_session = aiohttp.ClientSession()
                session.aiohttp_session = aiohttp_session  # Store for cleanup
                session.azure_websocket = await aiohttp_session.ws_connect(
                    websocket_url,
                    headers={"api-key": settings.azure_openai_realtime_api_key}
                )

                # Configure session for audio processing
                session_config = {
                    "type": "session.update",
                    "session": {
                        "modalities": ["text", "audio"],
                        "instructions": "You are a helpful AI safety assistant. Respond briefly and clearly.",
                        "voice": "alloy",
                        "input_audio_format": "pcm16",
                        "output_audio_format": "pcm16",
                        "input_audio_transcription": {
                            "model": "whisper-1"
                        },
                        "turn_detection": {
                            "type": "server_vad",
                            "threshold": 0.5,
                            "prefix_padding_ms": 300,
                            "silence_duration_ms": 500
                        }
                    }
                }

                await session.azure_websocket.send_str(json.dumps(session_config))
                logger.info(f"Azure OpenAI connection established for call {call_uuid}")

                # Start background task to listen for Azure responses
                asyncio.create_task(azure_response_handler(call_uuid, session, websocket))

            except Exception as e:
                logger.error(f"Failed to start Azure OpenAI for call {call_uuid}: {e}")
                
                traceback.print_exc()

        # Process audio from Vonage
        while True:
            try:
                message = await websocket.receive()

                if "text" in message:
                    event_data = json.loads(message["text"])
                    if event_data.get("event") == "stop":
                        break

                elif "bytes" in message and hasattr(session, 'azure_websocket'):
                    
                    audio_msg = {
                        "type": "input_audio_buffer.append",
                        "audio": base64.b64encode(message["bytes"]).decode()
                    }
                    await session.azure_websocket.send_str(json.dumps(audio_msg))

            except Exception as e:
                logger.error(f"Message error: {e}")
                break

    except WebSocketDisconnect:
        logger.info(f"Vonage disconnected: {call_uuid}")
    except Exception as e:
        logger.error(f"Vonage stream error: {e}")
    finally:
        if call_uuid and session:
            if hasattr(session, 'azure_websocket') and session.azure_websocket:
                try:
                    await session.azure_websocket.close()
                except:
                    pass
            await vonage_voice_service.end_call(call_uuid)


async def azure_response_handler(call_uuid: str, session, vonage_websocket):
    """Handle responses from Azure OpenAI and send audio back to Vonage"""
    try:
        import aiohttp

        logger.info(f"Started Azure response handler for call {call_uuid}")

        # aiohttp WebSocket uses async iteration
        async for msg in session.azure_websocket:
            if msg.type == aiohttp.WSMsgType.TEXT:
                data = json.loads(msg.data)

                # Handle audio response from Azure
                if data.get("type") == "response.audio.delta":
                    audio_delta = data.get("delta")
                    if audio_delta:
                        audio_bytes = base64.b64decode(audio_delta)
                        await vonage_websocket.send_bytes(audio_bytes)
                        logger.debug(f"Sent {len(audio_bytes)} bytes to Vonage")

                # Handle user transcription
                elif data.get("type") == "conversation.item.input_audio_transcription.completed":
                    transcript = data.get("transcript")
                    if transcript:
                        logger.info(f"User said: {transcript}")

                # Handle AI response text
                elif data.get("type") == "response.audio_transcript.delta":
                    text_delta = data.get("delta")
                    if text_delta:
                        logger.info(f"AI: {text_delta}")

                # Handle response done
                elif data.get("type") == "response.done":
                    logger.info(f"Response complete")

                # Handle errors
                elif data.get("type") == "error":
                    logger.error(f"Azure error: {data.get('error')}")

            elif msg.type == aiohttp.WSMsgType.ERROR:
                logger.error(f"Azure WebSocket error")
                break

    except Exception as e:
        logger.error(f"Error in Azure response handler: {e}")
        import traceback
        traceback.print_exc()


@router.websocket("/vonage-stream-v2")
async def vonage_stream_handler_v2(websocket: WebSocket):
    """
    WebSocket handler for Vonage Voice audio streaming with Azure OpenAI.
    """
    await websocket.accept()

    call_uuid = None
    session = None

    try:
        logger.info("Vonage stream WebSocket connected")

        # Get call info from first message
        first_message = await websocket.receive_text()
        logger.info(f"Vonage raw first message: {first_message}")

        data = json.loads(first_message)

        # Extract user info
        user_phone = data.get("user_phone")

        # Find the active session by phone number
        if user_phone:
            for uuid, sess in vonage_voice_service.active_calls.items():
                if sess.user_phone == user_phone:
                    session = sess
                    call_uuid = uuid
                    logger.info(f"Found session: {call_uuid}")
                    break

        if not session:
            logger.error(f"No session found for phone {user_phone}")
            await websocket.close(code=1008, reason="Session not found")
            return

        session.set_websocket(websocket)

        # Initialize Azure OpenAI
        try:

            websocket_url = f"{settings.azure_openai_realtime_endpoint}?api-version=2024-10-01-preview&deployment={settings.azure_openai_realtime_deployment}"

            session.azure_websocket = await ws_lib.connect(
                websocket_url,
                extra_headers={"api-key": settings.azure_openai_realtime_api_key}
            )

            session_config = {
                "type": "session.update",
                "session": {
                    "modalities": ["text", "audio"],
                    "instructions": "You are a helpful AI safety assistant.",
                    "voice": "alloy",
                    "input_audio_format": "pcm16",
                    "output_audio_format": "pcm16"
                }
            }
            await session.azure_websocket.send_str(json.dumps(session_config))
            logger.info(f"Azure connected for call {call_uuid}")

            # Start background task for Azure responses
            asyncio.create_task(azure_response_handler(call_uuid, session, websocket))

        except Exception as e:
            logger.error(f"Azure connection failed: {e}")

        # Process audio from Vonage
        while True:
            try:
                message = await websocket.receive()

                if "text" in message:
                    event_data = json.loads(message["text"])
                    if event_data.get("event") == "stop":
                        break

                elif "bytes" in message and hasattr(session, 'azure_websocket'):
                    audio_msg = {
                        "type": "input_audio_buffer.append",
                        "audio": base64.b64encode(message["bytes"]).decode()
                    }
                    await session.azure_websocket.send_str(json.dumps(audio_msg))

            except Exception as e:
                logger.error(f"Message error: {e}")
                break

    except WebSocketDisconnect:
        logger.info(f"Vonage disconnected: {call_uuid}")
    except Exception as e:
        logger.error(f"Vonage stream error: {e}")
    finally:
        if call_uuid and session:
            if hasattr(session, 'azure_websocket') and session.azure_websocket:
                try:
                    await session.azure_websocket.close()
                except:
                    pass
            await vonage_voice_service.end_call(call_uuid)
