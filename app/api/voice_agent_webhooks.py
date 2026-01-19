"""
Voice Agent Webhooks
Twilio webhook endpoints for conversational voice agent flow
"""
import logging
import json
from typing import Optional

from fastapi import APIRouter, Form, Request, BackgroundTasks
from fastapi.responses import Response
from twilio.twiml.voice_response import VoiceResponse, Gather, Say

from app.config import settings
from app.utils.twiml_helpers import twiml_response
from app.services.voice_agent_service import (
    get_voice_agent_service,
    ConversationStep,
)
from app.services.twilio_service import get_twilio_service, format_sms_result
from app.services.whatsapp_service import get_whatsapp_service
from app.ml.model_hub import get_model_hub
from app.utils import i18n
from app.utils.i18n import get_language_config
from app.database.database import async_session_maker
from app.database.models import CallRecord, ClassificationResult
from app.api.doctor_portal import doc_service

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory state cache (in production, use Redis)
_call_states: dict[str, dict] = {}
_state_lock = None  # Lazy init to avoid import issues

# Background analysis results cache
_analysis_results: dict[str, dict] = {}  # {call_sid: {"status": "processing|complete|error", "result": ...}}

# Multi-chunk recording storage
_recording_chunks: dict[str, list] = {}  # {call_sid: [chunk1_url, chunk2_url, ...]}}

# Full call recording storage (for Parkinson's/Depression analysis from conversation)
_full_call_recordings: dict[str, str] = {}  # {call_sid: recording_url}

# Constants for call flow control
MAX_NO_INPUT_ATTEMPTS = 5
MAX_RECORDING_ATTEMPTS = 3
MAX_FAMILY_SCREENINGS = 5
MAX_RESULTS_POLL_ATTEMPTS = 15  # Max times to check for results (15 x 5s = ~75s)


def _get_state_lock():
    """Get or create thread lock for state management"""
    global _state_lock
    if _state_lock is None:
        import threading
        _state_lock = threading.Lock()
    return _state_lock


def _get_voice_config(language: str) -> tuple[str, str]:
    """Get Twilio voice and language code for a language"""
    config = get_language_config(language)
    if config:
        return config.twilio_voice, config.twilio_lang
    return "Polly.Aditi", "en-IN"


def _get_call_info(call_sid: str) -> dict:
    """Get call info with defaults"""
    return _call_states.get(call_sid, {})


def _cleanup_call(call_sid: str):
    """Clean up call state, agent state, and recordings"""
    logger.info(f"Cleaning up state for {call_sid}")

    # Clean up agent state
    agent = get_voice_agent_service()
    agent.clear_state(call_sid)

    # Thread-safe removal from call states, analysis results, and recording chunks
    lock = _get_state_lock()
    with lock:
        _call_states.pop(call_sid, None)
        _analysis_results.pop(call_sid, None)
        _recording_chunks.pop(call_sid, None)
        _full_call_recordings.pop(call_sid, None)

    # CRITICAL: Clean up audio files to prevent memory leak
    # Recordings accumulate and fill disk if not deleted
    try:
        import os
        # Clean up main recording
        recording_path = settings.recordings_dir / f"{call_sid}_agent.wav"
        if recording_path.exists():
            os.remove(recording_path)
            logger.info(f"Deleted recording: {recording_path}")

        # Clean up full call recording
        call_recording_path = settings.recordings_dir / f"{call_sid}_conversation.wav"
        if call_recording_path.exists():
            os.remove(call_recording_path)
            logger.debug(f"Deleted conversation recording: {call_recording_path}")

        # Clean up any chunk files
        for i in range(10):  # Check up to 10 chunks
            chunk_path = settings.recordings_dir / f"{call_sid}_chunk{i}.wav"
            if chunk_path.exists():
                os.remove(chunk_path)
                logger.debug(f"Deleted chunk: {chunk_path}")
    except Exception as e:
        logger.warning(f"Failed to delete recording for {call_sid}: {e}")


def _get_encouragement_messages(language: str, chunk_number: int) -> str:
    """
    Get encouraging messages to play between recording chunks.

    These keep the user motivated during multi-chunk recording.

    Args:
        language: Language code (en/hi)
        chunk_number: Which chunk we're on (1, 2, 3...)

    Returns:
        Encouraging message string
    """
    # Select key based on chunk number (1, 2, 3)
    # Map chunk number to i18n key suffix
    key_suffix = min(chunk_number, 3)
    i18n_key = f"va_encouragement_{key_suffix}"
    
    return i18n.get_text(i18n_key, language)


def _get_health_tips(language: str, duration_seconds: int = 10) -> list[str]:
    """
    Get health education messages to play during analysis.

    These keep the user engaged while ML models run in background.
    Messages are timed to fill the expected analysis duration.

    Args:
        language: Language code (en/hi)
        duration_seconds: Target duration in seconds

    Returns:
        List of messages (each ~3-4 seconds when spoken)
    """
    if language == "hi":
        tips = [
            "क्या आप जानते हैं? रोज़ाना गहरी सांस लेने से फेफड़े मज़बूत होते हैं।",
            "अगर खांसी दो हफ्ते से ज़्यादा रहे, तो डॉक्टर को ज़रूर दिखाएं।",
            "टीबी का इलाज मुफ्त और पूरी तरह संभव है। DOTS सेंटर पर जाएं।",
            "धूम्रपान और धुआं से दूर रहें। आपके फेफड़े आपको धन्यवाद देंगे।",
        ]
    else:
        tips = [
            "Did you know? Deep breathing exercises daily can strengthen your lungs.",
            "If your cough lasts more than two weeks, please see a doctor.",
            "TB is completely curable with free treatment available at DOTS centers.",
            "Avoid smoking and smoke exposure. Your lungs will thank you.",
        ]

    # Return subset based on duration (each tip ~3-4 seconds)
    num_tips = min(len(tips), max(2, duration_seconds // 3))
    return tips[:num_tips]


def _get_filler_question(attempt: int, language: str) -> tuple[str, str]:
    """
    Get a conversational filler question to ask while analysis runs.
    
    Returns:
        Tuple of (question_text, question_key) - key is used to store response
    """
    questions = {
        "en": [
            ("While I analyze, let me ask - do you have a fever right now?", "fever"),
            ("Thank you. Are you experiencing any chest pain?", "chest_pain"),
            ("Got it. Do you smoke or are you exposed to smoke regularly?", "smoke"),
            ("Understood. Almost done with your analysis.", "done"),
        ],
        "hi": [
            ("जब मैं जांच कर रहा हूं, बताइए - क्या आपको बुखार है?", "fever"),
            ("धन्यवाद। क्या आपको सीने में दर्द है?", "chest_pain"),
            ("समझ गया। क्या आप धूम्रपान करते हैं या धुएं के संपर्क में रहते हैं?", "smoke"),
            ("समझ गया। आपकी रिपोर्ट लगभग तैयार है।", "done"),
        ]
    }
    
    lang_questions = questions.get(language, questions["en"])
    idx = min(attempt - 1, len(lang_questions) - 1)
    return lang_questions[idx]


@router.post("/start")
async def voice_agent_start(
    request: Request,
    CallSid: str = Form(...),
    From: str = Form(...),
    FromCity: Optional[str] = Form(None),
    FromState: Optional[str] = Form(None),
    FromCountry: Optional[str] = Form(None),
):
    """
    Start a conversational voice agent call.

    This is the entry point for the voice agent flow.
    IMMEDIATELY redirects to language detection - no greeting, no language assumed.
    """
    logger.info(f"Voice agent start: SID={CallSid}, From={From}, Location={FromCity}, {FromState}")

    # Store caller info with tracking counters (thread-safe)
    # Language will be set after user selects it
    lock = _get_state_lock()
    with lock:
        _call_states[CallSid] = {
            "caller_number": From,
            "language": None,  # Not set yet - user will select
            "city": FromCity,
            "state": FromState,
            "country": FromCountry,
            "recording_attempts": 0,
            "family_screenings": 0,
        }

    # Start recording the FULL CALL for Parkinson's/Depression analysis
    # This captures the entire conversation (speech patterns, prosody)
    if settings.enable_parkinsons_screening or settings.enable_depression_screening:
        try:
            # Use Twilio REST API to start recording the entire call
            twilio_service = get_twilio_service()
            recording = twilio_service.client.calls(CallSid).recordings.create(
                recording_status_callback=f"{settings.base_url}/voice-agent/call-recording-complete",
                recording_status_callback_event=["completed"]
            )
            logger.info(f"Full call recording started for {CallSid}: {recording.sid}")
        except Exception as e:
            logger.warning(f"Could not start call recording for {CallSid}: {e}")

    # CRITICAL: Immediately redirect to language detection
    # Do NOT play any greeting, do NOT set up any gather
    # Let the user select their language first
    response = VoiceResponse()
    response.redirect("/voice-agent/language-detection")

    return twiml_response(response)


@router.post("/language-detection")
async def language_detection(
    request: Request,
    CallSid: Optional[str] = Form(None),
    From: Optional[str] = Form(None),
):
    """
    Language detection step: Cycles through all language options.
    Blocks until user presses a button (0-9) to select their language.
    """
    # Robustly get params
    CallSid = CallSid or request.query_params.get("CallSid")
    From = From or request.query_params.get("From")
    query_params = dict(request.query_params)
    attempt = int(query_params.get("attempt", 0))

    logger.info(f"Language detection for {CallSid}, attempt={attempt}")

    if not CallSid:
        logger.error("Missing CallSid in language_detection")
        return Response(status_code=400)

    response = VoiceResponse()

    # NO safety limit - will cycle indefinitely until user presses a button
    # This ensures users are never forced into a language they didn't choose

    # Create Gather that ONLY accepts DTMF (no speech) - forces button press
    # NO timeout - will keep cycling until user presses a button
    gather = Gather(
        input="dtmf",  # Only DTMF, no speech - must press a button
        action=f"/voice-agent/process-language-selection?CallSid={CallSid}",
        num_digits=1,
        # NO timeout parameter - allows continuous cycling
    )

    # Play introduction on first attempt only
    if attempt == 0:
        gather.say(
            "Welcome to the Health Screening Service. Please select your language.",
            voice="Polly.Aditi",
            language="en-IN"
        )
        gather.pause(length=1)

    # Play languages in order with sequential numbering (1-9, 0)
    # Each language is announced in its own language
    language_order = ["en", "hi", "ta", "te", "bn", "mr", "gu", "kn", "ml", "pa"]

    for i, code in enumerate(language_order):
        config = i18n.get_language_config(code)
        if config:
            text = i18n.get_text("language_selection", code)
            gather.say(text, voice=config.twilio_voice, language=config.twilio_lang)
            # Add small pause between languages (except after last one)
            if i < len(language_order) - 1:
                gather.pause(length=0.5)

    response.append(gather)

    # CRITICAL: If no input after all languages, immediately loop back and play again
    # This creates continuous cycling until user presses a button
    # Remove the safety limit - just keep cycling indefinitely
    response.redirect(f"/voice-agent/language-detection?attempt={attempt + 1}")

    return twiml_response(response)


@router.post("/process-language-selection")
async def process_language_selection(
    request: Request,
    CallSid: Optional[str] = Form(None),
    SpeechResult: Optional[str] = Form(None),
    Digits: Optional[str] = Form(None),
    RecordingUrl: Optional[str] = Form(None),
):
    """
    Process language selection from DTMF button press.
    Only DTMF is accepted - ensures user has made a deliberate choice.
    """
    # Robustly get params
    CallSid = CallSid or request.query_params.get("CallSid")
    Digits = Digits or request.query_params.get("Digits")

    logger.info(f"Processing language selection for {CallSid}: Digits='{Digits}'")

    if not CallSid:
        logger.error("Missing CallSid in process_language_selection")
        return Response(status_code=400)

    # CRITICAL: Only accept DTMF digits - no speech, no recording
    # This ensures the user has pressed a button to select their language
    if not Digits:
        logger.warning(f"No digit received for language selection for {CallSid}, redirecting back")
        response = VoiceResponse()
        response.redirect(f"/voice-agent/language-detection?attempt=0")
        return twiml_response(response)

    agent = get_voice_agent_service()

    # Map digit to language code
    # Sequential numbering: 1=English, 2=Hindi, 3=Tamil... 0=Punjabi
    digit_map = {
        "1": "en",
        "2": "hi",
        "3": "ta",
        "4": "te",
        "5": "bn",
        "6": "mr",
        "7": "gu",
        "8": "kn",
        "9": "ml",
        "0": "pa"
    }

    detected_lang = digit_map.get(Digits, "en")
    logger.info(f"Language locked: Digit {Digits} -> {detected_lang}")

    # Lock the language in agent state
    state = agent.get_or_create_state(CallSid)
    state.language = detected_lang

    # Lock the language in call state (thread-safe)
    lock = _get_state_lock()
    with lock:
        if CallSid in _call_states:
            _call_states[CallSid]["language"] = detected_lang
        else:
            # Create call state if it doesn't exist
            _call_states[CallSid] = {
                "caller_number": "unknown",
                "language": detected_lang,
                "recording_attempts": 0,
                "family_screenings": 0,
            }

    # Get voice config for selected language
    voice, lang_code = _get_voice_config(detected_lang)
    response = VoiceResponse()

    # Confirmation message in selected language
    confirm_msg = i18n.get_text("va_greeting", detected_lang)
    response.say(confirm_msg, voice=voice, language=lang_code)

    # Continue to main conversational flow
    gather = Gather(
        input="speech dtmf",
        action=f"/voice-agent/process-speech?lang={detected_lang}&attempt=0",
        timeout=8,
        speech_timeout="auto",
        language=lang_code,
        hints=i18n.get_hints(detected_lang),
    )
    response.append(gather)

    # Fallback if no input in main flow
    response.redirect(f"/voice-agent/no-input?lang={detected_lang}&attempt=1")

    return twiml_response(response)


@router.post("/call-recording-complete")
async def call_recording_complete(
    request: Request,
    CallSid: str = Form(None),
    RecordingSid: str = Form(None),
    RecordingUrl: str = Form(None),
    RecordingStatus: str = Form(None),
    RecordingDuration: int = Form(None),
):
    """
    Callback when full call recording is complete. 
    
    This recording captures the entire conversation for Parkinson's/Depression
    analysis, which works better with natural speech than cough sounds.
    """
    # Handle both query params (from our URL) and form params (from Twilio)
    query_params = dict(request.query_params)
    language = query_params.get("lang", "en")
    
    logger.info(
        f"Full call recording complete: CallSid={CallSid}, "
        f"RecordingSid={RecordingSid}, Duration={RecordingDuration}s, Status={RecordingStatus}"
    )
    
    if RecordingStatus == "completed" and RecordingUrl and CallSid:
        # Store the full call recording URL for later analysis
        lock = _get_state_lock()
        with lock:
            _full_call_recordings[CallSid] = RecordingUrl
        logger.info(f"Stored full call recording URL for {CallSid}")
    
    # Return 200 to acknowledge receipt
    return Response(status_code=200)


@router.post("/process-speech")
async def process_speech(
    request: Request,
    CallSid: str = Form(...),
    From: str = Form(...),
    SpeechResult: Optional[str] = Form(None),
    Digits: Optional[str] = Form(None),
    Confidence: Optional[float] = Form(None),
):
    """
    Process user speech input and generate response.
    """
    query_params = dict(request.query_params)
    language = query_params.get("lang", "en")
    attempt = int(query_params.get("attempt", 0))
    
    # Get user input (speech or DTMF)
    user_input = SpeechResult or ""
    if Digits:
        # Convert DTMF to text
        dtmf_map = {
            "1": "yes",
            "2": "no",
            "9": "asha mode",
            "*": "help",
        }
        user_input = dtmf_map.get(Digits, Digits)
    
    # Check for max turn limit - guide to recording instead of hanging up
    agent = get_voice_agent_service()
    state = agent.get_or_create_state(CallSid)
    max_turns = getattr(settings, 'voice_agent_max_turns', 15)
    if state.turn_count >= max_turns:
        logger.info(f"Max turns reached for {CallSid}, guiding to cough recording")
        voice, lang_code = _get_voice_config(language)
        response = VoiceResponse()
        response.say(
            "Let me help you right away. I'll listen to your cough now." if language == "en"
            else "मैं अभी आपकी मदद करता हूं। मैं आपकी खांसी सुनता हूं।",
            voice=voice,
            language=lang_code
        )
        # Skip to recording instead of hanging up
        state.current_step = ConversationStep.RECORDING
        response.redirect(f"/voice-agent/continue?lang={language}&step=recording")
        return twiml_response(response)
    
    logger.info(f"Voice agent speech: SID={CallSid}, Input='{user_input}', Confidence={Confidence}")
    
    # Process input with voice agent (already initialized above)
    try:
        agent_response = await agent.process_user_input(
            call_sid=CallSid,
            user_input=user_input,
            language=language,
        )
    except Exception as e:
        logger.error(f"Voice agent processing failed for {CallSid}: {type(e).__name__}: {e}", exc_info=True)
        # Fallback response - try to continue gracefully
        voice, lang_code = _get_voice_config(language)
        response = VoiceResponse()
        response.say(
            "I'm sorry, I had trouble understanding. Let me help you with your cough check instead." if language == "en"
            else "माफ़ कीजिए, मुझे समझने में दिक्कत हुई। आइए मैं आपकी खांसी की जांच करता हूं।",
            voice=voice,
            language=lang_code
        )
        # Fallback to recording instead of looping
        response.redirect(f"/voice-agent/continue?lang={language}&step=recording")
        return twiml_response(response)
    
    voice, lang_code = _get_voice_config(language)
    response = VoiceResponse()
    
    # Special handling for recording step - should_record already checks for RECORDING states
    if agent_response.should_record:
        logger.info(f"Transitioning to recording for {CallSid}, step={agent_response.next_step}")
        return await _handle_recording_request(response, CallSid, language, voice, lang_code)
    
    # Special handling for goodbye
    if agent_response.should_end:
        response.say(agent_response.message, voice=voice, language=lang_code)
        response.hangup()
        # Clean up state
        _cleanup_call(CallSid)
        return twiml_response(response)
    
    # Special handling for ASHA handoff - ask for confirmation first
    if agent_response.next_step == ConversationStep.ASHA_HANDOFF:
        response.say(
            "Would you like me to connect you to a health worker? Press 1 or say yes to connect."
            if language == "en" else 
            "क्या आप स्वास्थ्य कार्यकर्ता से बात करना चाहते हैं? जोड़ने के लिए 1 दबाएं या हां कहें।",
            voice=voice, 
            language=lang_code
        )
        gather = Gather(
            input="speech dtmf",
            action=f"/voice-agent/confirm-handoff?lang={language}",
            timeout=8,
            num_digits=1,
            speech_timeout="auto",
            language=lang_code,
            hints=i18n.get_hints(language),
        )
        response.append(gather)
        # If no response, continue with cough recording instead
        response.redirect(f"/voice-agent/continue?lang={language}&step=recording")
        return twiml_response(response)
    
    # Special handling for SAFETY SUPPORT - domestic violence / abuse detection
    if agent_response.next_step == ConversationStep.SAFETY_SUPPORT:
        logger.warning(f"SAFETY TRIGGER for {CallSid} - routing to support services")
        
        # Compassionate, non-judgmental response
        if language == "hi":
            safety_message = (
                "मैं समझती हूं। आप अकेली नहीं हैं और यह आपकी गलती नहीं है। "
                "महिला हेल्पलाइन 181 पर कॉल करें - यह मुफ्त और गोपनीय है। "
                "क्या आप चाहती हैं कि मैं आपको अभी जोड़ दूं? हां के लिए 1 दबाएं।"
            )
        else:
            safety_message = (
                "I understand. You are not alone, and this is not your fault. "
                "The Women Helpline 181 is free and confidential. "
                "Would you like me to connect you now? Press 1 for yes."
            )
        
        response.say(safety_message, voice=voice, language=lang_code)
        
        gather = Gather(
            input="speech dtmf",
            action=f"/voice-agent/confirm-safety-connect?lang={language}",
            timeout=10,
            num_digits=1,
            speech_timeout="auto",
            language=lang_code,
            hints=i18n.get_hints(language),
        )
        response.append(gather)
        
        # If no response, provide the number again and continue
        response.say(
            "Remember, you can always call 181 for help. Take care of yourself."
            if language == "en" else
            "याद रखिए, आप कभी भी 181 पर कॉल कर सकती हैं। अपना ख्याल रखिए।",
            voice=voice,
            language=lang_code
        )
        response.redirect(f"/voice-agent/continue?lang={language}&step=recording")
        return twiml_response(response)
    
    # Normal response - continue conversation
    # response.say(agent_response.message, voice=voice, language=lang_code)
    
    # Use SSML Say if prosody present
    if agent_response.prosody:
        say = Say(voice=voice, language=lang_code)
        say.add_child("prosody", agent_response.message, **agent_response.prosody)
    else:
        say = Say(agent_response.message, voice=voice, language=lang_code)
    response.append(say)
    
    # Gather next input with broader natural conversation hints
    gather = Gather(
        input="speech dtmf",
        action=f"/voice-agent/process-speech?lang={language}&attempt=0",
        timeout=settings.voice_agent_timeout if hasattr(settings, 'voice_agent_timeout') else 8,
        speech_timeout="auto",
        language=lang_code,
        # Broader hints for conversational responses
        hints=i18n.get_hints(language),
    )
    
    response.append(gather)
    
    # Fallback if no input - increment attempt
    response.redirect(f"/voice-agent/no-input?lang={language}&attempt=1")
    
    return twiml_response(response)


async def _handle_recording_request(
    response: VoiceResponse,
    call_sid: str,
    language: str,
    voice: str,
    lang_code: str
) -> Response:
    """Handle the cough recording step with optional multi-chunk encouragement"""

    # Check if chunked recording is enabled
    if getattr(settings, 'enable_chunked_recording', False):
        # Multi-chunk recording with encouragement between chunks
        return await _handle_chunked_recording(response, call_sid, language, voice, lang_code)
    else:
        # Single recording (original behavior)
        return await _handle_single_recording(response, call_sid, language, voice, lang_code)


async def _handle_single_recording(
    response: VoiceResponse,
    call_sid: str,
    language: str,
    voice: str,
    lang_code: str
) -> Response:
    """Handle single continuous recording (original method)"""

    duration = settings.max_recording_duration
    if language == "hi":
        instruction = (
            "बहुत अच्छा! अब मुझे आपकी खांसी सुननी है। "
            "बीप के बाद, अपनी सामान्य खांसी जैसे खांसें। "
            f"लगभग {duration} सेकंड तक खांसते रहें।"
        )
    else:
        instruction = (
            "Perfect! Now I need to hear your cough. "
            "After the beep, cough naturally like you normally do. "
            f"Keep coughing for about {duration} seconds."
        )

    response.say(instruction, voice=voice, language=lang_code)
    response.pause(length=1)

    # Record cough
    response.record(
        max_length=settings.max_recording_duration,
        timeout=3,
        play_beep=True,
        action=f"/voice-agent/recording-complete?lang={language}",
    )

    return twiml_response(response)


async def _handle_chunked_recording(
    response: VoiceResponse,
    call_sid: str,
    language: str,
    voice: str,
    lang_code: str
) -> Response:
    """
    Handle multi-chunk recording with encouragement between chunks.

    This allows us to say things like "Great! Keep going..." between
    recording segments, creating a more engaging experience.
    """

    # Initialize chunk storage if not exists
    lock = _get_state_lock()
    with lock:
        if call_sid not in _recording_chunks:
            _recording_chunks[call_sid] = []

    chunk_duration = getattr(settings, 'recording_chunk_duration', 3)

    if language == "hi":
        instruction = (
            "बहुत अच्छा! अब मुझे आपकी खांसी सुननी है। "
            "बीप के बाद, जोर से खांसें। मैं बीच में आपको प्रोत्साहित करूंगा। शुरू करें!"
        )
    else:
        instruction = (
            "Perfect! Now let me hear your cough. "
            "After the beep, cough loudly. I'll encourage you along the way. Let's begin!"
        )

    response.say(instruction, voice=voice, language=lang_code)
    response.pause(length=1)

    # Start first chunk
    response.record(
        max_length=chunk_duration,
        timeout=2,
        play_beep=True,
        action=f"/voice-agent/recording-chunk-complete?lang={language}&chunk=1",
    )

    return twiml_response(response)


@router.post("/recording-chunk-complete")
async def recording_chunk_complete(
    request: Request,
    CallSid: str = Form(...),
    RecordingUrl: Optional[str] = Form(None),
):
    """
    Handle completion of one recording chunk and transition to next chunk or final processing.
    """
    query_params = dict(request.query_params)
    language = query_params.get("lang", "en")
    chunk_num = int(query_params.get("chunk", 1))

    voice, lang_code = _get_voice_config(language)
    response = VoiceResponse()

    logger.info(f"Chunk {chunk_num} complete for {CallSid}, URL={RecordingUrl}")

    # Store chunk URL
    if RecordingUrl:
        lock = _get_state_lock()
        with lock:
            if CallSid not in _recording_chunks:
                _recording_chunks[CallSid] = []
            _recording_chunks[CallSid].append(RecordingUrl)

    max_chunks = getattr(settings, 'max_recording_chunks', 3)

    if chunk_num >= max_chunks:
        # All chunks done! Proceed to combine and analyze
        logger.info(f"All {max_chunks} chunks recorded for {CallSid}")

        response.say(
            "Perfect! Thank you!" if language == "en" else "बिल्कुल सही! धन्यवाद!",
            voice=voice,
            language=lang_code
        )

        # Instead of immediately analyzing, mark that we need to combine chunks
        # and redirect to the normal recording-complete flow
        response.redirect(f"/voice-agent/combine-and-analyze?lang={language}")
        return twiml_response(response)

    # More chunks needed - give encouragement and continue
    encouragement = _get_encouragement_messages(language, chunk_num)
    response.say(encouragement, voice=voice, language=lang_code)
    response.pause(length=0.5)

    # Record next chunk
    chunk_duration = getattr(settings, 'recording_chunk_duration', 3)
    response.record(
        max_length=chunk_duration,
        timeout=2,
        play_beep=False,  # No beep for subsequent chunks (smoother)
        action=f"/voice-agent/recording-chunk-complete?lang={language}&chunk={chunk_num + 1}",
    )

    return twiml_response(response)


@router.post("/combine-and-analyze")
async def combine_and_analyze(
    background_tasks: BackgroundTasks,
    request: Request,
    CallSid: str = Form(...),
    From: str = Form(...),
):
    """
    Combine multiple recording chunks into one file and start analysis.
    """
    query_params = dict(request.query_params)
    language = query_params.get("lang", "en")

    voice, lang_code = _get_voice_config(language)
    response = VoiceResponse()

    # Get all chunk URLs
    lock = _get_state_lock()
    with lock:
        chunk_urls = _recording_chunks.get(CallSid, [])

    if not chunk_urls:
        logger.error(f"No recording chunks found for {CallSid}")
        response.say(
            "I didn't receive your recording. Let's try again."
            if language == "en" else
            "मुझे आपकी रिकॉर्डिंग नहीं मिली। फिर से कोशिश करते हैं।",
            voice=voice,
            language=lang_code
        )
        response.redirect(f"/voice-agent/continue?lang={language}&step=recording")
        return twiml_response(response)

    logger.info(f"Combining {len(chunk_urls)} chunks for {CallSid}")

    # Start background task to combine chunks and analyze
    with lock:
        _analysis_results[CallSid] = {"status": "processing", "result": None, "error": None}

    background_tasks.add_task(
        _combine_and_analyze_chunks,
        CallSid=CallSid,
        chunk_urls=chunk_urls,
        language=language,
        caller_number=From,
    )

    # While combining/analyzing, share health tips
    response.say(
        "Thank you! Let me analyze your cough while I share some health information."
        if language == "en" else
        "धन्यवाद! मैं आपकी खांसी की जांच करता हूं। इस दौरान कुछ स्वास्थ्य जानकारी देता हूं।",
        voice=voice,
        language=lang_code
    )

    response.pause(length=1)

    # Share health tips during processing
    health_tips = _get_health_tips(language, duration_seconds=10)
    for tip in health_tips:
        response.say(tip, voice=voice, language=lang_code)
        response.pause(length=1)

    # Check results
    response.redirect(f"/voice-agent/check-results?lang={language}&attempt=1")

    return twiml_response(response)


def _combine_and_analyze_chunks(CallSid: str, chunk_urls: list, language: str, caller_number: str = None):
    """
    Background task: Download chunks, combine into one file, and run analysis.
    
    Note: This is a synchronous function because FastAPI background tasks
    run in a ThreadPoolExecutor, not in the async event loop.
    """
    import asyncio
    
    lock = _get_state_lock()

    try:
        logger.info(f"Combining {len(chunk_urls)} chunks for {CallSid}")
        twilio_service = get_twilio_service()

        # Download all chunks
        chunk_files = []
        for i, url in enumerate(chunk_urls):
            chunk_path = settings.recordings_dir / f"{CallSid}_chunk{i}.wav"
            # Run async download synchronously
            asyncio.run(twilio_service.download_recording(url, str(chunk_path)))
            chunk_files.append(chunk_path)
            logger.debug(f"Downloaded chunk {i}: {chunk_path}")

        # Combine chunks using pydub
        try:
            from pydub import AudioSegment

            combined = AudioSegment.empty()
            for chunk_path in chunk_files:
                audio = AudioSegment.from_wav(str(chunk_path))
                combined += audio

        # Export combined file
            final_path = settings.recordings_dir / f"{CallSid}_agent.wav"
            combined.export(str(final_path), format="wav")
            logger.info(f"Combined {len(chunk_files)} chunks into {final_path}")

        except ImportError:
            # Fallback: Use first chunk only if pydub not available
            logger.warning("pydub not available, using first chunk only")
            final_path = chunk_files[0]

        hub = get_model_hub()
        
        # Check if we have a full call recording for Parkinson's/Depression
        conversation_path = None
        with lock:
            full_call_url = _full_call_recordings.get(CallSid)
        
        if full_call_url and (settings.enable_parkinsons_screening or settings.enable_depression_screening):
            try:
                conversation_path = settings.recordings_dir / f"{CallSid}_conversation.wav"
                logger.info(f"Downloading conversation recording for {CallSid}")
                asyncio.run(twilio_service.download_recording(full_call_url, str(conversation_path)))
            except Exception as e:
                logger.warning(f"Could not download conversation recording: {e}")
                conversation_path = None
        
        # DUAL ANALYSIS: Use appropriate audio for each screening type
        if conversation_path and conversation_path.exists():
            logger.info(f"Running DUAL analysis for {CallSid}: cough + conversation")
            
            # Run respiratory/TB on cough audio
            result = hub.run_full_analysis(
                str(final_path),
                enable_respiratory=settings.enable_respiratory_screening,
                enable_parkinsons=False,
                enable_depression=False,
                enable_tuberculosis=settings.enable_tuberculosis_screening,
            )
            
            # Run Parkinson's/Depression on conversation audio
            if settings.enable_parkinsons_screening or settings.enable_depression_screening:
                conversation_result = hub.run_full_analysis(
                    str(conversation_path),
                    enable_respiratory=False,
                    enable_parkinsons=settings.enable_parkinsons_screening,
                    enable_depression=settings.enable_depression_screening,
                    enable_tuberculosis=False,
                )
                
                # Merge neurological screenings
                for name in ["parkinsons", "depression"]:
                    if name in conversation_result.screenings:
                        result.screenings[name] = conversation_result.screenings[name]
                
                result.voice_biomarkers.update(conversation_result.voice_biomarkers)
                
                # Recalculate overall risk
                severity_rank = {"normal": 0, "low": 0, "mild": 1, "moderate": 2, "high": 3, "severe": 3}
                for name in ["parkinsons", "depression"]:
                    if name in result.screenings and result.screenings[name].detected:
                        screening = result.screenings[name]
                        if severity_rank.get(screening.severity, 0) > severity_rank.get(result.overall_risk_level, 0):
                            result.overall_risk_level = screening.severity
                            result.primary_concern = screening.disease
                        if screening.recommendation and screening.recommendation not in result.recommendation:
                            result.recommendation += " " + screening.recommendation
        else:
            # Fallback: Use cough recording for all analyses
            result = hub.run_full_analysis(
                str(final_path),
                enable_respiratory=settings.enable_respiratory_screening,
                enable_parkinsons=settings.enable_parkinsons_screening,
                enable_depression=settings.enable_depression_screening,
                enable_tuberculosis=settings.enable_tuberculosis_screening,
            )
        
        logger.info(f"Analysis complete for {CallSid}: risk={result.overall_risk_level}, time={result.processing_time_ms}ms")

        # Store results
        with lock:
            _analysis_results[CallSid] = {
                "status": "complete",
                "result": result,
                "error": None,
                "recording_url": chunk_urls[0] if chunk_urls else "",  # Store first chunk URL
            }
        
        # Finalize analysis (Save DB + Send Report)
        # We run this in the background task to ensure it happens even if call drops
        _finalize_analysis(CallSid, result, language, caller_number)

    except Exception as e:
        logger.error(f"Chunk combination/analysis failed for {CallSid}: {e}", exc_info=True)
        with lock:
            _analysis_results[CallSid] = {
                "status": "error",
                "result": None,
                "error": str(e),
            }


@router.post("/recording-complete")
async def recording_complete(
    background_tasks: BackgroundTasks,
    request: Request,
    CallSid: str = Form(...),
    From: str = Form(...),
    RecordingUrl: Optional[str] = Form(None),
):
    """
    Handle completed cough recording.
    Analyze and provide conversational results.
    """
    query_params = dict(request.query_params)
    language = query_params.get("lang", "en")
    
    logger.info(f"Voice agent recording complete: SID={CallSid}")
    
    voice, lang_code = _get_voice_config(language)
    response = VoiceResponse()
    
    if not RecordingUrl:
        # Track recording attempts to prevent infinite loops (thread-safe)
        lock = _get_state_lock()
        with lock:
            call_info = _call_states.get(CallSid, {})
            recording_attempts = call_info.get("recording_attempts", 0) + 1

        if recording_attempts >= MAX_RECORDING_ATTEMPTS:
            logger.warning(f"Max recording attempts ({MAX_RECORDING_ATTEMPTS}) reached for {CallSid}")
            response.say(
                "I'm having trouble hearing your cough. Please try calling back later. Goodbye!"
                if language == "en" else
                "मुझे आपकी खांसी सुनने में दिक्कत हो रही है। कृपया बाद में फिर से कॉल करें। अलविदा!",
                voice=voice,
                language=lang_code
            )
            response.hangup()
            _cleanup_call(CallSid)
            return twiml_response(response)

        # Update attempt counter (thread-safe)
        with lock:
            if CallSid in _call_states:
                _call_states[CallSid]["recording_attempts"] = recording_attempts

        logger.info(f"No recording received, attempt {recording_attempts}/{MAX_RECORDING_ATTEMPTS}")
        response.say(
            "I didn't hear anything. Let me try again." if language == "en"
            else "मुझे कुछ सुनाई नहीं दिया। मैं फिर से कोशिश करता हूं।",
            voice=voice,
            language=lang_code
        )
        response.redirect(f"/voice-agent/continue?lang={language}&step=recording")
        return twiml_response(response)
    
    # Thank you message immediately after recording
    response.say(
        "Thank you!" if language == "en" else "धन्यवाद!",
        voice=voice,
        language=lang_code
    )
    
    response.pause(length=1)

    # Start background analysis immediately
    # This allows us to talk to the user while processing happens
    logger.info(f"Starting background analysis for {CallSid}, RecordingUrl={RecordingUrl}")

    # Mark analysis as processing
    lock = _get_state_lock()
    with lock:
        _analysis_results[CallSid] = {"status": "processing", "result": None, "error": None}

    # Start analysis in background task
    background_tasks.add_task(
        _run_background_analysis,
        CallSid=CallSid,
        RecordingUrl=RecordingUrl,
        language=language,
        caller_number=From,
    )

    # UX IMPROVEMENT: Keep talking while analysis runs!
    # Instead of awkward silence, provide health education
    response.say(
        "Thank you! Let me analyze your cough while I share some health information with you."
        if language == "en" else
        "धन्यवाद! मैं आपकी खांसी की जांच करता हूं। इस दौरान मैं आपको कुछ स्वास्थ्य जानकारी देता हूं।",
        voice=voice,
        language=lang_code
    )

    response.pause(length=1)

    # Share health tips to fill ~10 seconds while analysis runs
    health_tips = _get_health_tips(language, duration_seconds=10)
    for tip in health_tips:
        response.say(tip, voice=voice, language=lang_code)
        response.pause(length=1)

    # By now, analysis should be complete or nearly complete
    # Redirect to check results
    response.redirect(f"/voice-agent/check-results?lang={language}&attempt=1")

    return twiml_response(response)


def _run_background_analysis(CallSid: str, RecordingUrl: str, language: str, caller_number: str = None):
    """
    Run ML analysis in background while user hears health tips.

    DUAL AUDIO ANALYSIS:
    - Cough recording → Respiratory + TB screening (designed for cough sounds)
    - Full call recording → Parkinson's + Depression (better with natural speech)

    This decouples analysis from TwiML response, enabling better UX.
    Results are stored in _analysis_results for retrieval.
    
    Note: This is a synchronous function because FastAPI background tasks
    run in a ThreadPoolExecutor, not in the async event loop.
    """
    import asyncio
    
    lock = _get_state_lock()

    try:
        logger.info(f"Background analysis starting for {CallSid}")
        twilio_service = get_twilio_service()
        
        # Download COUGH recording for respiratory/TB analysis
        cough_path = settings.recordings_dir / f"{CallSid}_agent.wav"
        logger.debug(f"Downloading cough recording to {cough_path}")
        asyncio.run(twilio_service.download_recording(RecordingUrl, str(cough_path)))

        hub = get_model_hub()
        
        # Check if we have a full call recording for Parkinson's/Depression
        conversation_path = None
        with lock:
            full_call_url = _full_call_recordings.get(CallSid)
        
        if full_call_url and (settings.enable_parkinsons_screening or settings.enable_depression_screening):
            try:
                conversation_path = settings.recordings_dir / f"{CallSid}_conversation.wav"
                logger.info(f"Downloading conversation recording for {CallSid}")
                asyncio.run(twilio_service.download_recording(full_call_url, str(conversation_path)))
                logger.info(f"Conversation recording downloaded: {conversation_path}")
            except Exception as e:
                logger.warning(f"Could not download conversation recording: {e}")
                conversation_path = None
        
        # DUAL ANALYSIS: Use appropriate audio for each screening type
        if conversation_path and conversation_path.exists():
            logger.info(f"Running DUAL analysis for {CallSid}: cough + conversation")
            
            # Run respiratory/TB on cough audio
            result = hub.run_full_analysis(
                str(cough_path),
                enable_respiratory=settings.enable_respiratory_screening,
                enable_parkinsons=False,  # Will run on conversation audio
                enable_depression=False,   # Will run on conversation audio
                enable_tuberculosis=settings.enable_tuberculosis_screening,
            )
            
            # Run Parkinson's/Depression on conversation audio (better accuracy)
            if settings.enable_parkinsons_screening or settings.enable_depression_screening:
                conversation_result = hub.run_full_analysis(
                    str(conversation_path),
                    enable_respiratory=False,
                    enable_parkinsons=settings.enable_parkinsons_screening,
                    enable_depression=settings.enable_depression_screening,
                    enable_tuberculosis=False,
                )
                
                # Merge neurological screenings into main result
                if "parkinsons" in conversation_result.screenings:
                    result.screenings["parkinsons"] = conversation_result.screenings["parkinsons"]
                    logger.info(f"Parkinson's screening from conversation: {result.screenings['parkinsons'].detected}")
                
                if "depression" in conversation_result.screenings:
                    result.screenings["depression"] = conversation_result.screenings["depression"]
                    logger.info(f"Depression screening from conversation: {result.screenings['depression'].detected}")
                
                # Merge voice biomarkers
                result.voice_biomarkers.update(conversation_result.voice_biomarkers)
                
                # Recalculate overall risk and recommendation
                # Check if neurological screenings are more severe
                severity_rank = {"normal": 0, "low": 0, "mild": 1, "moderate": 2, "high": 3, "severe": 3}
                
                for name in ["parkinsons", "depression"]:
                    if name in result.screenings and result.screenings[name].detected:
                        screening = result.screenings[name]
                        if severity_rank.get(screening.severity, 0) > severity_rank.get(result.overall_risk_level, 0):
                            result.overall_risk_level = screening.severity
                            result.primary_concern = screening.disease
                        if screening.recommendation and screening.recommendation not in result.recommendation:
                            result.recommendation += " " + screening.recommendation
        else:
            # Fallback: Use cough recording for all analyses
            logger.info(f"Running single-source analysis for {CallSid} (no conversation recording)")
            result = hub.run_full_analysis(
                str(cough_path),
                enable_respiratory=settings.enable_respiratory_screening,
                enable_parkinsons=settings.enable_parkinsons_screening,
                enable_depression=settings.enable_depression_screening,
                enable_tuberculosis=settings.enable_tuberculosis_screening,
            )
        
        logger.info(f"Analysis complete for {CallSid}: risk={result.overall_risk_level}, time={result.processing_time_ms}ms")

        # Store results with RecordingUrl for database
        with lock:
            _analysis_results[CallSid] = {
                "status": "complete",
                "result": result,
                "error": None,
                "recording_url": RecordingUrl,  # Save for database
            }
        
        # Finalize analysis (Save DB + Send Report)
        _finalize_analysis(CallSid, result, language, caller_number)

    except Exception as e:
        logger.error(f"Background analysis failed for {CallSid}: {type(e).__name__}: {e}", exc_info=True)
        with lock:
            _analysis_results[CallSid] = {
                "status": "error",
                "result": None,
                "error": str(e),
            }


from app.api.patient_portal import report_service

async def _send_report(caller_number: str, result, language: str):
    """
    Save report to Patient Portal and optionally send via WhatsApp if enabled.
    Allows user to view results online using their phone number as a key.
    """
    try:
        # Always save to Patient Portal
        report_id = report_service.save_report(caller_number, result, language)
        logger.info(f"Report saved for {caller_number}. Access Key: {caller_number}")
        
        # Send WhatsApp report if enabled
        if settings.enable_whatsapp_reports:
            try:
                whatsapp_service = get_whatsapp_service()
                success = whatsapp_service.send_health_card(
                    to=caller_number,
                    result=result,
                    language=language
                )
                if success:
                    logger.info(f"WhatsApp report sent to {caller_number}")
                else:
                    logger.warning(f"Failed to send WhatsApp report to {caller_number}")
            except Exception as e:
                logger.error(f"Error sending WhatsApp report to {caller_number}: {e}")
        
    except Exception as e:
        logger.error(f"Failed to save report: {e}")


@router.post("/family-decision")
async def family_decision(
    request: Request,
    CallSid: str = Form(...),
    SpeechResult: Optional[str] = Form(None),
    Digits: Optional[str] = Form(None),
):
    """Handle decision to screen another family member"""
    query_params = dict(request.query_params)
    language = query_params.get("lang", "en")
    
    user_input = (SpeechResult or "").lower()
    voice, lang_code = _get_voice_config(language)
    
    response = VoiceResponse()
    
    # Check for yes response
    yes_indicators = ["yes", "1", "haan", "हां", "one", "ek"]
    if Digits == "1" or any(ind in user_input for ind in yes_indicators):
        # Check family screening limit (thread-safe)
        lock = _get_state_lock()
        with lock:
            call_info = _call_states.get(CallSid, {})
            family_count = call_info.get("family_screenings", 0) + 1

        if family_count >= MAX_FAMILY_SCREENINGS:
            logger.info(f"Max family screenings ({MAX_FAMILY_SCREENINGS}) reached for {CallSid}")
            response.say(
                f"You've screened {MAX_FAMILY_SCREENINGS} people today. That's wonderful! Please call back tomorrow if you need to check more family members. Take care!"
                if language == "en" else
                f"आपने आज {MAX_FAMILY_SCREENINGS} लोगों की जांच की है। बहुत अच्छा! अगर और परिवार के सदस्यों की जांच करनी हो तो कल फिर कॉल करें। ख्याल रखें!",
                voice=voice,
                language=lang_code
            )
            response.redirect(f"/voice-agent/goodbye?lang={language}")
            return twiml_response(response)

        # Update family screening counter (thread-safe)
        with lock:
            if CallSid in _call_states:
                _call_states[CallSid]["family_screenings"] = family_count
                _call_states[CallSid]["recording_attempts"] = 0  # Reset recording attempts

        # Reset for next family member
        agent = get_voice_agent_service()
        state = agent.get_state(CallSid)
        if state:
            state.current_step = ConversationStep.RECORDING_INTRO
            state.turn_count = 0
        
        response.say(
            "Okay, let's check them too. Please hand the phone to them."
            if language == "en" else
            "ठीक है, उनकी भी जांच करते हैं। कृपया फोन उन्हें दें।",
            voice=voice,
            language=lang_code
        )
        
        response.pause(length=2)
        
        # Go to recording for next person
        response.redirect(f"/voice-agent/continue?lang={language}&step=recording")
    else:
        # End call
        response.redirect(f"/voice-agent/goodbye?lang={language}")
    
    return twiml_response(response)


@router.post("/confirm-handoff")
async def confirm_handoff(
    request: Request,
    CallSid: str = Form(...),
    SpeechResult: Optional[str] = Form(None),
    Digits: Optional[str] = Form(None),
):
    """Handle confirmation for doctor/ASHA handoff"""
    query_params = dict(request.query_params)
    language = query_params.get("lang", "en")
    
    user_input = (SpeechResult or "").lower()
    voice, lang_code = _get_voice_config(language)
    
    response = VoiceResponse()
    
    # Check for yes response
    yes_indicators = ["yes", "1", "haan", "हां", "one", "ek", "doctor", "connect"]
    if Digits == "1" or any(ind in user_input for ind in yes_indicators):
        response.say(
            "Connecting you to a health worker now. Please hold."
            if language == "en" else
            "आपको अभी स्वास्थ्य कार्यकर्ता से जोड़ रहा हूं। कृपया रुकें।",
            voice=voice,
            language=lang_code
        )
        # Redirect to ASHA menu
        response.redirect(f"{settings.base_url}/india/voice/asha/menu")
    else:
        # User said no - continue with cough check
        response.say(
            "No problem! Let's continue with your health check."
            if language == "en" else
            "कोई बात नहीं! आइए आपकी सेहत जांच जारी रखें।",
            voice=voice,
            language=lang_code
        )
        response.redirect(f"/voice-agent/continue?lang={language}&step=recording")
    
    return twiml_response(response)


@router.post("/confirm-safety-connect")
async def confirm_safety_connect(
    request: Request,
    CallSid: str = Form(...),
    SpeechResult: Optional[str] = Form(None),
    Digits: Optional[str] = Form(None),
):
    """Handle confirmation for connecting to Women Helpline (181) for domestic violence support"""
    query_params = dict(request.query_params)
    language = query_params.get("lang", "en")
    
    user_input = (SpeechResult or "").lower()
    voice, lang_code = _get_voice_config(language)
    
    response = VoiceResponse()
    
    # Check for yes response
    yes_indicators = ["yes", "1", "haan", "हां", "one", "ek", "connect", "help"]
    if Digits == "1" or any(ind in user_input for ind in yes_indicators):
        logger.info(f"Connecting {CallSid} to Women Helpline 181")
        response.say(
            "Connecting you to the Women Helpline now. Stay safe."
            if language == "en" else
            "आपको महिला हेल्पलाइन से जोड़ रही हूं। सुरक्षित रहें।",
            voice=voice,
            language=lang_code
        )
        # Dial the Women Helpline
        response.dial(settings.women_helpline_number)
    else:
        # User said no - provide number and continue
        response.say(
            "That's okay. Remember, you can dial 181 anytime for free confidential help. Let's continue."
            if language == "en" else
            "ठीक है। याद रखिए, आप कभी भी 181 पर मुफ्त गोपनीय मदद के लिए कॉल कर सकती हैं। चलिए आगे बढ़ते हैं।",
            voice=voice,
            language=lang_code
        )
        response.redirect(f"/voice-agent/continue?lang={language}&step=recording")
    
    return twiml_response(response)


@router.post("/continue")
async def continue_conversation(
    request: Request,
    CallSid: str = Form(...),
):
    """Continue the conversation from a specific step"""
    query_params = dict(request.query_params)
    language = query_params.get("lang", "en")
    step = query_params.get("step", "greeting")
    
    voice, lang_code = _get_voice_config(language)
    response = VoiceResponse()
    
    if step == "recording":
        return await _handle_recording_request(response, CallSid, language, voice, lang_code)
    
    # Default: continue with conversation
    gather = Gather(
        input="speech dtmf",
        action=f"/voice-agent/process-speech?lang={language}&attempt=0",
        timeout=10,
        speech_timeout="auto",
        language=lang_code,
    )
    
    gather.say(
        "Please continue." if language == "en" else "कृपया जारी रखें।",
        voice=voice,
        language=lang_code
    )
    
    response.append(gather)
    response.redirect(f"/voice-agent/no-input?lang={language}&attempt=1")

    return twiml_response(response)


@router.post("/no-input")
async def handle_no_input(
    request: Request,
    CallSid: str = Form(...),
):
    """Handle case when user doesn't provide input - warm, conversational fallback"""
    query_params = dict(request.query_params)
    language = query_params.get("lang", "en")
    attempt = int(query_params.get("attempt", 1))
    
    voice, lang_code = _get_voice_config(language)
    response = VoiceResponse()
    
    logger.info(f"No-input handler: SID={CallSid}, attempt={attempt}, language={language}")

    # Safety: Prevent infinite loops by capping at max attempts
    max_attempts = getattr(settings, 'max_no_input_attempts', MAX_NO_INPUT_ATTEMPTS)
    if attempt >= max_attempts:
        logger.warning(f"Max no-input attempts reached for {CallSid}, ending call")
        response.say(
            "No worries! Call back anytime you need help. Take care!"
            if language == "en" else
            "कोई बात नहीं! जब भी मदद चाहिए, फिर कॉल करें। ख्याल रखें!",
            voice=voice,
            language=lang_code
        )
        response.hangup()
        _cleanup_call(CallSid)
        return twiml_response(response)

    if attempt >= 3:
        # After 3 attempts, guide to cough recording naturally
        response.say(
            "Let me just check your cough quickly. Cough after the beep!"
            if language == "en" else
            "चलिए बस जल्दी से खांसी चेक कर लेते हैं। बीप के बाद खांसें!",
            voice=voice,
            language=lang_code
        )
        response.redirect(f"/voice-agent/continue?lang={language}&step=recording")
        return twiml_response(response)
    
    # Warm, varied prompts based on attempt
    prompts = {
        "en": [
            "Are you there? Just say hello or tell me how you're feeling.",
            "I'm here to help! You can tell me about any health concerns.",
        ],
        "hi": [
            "क्या आप वहां हैं? बस हैलो बोलिए या बताइए कैसा लग रहा है।",
            "मैं मदद के लिए हूं! कोई भी सेहत की बात बताइए।",
        ]
    }
    
    lang_prompts = prompts.get(language, prompts["en"])
    prompt = lang_prompts[min(attempt - 1, len(lang_prompts) - 1)]
    
    response.say(prompt, voice=voice, language=lang_code)
    
    # Gather with natural hints
    gather = Gather(
        input="speech dtmf",
        action=f"/voice-agent/process-speech?lang={language}&attempt={attempt}",
        timeout=6,
        speech_timeout="auto",
        language=lang_code,
        hints="hello, hi, yes, no, okay, cough, khansi, help, haan, nahi, theek",
    )
    
    response.append(gather)
    response.redirect(f"/voice-agent/no-input?lang={language}&attempt={attempt + 1}")
    
    return twiml_response(response)


@router.post("/check-results")
async def check_results(
    request: Request,
    CallSid: str = Form(...),
    From: str = Form(...),
):
    """
    Check if background analysis is complete and present results.

    If still processing, say "almost ready" and poll again.
    This creates a smooth UX without awkward silence.
    """
    query_params = dict(request.query_params)
    language = query_params.get("lang", "en")
    attempt = int(query_params.get("attempt", 1))

    voice, lang_code = _get_voice_config(language)
    response = VoiceResponse()

    # Check analysis status
    lock = _get_state_lock()
    with lock:
        analysis_data = _analysis_results.get(CallSid, {})

    status = analysis_data.get("status", "unknown")
    logger.info(f"Check results for {CallSid}: status={status}, attempt={attempt}")

    if status == "complete":
        # Analysis done! Present results
        result = analysis_data.get("result")

        if not result:
            logger.error(f"Analysis marked complete but no result for {CallSid}")
            response.say(
                "I had trouble processing your results. Please try again."
                if language == "en" else
                "परिणाम की प्रक्रिया में दिक्कत हुई। कृपया फिर से कोशिश करें।",
                voice=voice,
                language=lang_code
            )
            response.redirect(f"/voice-agent/goodbye?lang={language}")
            return twiml_response(response)

        # Handle timeout case
        if result.primary_concern == "timeout":
            response.say(
                "The analysis took longer than expected. We will send the results to your phone via SMS. Thank you."
                if language == "en" else
                "विश्लेषण में अपेक्षा से अधिक समय लगा। हम आपको एसएमएस के माध्यम से परिणाम भेज देंगे। धन्यवाद।",
                voice=voice,
                language=lang_code
            )
            response.hangup()
            _cleanup_call(CallSid)
            return twiml_response(response)

        # Present results (reusing existing logic)
        try:
            return await _present_results(response, CallSid, From, result, language, voice, lang_code)
        except Exception as e:
            logger.error(f"Error presenting results for {CallSid}: {e}", exc_info=True)
            response.say(
                "I have your results, but I'm having trouble reading them. Please wait a moment."
                if language == "en" else 
                "मेरे पास आपके परिणाम हैं, लेकिन उन्हें पढ़ने में समस्या हो रही है। कृपया प्रतीक्षा करें।",
                voice=voice,
                language=lang_code
            )
            # Fallback: simple result reading
            response.say(result.recommendation, voice=voice, language=lang_code)
            return twiml_response(response)

    elif status == "error":
        # Analysis failed
        error = analysis_data.get("error", "Unknown error")
        logger.error(f"Analysis error for {CallSid}: {error}")

        error_msg_lower = str(error).lower()
        if "download" in error_msg_lower or "url" in error_msg_lower:
            response.say(
                "I couldn't access your recording. Please try calling again later."
                if language == "en" else
                "मैं रिकॉर्डिंग तक नहीं पहुंच सका। कृपया बाद में फिर से कॉल करें।",
                voice=voice,
                language=lang_code
            )
            response.hangup()
        else:
            response.say(
                "I had trouble analyzing your cough. Please try calling back later."
                if language == "en" else
                "खांसी की जांच में दिक्कत हुई। कृपया बाद में फिर से कॉल करें।",
                voice=voice,
                language=lang_code
            )
            response.hangup()
        
        _cleanup_call(CallSid)

        return twiml_response(response)

    else:
        # Still processing - engage user with conversational questions
        if attempt >= MAX_RESULTS_POLL_ATTEMPTS:
            # Taking too long, apologize and retry
            logger.warning(f"Analysis timeout for {CallSid} after {attempt} poll attempts")
            response.say(
                "The analysis is taking a bit longer than usual. I will send the results to your phone via SMS/WhatsApp. Thank you for your patience."
                if language == "en" else
                "विश्लेषण में थोड़ा समय लग रहा है। मैं परिणाम आपको एसएमएस या व्हाट्सएप द्वारा भेज दूंगा। धैर्य के लिए धन्यवाद।",
                voice=voice,
                language=lang_code
            )
            response.hangup()
            _cleanup_call(CallSid)
            return twiml_response(response)

        # Get a conversational filler question
        question_text, question_key = _get_filler_question(attempt, language)
        
        if question_key == "done":
            # Final attempt - just say almost done and check again
            response.say(question_text, voice=voice, language=lang_code)
            response.pause(length=2)
            response.redirect(f"/voice-agent/check-results?lang={language}&attempt={attempt + 1}")
        else:
            # Ask a question and gather response
            gather = Gather(
                input="speech dtmf",
                action=f"/voice-agent/filler-response?lang={language}&attempt={attempt}&key={question_key}",
                timeout=5,
                speech_timeout="auto",
                language=lang_code,
                hints="yes, no, haan, nahi, 1, 2",
            )
            gather.say(question_text, voice=voice, language=lang_code)
            response.append(gather)
            # If no input, just continue checking
            response.redirect(f"/voice-agent/check-results?lang={language}&attempt={attempt + 1}")
        
        return twiml_response(response)


async def _present_results(response, CallSid, From, result, language, voice, lang_code):
    """Present analysis results to user (extracted for reuse)"""
    try:
        # Get agent state for personalized response
        agent = get_voice_agent_service()
        state = agent.get_state(CallSid)

        # Generate personalized results message
        if state and hasattr(state, 'collected_info'):
            results_message = agent.get_results_message(
                state,
                result.overall_risk_level,
                result.recommendation,
            )
            state.current_step = ConversationStep.RESULTS
        else:
            # Fallback if state not found
            results_message = f"Your health check is complete. {result.recommendation}"

        response.say(results_message, voice=voice, language=lang_code)

        # Offer family screening
        response.pause(length=1)

        gather = Gather(
            input="speech dtmf",
            action=f"/voice-agent/family-decision?lang={language}",
            timeout=8,
            num_digits=1,
            speech_timeout="auto",
            language=lang_code,
        )

        gather.say(
            "Is there anyone else in your family who has a cough? Say yes or press 1 to check them too."
            if language == "en" else
            "क्या आपके परिवार में कोई और खांस रहा है? हां कहें या 1 दबाएं उनकी जांच के लिए।",
            voice=voice,
            language=lang_code
        )

        response.append(gather)

        # Default to goodbye if no response
        response.redirect(f"/voice-agent/goodbye?lang={language}")

        return twiml_response(response)

    except Exception as e:
        logger.error(f"Fatal error in _present_results for {CallSid}: {e}", exc_info=True)
        # Fallback response
        if response is None:
            response = VoiceResponse()
        
        # If response already has content, we might be appending to partially built response
        # But for catastrophic error, maybe clearer to just say error?
        # Typically TwiML is sequential.
        
        response.say(
            "I'm sorry, something went wrong. Please visit a doctor if you are feeling unwell."
            if language == "en" else
            "माफ़ कीजिए, कुछ गड़बड़ हो गई। यदि आप अस्वस्थ महसूस कर रहे हैं तो कृपया डॉक्टर से मिलें।",
            voice=voice,
            language=lang_code
        )
        return twiml_response(response)


@router.post("/filler-response")
async def filler_response(
    request: Request,
    CallSid: str = Form(...),
    SpeechResult: Optional[str] = Form(None),
    Digits: Optional[str] = Form(None),
):
    """
    Handle user's response to filler questions asked during analysis.
    Acknowledge their answer and continue checking for results.
    """
    query_params = dict(request.query_params)
    language = query_params.get("lang", "en")
    attempt = int(query_params.get("attempt", 1))
    question_key = query_params.get("key", "unknown")
    
    voice, lang_code = _get_voice_config(language)
    response = VoiceResponse()
    
    # Parse user response
    user_input = (SpeechResult or "").lower()
    is_yes = Digits == "1" or any(w in user_input for w in ["yes", "haan", "हां", "yeah"])
    is_no = Digits == "2" or any(w in user_input for w in ["no", "nahi", "नहीं", "nope"])
    
    # Store the answer in call state for later use
    lock = _get_state_lock()
    with lock:
        if CallSid in _call_states:
            if "symptom_responses" not in _call_states[CallSid]:
                _call_states[CallSid]["symptom_responses"] = {}
            _call_states[CallSid]["symptom_responses"][question_key] = "yes" if is_yes else ("no" if is_no else user_input)
    
    logger.info(f"Filler response for {CallSid}: key={question_key}, yes={is_yes}, no={is_no}")
    
    # Brief acknowledgment (conversational, not robotic)
    if is_yes:
        ack = "I understand, thank you for telling me." if language == "en" else "समझ गया, बताने के लिए धन्यवाद।"
    elif is_no:
        ack = "Good to know, thank you." if language == "en" else "अच्छा है, धन्यवाद।"
    else:
        ack = "Got it." if language == "en" else "समझ गया।"
    
    response.say(ack, voice=voice, language=lang_code)
    
    # Continue checking results (increment attempt)
    response.redirect(f"/voice-agent/check-results?lang={language}&attempt={attempt + 1}")
    
    return twiml_response(response)


@router.post("/goodbye")
async def goodbye(
    request: Request,
    CallSid: str = Form(...),
):
    """End the call with a warm goodbye"""
    query_params = dict(request.query_params)
    language = query_params.get("lang", "en")

    voice, lang_code = _get_voice_config(language)

    response = VoiceResponse()

    response.say(
        "Thank you for calling! Take care of yourself and stay healthy. Goodbye!"
        if language == "en" else
        "कॉल करने के लिए धन्यवाद! अपना ख्याल रखें और स्वस्थ रहें। अलविदा!",
        voice=voice,
        language=lang_code
    )

    response.hangup()

    # Clean up state
    _cleanup_call(CallSid)

    return twiml_response(response)


def _finalize_analysis(CallSid: str, result, language: str, caller_number_arg: str = None):
    """
    Finalize analysis: Save to DB and send WhatsApp/SMS report.
    This runs synchronously in the background task thread.
    """
    import asyncio
    
    lock = _get_state_lock()
    with lock:
        call_info = _call_states.get(CallSid, {})
        analysis_data = _analysis_results.get(CallSid, {})
        
        # Check for duplicate processing
        if analysis_data.get("finalized"):
            return
        analysis_data["finalized"] = True

    # Use argument if available, else fallback to state
    caller_number = caller_number_arg or call_info.get("caller_number", "")
    
    if not caller_number:
        logger.warning(f"No caller number for {CallSid}, cannot send report")
        return

    recording_url = analysis_data.get("recording_url", "")
    
    async def _async_finalize():
        # 1. Save to DB
        try:
            async with async_session_maker() as db:
                call_record = CallRecord(
                    call_sid=CallSid,
                    caller_number=caller_number,
                    language=language,
                    call_status="completed",
                    recording_url=recording_url,
                    city=call_info.get("city"),
                    state=call_info.get("state"),
                    country=call_info.get("country")
                )
                db.add(call_record)
                await db.flush()

                classification_str = result.primary_concern if result.primary_concern != "none" else "Normal"

                class_result = ClassificationResult(
                    call_id=call_record.id,
                    classification=classification_str,
                    confidence=0.85 if result.overall_risk_level in ["high", "urgent"] else 0.95,
                    severity=result.overall_risk_level,
                    recommendation=result.recommendation,
                    processing_time_ms=result.processing_time_ms
                )
                db.add(class_result)
                await db.commit()
                logger.info(f"Saved DB record for {CallSid}")
                
                # --- SYNC TO DOCTOR PORTAL ---
                if result.overall_risk_level in ["high", "severe", "urgent", "moderate"]:
                    doc_service.add_real_call_referral(
                        call_data={
                            "caller_number": call_info.get("caller_number", caller_number),
                            "city": call_info.get("city", "Delhi"), # Fallback for demo
                            "state": call_info.get("state", "Delhi")
                        },
                        risk_level=result.overall_risk_level,
                        condition=result.primary_concern
                    )
                # -----------------------------

        except Exception as e:
            logger.error(f"DB save failed for {CallSid}: {e}")

        # 2. Send Report
        await _send_report(caller_number, result, language)

    # Run async logic
    try:
        asyncio.run(_async_finalize())
    except Exception as e:
        logger.error(f"Finalization failed for {CallSid}: {e}")
