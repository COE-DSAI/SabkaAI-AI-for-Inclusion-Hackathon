"""
Voice Agent Service
Conversational AI agent for personalized health screening interactions
"""
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum
import random

from openai import OpenAI

from app.config import settings
from app.services.rag_service import get_rag_service
from app.utils.i18n import get_text

logger = logging.getLogger(__name__)


class ConversationStep(str, Enum):
    """Steps in the conversation flow"""
    GREETING = "greeting"
    LANGUAGE = "language"
    OCCUPATION = "occupation"
    SYMPTOMS = "symptoms"
    RAPPORT_BUILDING = "rapport_building"
    PESTICIDE_CHECK = "pesticide_check"
    DUST_CHECK = "dust_check"
    RECORDING_INTRO = "recording_intro"
    RECORDING = "recording"
    PROCESSING = "processing"
    RESULTS = "results"
    FAMILY_OFFER = "family_offer"
    ASHA_HANDOFF = "asha_handoff"
    SAFETY_SUPPORT = "safety_support"  # Domestic violence / abuse support
    GOODBYE = "goodbye"


@dataclass
class ConversationState:
    """State of an ongoing conversation"""
    call_sid: str
    language: str = "en"
    current_step: ConversationStep = ConversationStep.GREETING
    collected_info: dict = field(default_factory=dict)
    message_history: list = field(default_factory=list)
    turn_count: int = 0
    
    def to_dict(self) -> dict:
        """Serialize state for storage"""
        return {
            "call_sid": self.call_sid,
            "language": self.language,
            "current_step": self.current_step.value,
            "collected_info": self.collected_info,
            "message_history": self.message_history[-10:],  # Keep last 10 messages
            "turn_count": self.turn_count,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "ConversationState":
        """Deserialize state from storage"""
        return cls(
            call_sid=data["call_sid"],
            language=data.get("language", "en"),
            current_step=ConversationStep(data.get("current_step", "greeting")),
            collected_info=data.get("collected_info", {}),
            message_history=data.get("message_history", []),
            turn_count=data.get("turn_count", 0),
        )


@dataclass
class AgentResponse:
    """Response from the voice agent"""
    message: str  # Text to speak
    next_step: ConversationStep  # Next conversation step
    should_record: bool = False  # Whether to start recording
    should_end: bool = False  # Whether to end the call
    should_record: bool = False  # Whether to start recording
    should_end: bool = False  # Whether to end the call
    gathered_info: dict = field(default_factory=dict)  # Info extracted from user input
    prosody: Optional[dict] = None  # SSML prosody parameters (pitch, rate)


class VoiceAgentService:
    """
    Conversational voice agent for health screening.
    Uses OpenAI for natural language understanding and generation.
    """
    
    def __init__(self):
        self._client: Optional[OpenAI] = None
        self._conversations: dict[str, ConversationState] = {}
        self._response_cache: dict[str, str] = {}  # Cache for common responses
        self._cache_max_size = 50
        self._executor = ThreadPoolExecutor(max_workers=10)  # For concurrent OpenAI calls
    
    @property
    def client(self) -> OpenAI:
        """Lazy load OpenAI client"""
        if self._client is None:
            if not settings.openai_api_key:
                # If no key, return a dummy client or raise clearer error
                # For now assume mostly mocked or provided
                raise ValueError("OPENAI_API_KEY not configured")
            self._client = OpenAI(api_key=settings.openai_api_key)
        return self._client

    def get_or_create_state(self, call_sid: str) -> ConversationState:
        """Get existing conversation state or create new one"""
        if call_sid not in self._conversations:
            self._conversations[call_sid] = ConversationState(call_sid=call_sid)
        return self._conversations[call_sid]
    
    def get_state(self, call_sid: str) -> Optional[ConversationState]:
        """Get existing conversation state"""
        return self._conversations.get(call_sid)
    
    def clear_state(self, call_sid: str) -> None:
        """Clear conversation state after call ends"""
        self._conversations.pop(call_sid, None)
    
    async def detect_language_from_audio(self, audio_url: str) -> str:
        """
        Detect language from audio URL using OpenAI Whisper.
        Returns internal language code (e.g., 'en', 'hi', 'pa').
        Defaults to 'en' if detection fails.
        """
        try:
            from app.services.twilio_service import get_twilio_service
            import os
            
            # Download audio to temp file
            twilio_service = get_twilio_service()
            temp_path = f"/tmp/lang_detect_{os.urandom(4).hex()}.wav"
            await twilio_service.download_recording(audio_url, temp_path)
            
            # Use Whisper for detection
            with open(temp_path, "rb") as audio_file:
                # We use transcription instead of translation to capture the original language
                transcript = await asyncio.get_event_loop().run_in_executor(
                    self._executor,
                    lambda: self.client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="verbose_json"
                    )
                )
            
            # Clean up
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
            # Parse detected language
            detected_lang = transcript.language
            logger.info(f"Whisper detected language raw: '{detected_lang}'")
            
            # Map Whisper language codes to our internal codes
            lang_map = {
                "english": "en", "en": "en",
                "hindi": "hi", "hi": "hi",
                "tamil": "ta", "ta": "ta",
                "telugu": "te", "te": "te",
                "bengali": "bn", "bn": "bn",
                "marathi": "mr", "mr": "mr",
                "gujarati": "gu", "gu": "gu",
                "kannada": "kn", "kn": "kn",
                "malayalam": "ml", "ml": "ml",
                "punjabi": "pa", "pa": "pa"
            }
            
            internal_lang = lang_map.get(detected_lang.lower().strip(), "en")
            logger.info(f"Mapped language '{detected_lang}' to internal code '{internal_lang}'")
            return internal_lang
            
        except Exception as e:
            logger.error(f"Language detection failed: {type(e).__name__}: {e}", exc_info=True)
            return "en"
            
        finally:
            # Clean up temp file
            if 'temp_path' in locals() and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception as e:
                    logger.warning(f"Failed to remove temp file {temp_path}: {e}")

    def _get_system_prompt(self, state: ConversationState) -> str:
        """Get a conversational, flexible system prompt for the LLM"""
        # Get RAG context based on current conversation
        rag = get_rag_service()
        
        # Determine topic from conversation context
        topic = "general"
        info = state.collected_info
        if info.get("is_farmer"):
            topic = "farming"
        elif info.get("has_cough") or "cough" in str(state.message_history).lower():
            topic = "respiratory"
        
        context = rag.get_context_for_topic(topic, state.language, max_chunks=2)
        
        # Build emotional state guidance based on conversation history
        emotional_hints = self._detect_emotional_context(state)
        
        # Get recent conversation for context
        recent_messages = ""
        if state.message_history:
            for msg in state.message_history[-4:]:
                if isinstance(msg, dict):
                    role = "User" if msg.get("role") == "user" else "You"
                    recent_messages += f"{role}: {msg.get('content', '')}\n"
        
        # Urgency based on turn count - guide to recording quickly
        turn_guidance = ""
        # Detect distress for pacing guidance
        is_distressed = any(marker in emotional_hints for marker in [
            "🚨 URGENT", "FEARFUL", "IN PAIN", "⚠️ SEVERE PAIN", "WORRIED"
        ])

        if is_distressed:
            turn_guidance = "\n\n🚨 USER IS DISTRESSED: Offer the cough check IMMEDIATELY. Do not delay."
        elif state.turn_count >= 3:
            turn_guidance = "\n\n⏰ TIME TO CHECK: You have built enough trust. NOW gently offer to check their cough. Do not delay further."
        
        return f"""You are Swasth Dadi (Health Aunty), a caring older woman who helps people check their lungs.

🎯 YOUR GOAL: Check their cough AS SOON AS POSSIBLE. Do not waste time.

👵 PERSONA:
- Tone: Warm but efficient.
- Style: Very short sentences. 
- Role: You are here to SCREEN COUGH, not to chat about life.

🚫 STRICT RULES:
- NO small talk about weather, news, or politics. If user asks, say "Let's focus on your health first."
- NO long explanations. Keep answers under 2 sentences.
- DO NOT ask for the cough if you just asked. Wait for their response.

🩺 THE "WHY" (Stethoscope Analogy):
- If asked why: "Just like a doctor listens to your chest, I listen to your cough."

⏱️ PACING:
- Turn 1-2: Brief greeting and symptom check.
- Turn 3+: PROPOSE THE COUGH CHECK.
- If they mention "cough", "check", or "test" -> GO TO RECORDING IMMEDIATELY.

📞 SPEAK NATURALLY:
- Short, warm sentences.
- Current turn: {state.turn_count} / Target 3 before recording{turn_guidance}

🗣️ LANGUAGE: {state.language} (match their language)

💬 RECENT CONVERSATION:
{recent_messages if recent_messages else "(Just started)"}

🧠 WHAT YOU KNOW:
{state.collected_info if state.collected_info else "Nothing yet"}

❤️ EMOTIONAL CONTEXT:
{emotional_hints}

⚠️ CRITICAL:
- If they say "yes" to checking -> Say "Okay, let's start." and nothing else.
- If they seem ready, guide them to recording.

Respond with ONLY what you would SAY. Keep it CONCISE."""

    def _detect_emotional_context(self, state: ConversationState) -> str:
        """Analyze conversation history to detect emotional cues and provide guidance"""
        emotions_detected = []
        guidance = []
        special_context = []
        
        # Get recent user messages
        recent_user_messages = [
            msg.get("content", "").lower() 
            for msg in state.message_history[-4:] 
            if isinstance(msg, dict) and msg.get("role") == "user"
        ]
        combined_text = " ".join(recent_user_messages)
        latest_msg = recent_user_messages[-1] if recent_user_messages else ""
        
        # ============ EMOTIONAL KEYWORD DETECTION (English + Hindi + Regional) ============
        
        # Core emotions
        worry_words = ["worried", "worry", "anxious", "nervous", "tension", "chinta", "चिंता", "fikar", "फ़िक्र", "pareshan", "परेशान", "ghabrahat", "घबराहट"]
        pain_words = ["pain", "hurt", "hurts", "painful", "ache", "severe", "unbearable", "dard", "दर्द", "taklif", "तकलीफ़", "dukh", "दुख", "peeda", "पीड़ा", "kasht", "कष्ट"]
        fear_words = ["scared", "afraid", "fear", "frightened", "terrified", "dar", "डर", "bhay", "भय", "ghabra", "घबरा", "khatara", "खतरा"]
        frustration_words = ["frustrated", "angry", "annoyed", "irritated", "enough", "fed up", "waste", "gussa", "गुस्सा", "tang", "तंग", "thak gaya", "थक गया"]
        sadness_words = ["sad", "depressed", "hopeless", "alone", "lonely", "crying", "cried", "tears", "dukhi", "दुखी", "udas", "उदास", "akela", "अकेला", "rona", "रोना"]
        relief_words = ["better", "relieved", "good", "great", "okay", "fine", "happy", "theek", "ठीक", "acha", "अच्छा", "rahat", "राहत", "khush", "खुश"]
        confusion_words = ["don't understand", "confused", "what do you mean", "kya matlab", "क्या मतलब", "samajh nahi", "समझ नहीं", "pata nahi", "पता नहीं"]
        
        # NEW: Additional emotional states
        urgency_words = ["urgent", "emergency", "immediately", "right now", "quickly", "asap", "dying", "can't breathe", "jaldi", "जल्दी", "abhi", "अभी", "turant", "तुरंत", "bahut bura", "बहुत बुरा"]
        gratitude_words = ["thank", "thanks", "grateful", "bless", "appreciate", "shukriya", "शुक्रिया", "dhanyawad", "धन्यवाद", "meherbani", "मेहरबानी"]
        exhaustion_words = ["tired", "exhausted", "weak", "no energy", "can't sleep", "thaka", "थका", "kamzor", "कमज़ोर", "neend nahi", "नींद नहीं", "thak gaya", "थक गया"]
        shame_words = ["embarrassed", "ashamed", "shy", "don't want to say", "sharm", "शर्म", "lajja", "लज्जा", "hesitate", "hichak", "हिचक"]
        trust_words = ["trust you", "believe", "hope", "faith", "bharosa", "भरोसा", "vishwas", "विश्वास", "umeed", "उम्मीद"]
        
        # Symptom severity indicators
        severity_words = ["very", "extremely", "really bad", "getting worse", "for weeks", "for months", "bahut", "बहुत", "zyada", "ज़्यादा", "kaafi", "काफ़ी", "hafte se", "महीने से"]
        
        # ============ EMOTION DETECTION ============
        
        if any(word in combined_text for word in urgency_words):
            emotions_detected.append("🚨 URGENT")
            guidance.append("User needs immediate help - prioritize speed and reassurance, skip pleasantries")
        
        if any(word in combined_text for word in worry_words):
            emotions_detected.append("WORRIED")
            guidance.append("Be extra reassuring: 'Don't worry, you've done the right thing by calling'. Avoid enthusiastic language - use calm, supportive tone")
        
        if any(word in combined_text for word in pain_words):
            emotions_detected.append("IN PAIN")
            if any(word in combined_text for word in severity_words):
                emotions_detected.append("⚠️ SEVERE PAIN")
                guidance.append("User has significant pain - express deep concern, consider if emergency referral needed. NEVER say 'wonderful' or 'exciting'")
            else:
                guidance.append("Show genuine concern: 'I'm sorry you're going through this'. Use empathy, not enthusiasm")
        
        if any(word in combined_text for word in fear_words):
            emotions_detected.append("FEARFUL")
            guidance.append("Validate fear first: 'I understand this is frightening. You're not alone'. CRITICAL: DO NOT use 'exciting' or 'wonderful' - this is distress, not joy")
        
        if any(word in combined_text for word in frustration_words):
            emotions_detected.append("FRUSTRATED")
            guidance.append("Acknowledge and be efficient: 'I understand, let me help you quickly'")
        
        if any(word in combined_text for word in sadness_words):
            emotions_detected.append("SAD")
            guidance.append("Be warm and present: 'I hear you. Please know you're not alone in this'")
        
        if any(word in combined_text for word in exhaustion_words):
            emotions_detected.append("EXHAUSTED")
            guidance.append("Be gentle and supportive: 'I can hear how tired you are. Let's make this easy for you'")
        
        if any(word in combined_text for word in shame_words):
            emotions_detected.append("EMBARRASSED")
            guidance.append("Normalize and reassure: 'There's nothing to be embarrassed about. Many people face this'")
        
        if any(word in combined_text for word in relief_words):
            emotions_detected.append("POSITIVE/RELIEVED")
            guidance.append("Mirror positive energy: 'I'm so glad to hear that!'")
        
        if any(word in combined_text for word in gratitude_words):
            emotions_detected.append("GRATEFUL")
            guidance.append("Warmly acknowledge: 'Of course! I'm here to help'")
        
        if any(word in combined_text for word in trust_words):
            emotions_detected.append("TRUSTING")
            guidance.append("Honor their trust: 'Thank you for trusting me. I'll do my best to help you'")
        
        if any(word in combined_text for word in confusion_words):
            emotions_detected.append("CONFUSED")
            guidance.append("Be patient and clear: 'Let me explain more simply...'")
        
        # ============ CONVERSATION PACING & CONTEXT ============
        
        # Check for silence/very short responses
        if latest_msg in ["", "[silence]", "hmm", "okay", "ok", "haan", "हां", "ha", "हा"]:
            special_context.append("User is quiet - gently encourage: 'Please take your time, I'm listening'")
        elif len(latest_msg) < 10 and "POSITIVE" not in str(emotions_detected):
            special_context.append("Short response - they may be hesitant. Encourage gently")
        
        # Detect if user is elderly (common patterns)
        elder_indicators = ["my age", "years old", "old person", "budha", "बूढ़ा", "umr", "उम्र", "bachche", "बच्चे", "grandson", "pota", "पोता"]
        if any(word in combined_text for word in elder_indicators):
            special_context.append("Possibly elderly caller - be extra respectful, use 'Aap', speak clearly")
        
        # Detect if calling for someone else
        proxy_indicators = ["my mother", "my father", "my wife", "my husband", "my child", "meri maa", "मेरी माँ", "mere papa", "मेरे पापा", "mera bacha", "मेरा बच्चा"]
        if any(word in combined_text for word in proxy_indicators):
            special_context.append("Calling for a family member - acknowledge their care and concern")
        
        # Repeated questions = possible frustration or hearing issues
        if state.turn_count > 3 and len(set(recent_user_messages)) < len(recent_user_messages):
            special_context.append("User may be repeating themselves - verify understanding, speak more clearly")
        
        # ============ BUILD OUTPUT ============
        
        result_parts = []
        
        if emotions_detected:
            result_parts.append(f"DETECTED EMOTIONS: {', '.join(emotions_detected)}")
        
        if guidance:
            result_parts.append(f"RESPONSE GUIDANCE: {'; '.join(guidance[:3])}")  # Limit to top 3
        
        if special_context:
            result_parts.append(f"SPECIAL CONTEXT: {'; '.join(special_context)}")
        
        if result_parts:
            return "\n".join(result_parts)
        else:
            # Default warmth based on conversation stage
            if state.turn_count <= 1:
                return "First interaction - be warm and welcoming, put them at ease"
            elif state.turn_count <= 3:
                return "Building rapport - maintain friendly, caring tone"
            else:
                return "Ongoing conversation - maintain warmth, stay focused on helping"

    def _determine_next_step(
        self,
        state: ConversationState,  # Changed from current_step/extracted_info to state
        user_input: str
    ) -> ConversationStep:
        """
        Determine next step based on CONTEXT, not rigid linear flow.
        The goal is to get a cough recording QUICKLY but empathetically.
        """
        current_step = state.current_step
        user_lower = user_input.lower()

        # ========== DETECT EMOTIONAL STATE FOR PACING ==========
        # If user is in distress, we should move to help faster
        emotional_context = self._detect_emotional_context(state)
        is_distressed = any(marker in emotional_context for marker in [
            "🚨 URGENT", "FEARFUL", "IN PAIN", "⚠️ SEVERE PAIN", "WORRIED"
        ])

        # ========== SAFETY FIRST (highest priority) ==========
        safety_keywords = [
            "violence", "violent", "abuse", "abused", "abusive", "beat", "beaten", "beating",
            "hit", "hitting", "scared", "afraid", "fear", "threatening",
            "husband beat", "husband hit", "he beats", "he hits", "attack", "assault",
            "domestic", "help me", "save me", "danger", "unsafe", "trapped",
            "maarta", "marta", "maarpeet", "maar peet", "hinsa", "हिंसा",
            "पिटाई", "मारता", "मारती", "मारपीट", "डर", "dar", "darr",
            "pati maarta", "पति मारता", "sasural", "ससुराल", "torture",
            "bachao", "बचाओ", "madad", "मदद करो", "khatara", "खतरा"
        ]
        if any(kw in user_lower for kw in safety_keywords):
            return ConversationStep.SAFETY_SUPPORT
        
        # ========== HUMAN HANDOFF REQUEST ==========
        human_keywords = ["human", "person", "doctor", "talk to", "real person", "fake", "robot", "insaan", "baat karni", "asli", "asha"]
        if any(kw in user_lower for kw in human_keywords):
            return ConversationStep.ASHA_HANDOFF
        
        # ========== GOODBYE INTENT ==========
        goodbye_keywords = ["bye", "goodbye", "alvida", "अलविदा", "thank", "thanks", "dhanyawad", "धन्यवाद", "hang up", "ok bye", "thats all"]
        if any(kw in user_lower for kw in goodbye_keywords) and current_step in [ConversationStep.RESULTS, ConversationStep.FAMILY_OFFER]:
            return ConversationStep.GOODBYE
        
        # ========== COUGH/HEALTH MENTIONED - GO TO RECORDING ==========
        # Split into "Symptom Mentioned" (continue chatting) vs "Ready to Record" (go to recording)
        
        # 1. User specifically wants to check cough/record
        recording_triggers = [
            "check my cough", "record", "listen", "take sample", "test", "check me",
            "ready", "sure", "chalo", "le lo", "check karo", "test karo", "sunao",
            "take test", "do test", "okay check"
        ]
        if any(kw in user_lower for kw in recording_triggers) and current_step not in [ConversationStep.RECORDING, ConversationStep.PROCESSING]:
             return ConversationStep.RECORDING_INTRO
             
        # 2. Critical/Explicit requests for help should move forward
        help_triggers = ["help me", "need help", "madad", "bimar", "sick"]
        if any(kw in user_lower for kw in help_triggers) and state.turn_count > 2:
            # If they ask for help and we've chatted a bit, offer the test
            return ConversationStep.RECORDING_INTRO

        # ========== QUESTIONS = STAY ON STEP ==========
        # If user asks a question, we MUST stay on current step to answer it
        question_words = ["?", "why", "what", "how", "who", "kya", "kyu", "kyun", "kaise", "kon", "matlab"]
        if any(w in user_lower for w in question_words):
             # Unless it's a "how to cough" question which implies readiness, stay put
             if "cough" not in user_lower:
                 logger.info(f"User asked a question ({user_input}), staying on step {current_step}")
                 return current_step

        # ========== TURN-BASED PROGRESSION ==========
        
        if current_step == ConversationStep.GREETING:
            # Move to rapport building or symptoms
            return ConversationStep.SYMPTOMS
        
        if current_step == ConversationStep.SYMPTOMS:
            # Adjust pacing based on emotional state
            # If distressed (urgent, fearful, in pain, worried), move to recording faster
            if is_distressed:
                # In distress: move to recording after just 3-4 turns (give them space to express concern)
                if state.turn_count >= 3:
                    logger.info(f"User is distressed, accelerating to recording after {state.turn_count} turns")
                    return ConversationStep.RECORDING_INTRO
            else:
                # Normal flow: move to recording efficiently (3 turns)
                if state.turn_count >= 3:
                    return ConversationStep.RECORDING_INTRO

            # Otherwise stay in symptoms/rapport building
            return ConversationStep.SYMPTOMS
            
        if current_step == ConversationStep.RAPPORT_BUILDING:
            if state.turn_count >= 6:
                return ConversationStep.SYMPTOMS
            return ConversationStep.RAPPORT_BUILDING
        
        if current_step == ConversationStep.RECORDING_INTRO:
            return ConversationStep.RECORDING
        
        if current_step == ConversationStep.FAMILY_OFFER:
            yes_keywords = ["yes", "haan", "हां", "one more", "another", "ek aur", "family"]
            if any(kw in user_lower for kw in yes_keywords):
                return ConversationStep.RECORDING_INTRO
            return ConversationStep.GOODBYE
        
        # Default: Move toward recording if stuck
        return ConversationStep.RECORDING_INTRO
    
    def _extract_info(self, user_input: str, current_step: ConversationStep) -> dict:
        """
        Extract structured information from user input.
        Works across ALL steps - not tied to specific conversation phase.
        """
        user_lower = user_input.lower()
        extracted = {}
        
        # ========== ALWAYS EXTRACT (regardless of step) ==========
        
        # Farmer detection
        farmer_keywords = ["farmer", "farming", "kisan", "खेती", "किसान", "farm", "agriculture", "kheti"]
        if any(kw in user_lower for kw in farmer_keywords):
            extracted["is_farmer"] = True
        
        # Cough detection
        cough_keywords = ["cough", "khansi", "खांसी", "khaans", "khasi", "coughing"]
        if any(kw in user_lower for kw in cough_keywords):
            extracted["has_cough"] = True
        
        # Chest pain
        if any(kw in user_lower for kw in ["chest", "pain", "dard", "दर्द", "seene", "सीने"]):
            extracted["chest_pain"] = True
        
        # Breathing issues
        if any(kw in user_lower for kw in ["breath", "saans", "सांस", "breathless", "breathing"]):
            extracted["shortness_of_breath"] = True
        
        # Fever
        if any(kw in user_lower for kw in ["fever", "bukhar", "बुखार", "temperature", "temp"]):
            extracted["fever"] = True
        
        # Cold/flu
        if any(kw in user_lower for kw in ["cold", "sardi", "सर्दी", "flu", "zukam", "जुकाम"]):
            extracted["cold"] = True
        
        # Pesticide exposure
        pesticide_keywords = ["pesticide", "spray", "chemical", "keetnashak", "कीटनाशक", "dawai"]
        if any(kw in user_lower for kw in pesticide_keywords):
            extracted["pesticide_exposure"] = True
        
        # Dust exposure  
        dust_keywords = ["dust", "dhool", "धूल", "grain", "anaj", "अनाज", "hay", "straw"]
        if any(kw in user_lower for kw in dust_keywords):
            extracted["dust_exposure"] = True
        
        # Duration indicators (chronic vs acute)
        chronic_keywords = ["weeks", "months", "long time", "kaafi time", "bahut din", "महीने", "हफ्ते"]
        if any(kw in user_lower for kw in chronic_keywords):
            extracted["chronic_symptoms"] = True
        
        return extracted
    
    async def process_user_input(
        self,
        call_sid: str,
        user_input: str,
        language: Optional[str] = None
    ) -> AgentResponse:
        """
        Process user speech input and generate response.

        Args:
            call_sid: Twilio call SID
            user_input: Transcribed user speech
            language: Override language if detected

        Returns:
            AgentResponse with message and next step
        """
        # Validate inputs
        if not call_sid or not isinstance(call_sid, str):
            logger.error(f"Invalid call_sid: {call_sid}")
            raise ValueError("Invalid call_sid")

        # Handle empty or whitespace-only input
        if not user_input or not user_input.strip():
            logger.warning(f"Empty user input for {call_sid}, treating as silence")
            user_input = "[silence]"

        state = self.get_or_create_state(call_sid)

        # Update language if provided
        if language:
            state.language = language
        
        # Extract info from user input
        extracted = self._extract_info(user_input, state.current_step)
        state.collected_info.update(extracted)
        
        # Add user message to history
        state.message_history.append({"role": "user", "content": user_input})
        state.turn_count += 1
        
        # Get RAG context for current topic
        rag = get_rag_service()
        
        # ========== HANDLE REPEAT REQUESTS ==========
        repeat_keywords = [
            "repeat", "say that again", "pardon", "what did you say", "didn't hear", "say again",
            "phir se", "dobara", "wapas", "kya kaha", "sunai nahi", "fir se", "fir se bolo",
            "ek baar aur", "samajh nahi aaya"
        ]
        
        user_lower = user_input.lower()
        if any(kw in user_lower for kw in repeat_keywords):
            # Find last assistant message
            last_assistant_msg = None
            for msg in reversed(state.message_history[:-1]): # Skip the user message we just added
                if msg.get("role") == "assistant":
                    last_assistant_msg = msg.get("content")
                    break
            
            if last_assistant_msg:
                logger.info(f"Repeat requested for {call_sid}, replaying last message")
                
                # Add the repeat interaction to history so LLM knows context
                state.message_history.append({"role": "assistant", "content": last_assistant_msg})
                
                return AgentResponse(
                    message=last_assistant_msg,
                    next_step=state.current_step, # Don't advance step on repeat
                    should_record=False,
                    should_end=False,
                    gathered_info=extracted
                )

        relevant_chunks = rag.query(user_input, top_k=2, language=state.language)
        
        # Build context from relevant chunks
        rag_context = "\n".join([c.content for c in relevant_chunks])
        
        # Generate response using LLM
        system_prompt = self._get_system_prompt(state)
        
        # Add context to system prompt if we have relevant chunks
        if rag_context:
            system_prompt += f"\n\nADDITIONAL CONTEXT FOR THIS RESPONSE:\n{rag_context}"
        
        # Detect if user is emotional - skip cache for empathetic responses
        emotional_context = self._detect_emotional_context(state)
        has_emotions = "DETECTED EMOTIONS:" in emotional_context
        
        # DISABLED: Response caching - for natural conversation, we want fresh responses
        # Caching made the agent feel scripted and repetitive
        try:
            # Build messages with error handling
            messages = [{"role": "system", "content": system_prompt}]
            # Only include valid message history
            for msg in state.message_history[-4:]:
                if isinstance(msg, dict) and "role" in msg and "content" in msg:
                    messages.append(msg)

            # Run OpenAI call in thread pool to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                self._executor,
                lambda: self.client.chat.completions.create(
                    model=settings.voice_agent_model if hasattr(settings, 'voice_agent_model') else "gpt-4o-mini",
                    messages=messages,
                    max_tokens=100,  # More tokens for natural responses
                    temperature=0.85,  # Higher temperature for more human-like, varied responses
                    timeout=10.0,
                    presence_penalty=0.3,  # Reduce repetition
                    frequency_penalty=0.3,  # More diverse vocabulary
                )
            )

            message = response.choices[0].message.content.strip()

            # Validate message isn't empty
            if not message:
                logger.warning(f"Empty LLM response for {call_sid}, using fallback")
                message = self._get_fallback_message(state)

        except Exception as e:
            logger.error(f"LLM call failed for {call_sid}: {type(e).__name__}: {e}")
            # Fallback message
            message = self._get_fallback_message(state)
        
        # --- NICHE TELEPHONY EXPERIENCE ---
        
        # 1. Add "Thinking" Filler (Latentcy Masking + Human touch)
        # Randomly add a filler to sound more natural (30% chance or if specific context)
        if random.random() < 0.3 or "CONFUSED" in emotional_context:
            filler = self._get_thinking_filler(state.language, emotional_context)
            if filler:
                message = f"{filler} {message}"
        
        # 2. Get Emotional Prosody Params
        # Adjust pitch/rate based on emotional context
        prosody_params = self._get_prosody_params(emotional_context)
        
        # ----------------------------------
        
        # Add assistant message to history
        state.message_history.append({"role": "assistant", "content": message})
        
        # Determine next step
        next_step = self._determine_next_step(state, user_input)
        state.current_step = next_step
        
        # Check if we should record or end - trigger recording for both RECORDING and RECORDING_INTRO
        should_record = next_step in [ConversationStep.RECORDING, ConversationStep.RECORDING_INTRO]
        should_end = next_step == ConversationStep.GOODBYE
        
        return AgentResponse(
            message=message,
            next_step=next_step,
            should_record=should_record,
            should_end=should_end,
            gathered_info=extracted,
            prosody=prosody_params,
        )
    
    def _get_fallback_message(self, state: ConversationState) -> str:
        """Get fallback message if LLM fails (multilingual with emotional awareness)"""
        # Map conversation steps to i18n keys
        key_map = {
            ConversationStep.GREETING: "va_fallback_greeting",
            ConversationStep.OCCUPATION: "va_fallback_occupation",
            ConversationStep.SYMPTOMS: "va_fallback_symptoms",
            ConversationStep.RECORDING_INTRO: "va_fallback_recording",
            ConversationStep.GOODBYE: "va_fallback_goodbye",
            ConversationStep.ASHA_HANDOFF: "va_fallback_handoff",
            ConversationStep.SAFETY_SUPPORT: "va_safety_support",
        }
        
        i18n_key = key_map.get(state.current_step, "va_fallback_greeting")
        base_message = get_text(i18n_key, state.language)
        
        # Add emotional context prefix if emotions detected
        emotional_context = self._detect_emotional_context(state)
        prefix = ""
        
        if "URGENT" in emotional_context:
            prefix = get_text("va_empathy_urgent", state.language) + " "
        elif "FEARFUL" in emotional_context or "WORRIED" in emotional_context:
            prefix = get_text("va_empathy_worried", state.language) + " "
        elif "IN PAIN" in emotional_context:
            prefix = get_text("va_empathy_pain", state.language) + " "
        elif "SAD" in emotional_context or "EXHAUSTED" in emotional_context:
            prefix = get_text("va_empathy_sad", state.language) + " "
        elif "FRUSTRATED" in emotional_context:
            prefix = get_text("va_empathy_frustrated", state.language) + " "
        
        return prefix + base_message
    
    def get_initial_greeting(self, language: str = "en") -> str:
        """Get the initial greeting message (multilingual)"""
        return get_text("va_greeting", language)
    
    def get_results_message(
        self,
        state: ConversationState,
        risk_level: str,
        recommendation: str
    ) -> str:
        """Generate personalized results message (multilingual)"""
        collected = state.collected_info
        
        # Normalize risk strings
        if risk_level in ["high_risk", "severe", "urgent"]:
            risk_level = "high"
        elif risk_level in ["moderate_risk", "moderate"]:
            risk_level = "moderate"
        elif risk_level in ["low_risk", "low", "normal"]:
            risk_level = "normal"
            
        # Escalate risk if pesticide exposure
        if collected.get("pesticide_exposure") and risk_level == "normal":
            risk_level = "moderate"
            
        # Select message key based on risk
        if risk_level == "high":
            key = "va_result_high"
        elif risk_level == "moderate":
            key = "va_result_moderate"
        else:
            key = "va_result_normal"
            
        # Get template text
        template = get_text(key, state.language)
        
        # Add booking mention for high/moderate risk
        if risk_level in ["high", "moderate"]:
             booking_mention = get_text("va_booking_mention", state.language)
             template += " " + booking_mention
        
        # Format with recommendation
        return template.replace("{rec}", recommendation)

    def _get_thinking_filler(self, language: str, emotional_context: str) -> str:
        """Get a natural 'thinking' filler word/phrase"""
        # If urgent, don't delay
        if "URGENT" in emotional_context or "EMERGENCY" in emotional_context:
            return ""
            
        fillers = {
            "en": ["Hmm...", "Let's see...", "Okay...", "Right...", "I see...", "Well..."],
            "hi": ["हम्म...", "अच्छा...", "देखते हैं...", "ठीक है...", "जी...", "सुनिए..."]
        }
        
        options = fillers.get(language, fillers["en"])
        return random.choice(options)

    def _get_prosody_params(self, emotional_context: str) -> Optional[dict]:
        """
        Get Twilio SSML prosody parameters for emotional context.
        Returns dict with 'rate' and 'pitch' or None -> rate, pitch
        """
        # Default settings
        rate = "100%"
        pitch = "0%"
        
        if "SAD" in emotional_context or "PAIN" in emotional_context or "WORRIED" in emotional_context:
            # Empathetic: Slower, slightly lower pitch
            rate = "90%"
            pitch = "-5%"
        
        elif "URGENT" in emotional_context or "FEARFUL" in emotional_context:
            # Urgent: Faster, slightly higher pitch for alertness
            rate = "110%"
            pitch = "+5%"
            
        elif "RELIEVED" in emotional_context or "HAPPY" in emotional_context:
             # Positive: Standard rate, slightly higher pitch
             rate = "105%"
             pitch = "+10%"
        
        elif "CONFUSED" in emotional_context:
            # Explaining: Slower
            rate = "85%"
        
        # If normal/default, return None
        if rate == "100%" and pitch == "0%":
            return None
            
        return {"rate": rate, "pitch": pitch}


# Singleton instance
_voice_agent: Optional[VoiceAgentService] = None


def get_voice_agent_service() -> VoiceAgentService:
    """Get or create the voice agent singleton"""
    global _voice_agent
    if _voice_agent is None:
        _voice_agent = VoiceAgentService()
    return _voice_agent
