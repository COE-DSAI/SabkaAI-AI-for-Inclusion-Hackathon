# Protego AI Usage Flow - Complete Guide

**Last Updated:** 2026-01-16
**Version:** 2.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [AI Services Architecture](#ai-services-architecture)
3. [Complete AI Flow Diagram](#complete-ai-flow-diagram)
4. [Four AI Modes](#four-ai-modes)
   - [One-Time Audio Analysis](#1-one-time-audio-analysis)
   - [Real-Time Audio Monitoring](#2-real-time-audio-monitoring)
   - [Text Analysis & Chat](#3-text-analysis--chat)
   - [AI Safety Call](#4-ai-safety-call-new)
5. [Key Components](#key-components)
6. [Distress Detection Engine](#distress-detection-engine)
7. [Alert Flow](#alert-flow)
8. [API Reference](#api-reference)
9. [Configuration](#configuration)
10. [Rate Limiting](#rate-limiting)
11. [Test Mode](#test-mode)

---

## Overview

Protego uses **three AI services** working together to provide comprehensive safety monitoring:

| Service | Provider | Purpose | Model |
|---------|----------|---------|-------|
| **Whisper** | Chutes AI | Audio transcription | whisper-large-v3 |
| **MegaLLM** | MegaLLM.io | Text analysis & chat | claude-opus-4.5 |
| **Azure OpenAI Realtime** | Microsoft | Real-time audio monitoring & safety calls | gpt-4o-realtime-preview |

**Key Features:**
- Real-time distress detection from audio
- AI-powered safety analysis and recommendations
- Continuous audio monitoring with WebSocket
- Post-walk session summaries
- Location-based safety assessment
- Interactive safety assistant
- **🆕 AI Safety Call** - Fake phone call with AI friend for deterrence

---

## AI Services Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
            ┌───────▼────────┐         ┌───────▼────────┐
            │  AUDIO INPUT   │         │  TEXT INPUT    │
            │  (Microphone)  │         │  (Chat/Voice)  │
            └───────┬────────┘         └───────┬────────┘
                    │                           │
        ┌───────────┴───────────┐              │
        │           │           │              │
        ▼           ▼           ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ONE-TIME  │  │REAL-TIME │  │  SAFETY  │  │   CHAT   │
│ANALYSIS  │  │MONITORING│  │   CALL   │  │ASSISTANT │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │              │             │
     │             │              │             │
┌────▼─────────────▼──────────────▼─────────────▼──────────────────┐
│                    BACKEND AI SERVICES                            │
│                                                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐   │
│  │   WHISPER      │  │  AZURE OPENAI  │  │    MEGALLM      │   │
│  │   (Chutes)     │  │   REALTIME     │  │   (Claude-Opus-4.5)     │   │
│  │                │  │                │  │                 │   │
│  │ Transcribes    │  │ WebSocket      │  │ Analyzes text   │   │
│  │ audio to text  │  │ live audio +   │  │ Safety analysis │   │
│  │                │  │ conversation   │  │ Chat responses  │   │
│  └────────┬───────┘  └────────┬───────┘  └─────────┬───────┘   │
│           │                   │                     │           │
│           └───────────┬───────┴─────────────────────┘           │
│                       │                                         │
│              ┌────────▼─────────┐                              │
│              │  DISTRESS        │                              │
│              │  DETECTION       │                              │
│              │  ENGINE          │                              │
│              └────────┬─────────┘                              │
│                       │                                         │
└───────────────────────┼─────────────────────────────────────────┘
                        │
            ┌───────────▼───────────┐
            │   CONFIDENCE CHECK    │
            │   >= 0.8 threshold?   │
            └───────────┬───────────┘
                        │
                  ┌─────┴─────┐
                  │           │
                 YES          NO
                  │           │
                  ▼           ▼
         ┌────────────┐  ┌──────────┐
         │   CREATE   │  │   LOG    │
         │   ALERT    │  │   ONLY   │
         └──────┬─────┘  └──────────┘
                │
                ▼
    ┌───────────────────────┐
    │  START COUNTDOWN      │
    │  (5 seconds default)  │
    └───────────┬───────────┘
                │
         ┌──────┴──────┐
         │             │
    USER CANCELS   COUNTDOWN EXPIRES
         │             │
         ▼             ▼
    ┌─────────┐  ┌──────────────┐
    │ CANCEL  │  │   TRIGGER    │
    │ ALERT   │  │ SMS TO TRUSTED│
    └─────────┘  │   CONTACTS   │
                 └──────────────┘
```

---

## Complete AI Flow Diagram

### High-Level Flow

```
User Action → Audio/Text Input → Backend Processing → AI Analysis →
Distress Detection → Confidence Check → Alert Decision →
Countdown Timer → SMS Notification
```

### Detailed Component Interactions

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐        │
│  │  AudioMonitor│  │  Realtime    │  │  ChatAssistant │        │
│  │  Component   │  │  Hook        │  │  Component     │        │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘        │
│         │                 │                   │                 │
└─────────┼─────────────────┼───────────────────┼─────────────────┘
          │                 │                   │
          │ HTTP POST       │ WebSocket         │ HTTP POST
          │ /api/ai/        │ wss://azure       │ /api/ai/
          │ analyze/audio   │                   │ chat
          │                 │                   │
┌─────────▼─────────────────▼───────────────────▼─────────────────┐
│                       BACKEND LAYER                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │            FastAPI Router Layer                       │       │
│  │  /api/ai/analyze/audio                               │       │
│  │  /api/ai/analyze/text                                │       │
│  │  /api/ai/chat                                        │       │
│  │  /api/ai/summary/session/{id}                       │       │
│  │  /api/ai/analyze/location                           │       │
│  │  /api/ai/realtime/config                            │       │
│  └────────────────────┬─────────────────────────────────┘       │
│                       │                                          │
│  ┌────────────────────▼─────────────────────────────────┐       │
│  │         AI Service (ai_service.py)                   │       │
│  │                                                      │       │
│  │  ┌───────────────────────────────────────────┐     │       │
│  │  │  Method Routing                            │     │       │
│  │  │  • transcribe_audio()                     │     │       │
│  │  │  • analyze_audio_for_distress()           │     │       │
│  │  │  • analyze_with_llm()                     │     │       │
│  │  │  • chat_safety_assistant()                │     │       │
│  │  │  • generate_safety_summary()              │     │       │
│  │  │  • analyze_location_safety()              │     │       │
│  │  └────────┬──────────────────────────────────┘     │       │
│  └───────────┼──────────────────────────────────────────┘       │
│              │                                                   │
│      ┌───────┴────────┬──────────────┬────────────────┐        │
│      │                │              │                │        │
└──────┼────────────────┼──────────────┼────────────────┼────────┘
       │                │              │                │
       │ HTTP POST      │ HTTP POST    │ WebSocket      │
       │                │              │ (Frontend)     │
       ▼                ▼              ▼                │
┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  Whisper    │  │   MegaLLM    │  │ Azure OpenAI   │ │
│  Chutes AI  │  │   Claude-Opus-4.5    │  │   Realtime     │◄┘
│             │  │              │  │                │
│ Transcribe  │  │ Text analysis│  │ Live audio +   │
│ audio       │  │ Chat         │  │ transcription  │
└─────────────┘  └──────────────┘  └────────────────┘
```

---

## Four AI Modes

### 1. One-Time Audio Analysis

**Endpoint:** `POST /api/ai/analyze/audio`

**Use Case:** User records 3-10 seconds of audio for distress analysis

#### Flow Diagram

```
┌──────────────────┐
│ User Records     │
│ Audio Clip       │
│ (3-10 seconds)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Frontend sends   │
│ audio file       │
│ (webm/wav/mp3)   │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Backend: ai_service.analyze_audio_      │
│                for_distress()           │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Step 1: Whisper Transcription           │
│                                         │
│ • Send audio bytes to Chutes API        │
│ • Receive segments with timestamps      │
│                                         │
│ Example Response:                       │
│ [                                       │
│   {                                     │
│     "text": "help me please",          │
│     "start": 0.0,                      │
│     "end": 2.5                         │
│   }                                     │
│ ]                                       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Step 2: Keyword Detection (Rule-Based)  │
│                                         │
│ Combine all text segments:              │
│ "help me please stop"                   │
│                                         │
│ Check distress keywords:                │
│ ✓ "help" (found)                       │
│ ✓ "help me" (found)                    │
│ ✓ "please" (found)                     │
│                                         │
│ Check scream indicators:                │
│ ✗ No scream detected                   │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Step 3: Classification & Confidence     │
│                                         │
│ Logic:                                  │
│ • If scream detected:                   │
│   → SCREAM (confidence: 0.9)           │
│                                         │
│ • Else if "help" keywords:              │
│   → HELP_CALL (confidence: 0.95)       │
│                                         │
│ • Else if "crying" keywords:            │
│   → CRYING (confidence: 0.7)           │
│                                         │
│ • Else if multiple keywords:            │
│   → PANIC (confidence: 0.8)            │
│                                         │
│ Result: HELP_CALL (0.95)               │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│ Step 4: Alert Decision                  │
│                                         │
│ if confidence >= 0.8:                   │
│   • Create Alert in database            │
│   • Set status = PENDING                │
│   • Store location, session_id          │
│   • Start 5-second countdown            │
│   • Return alert_id                     │
│ else:                                   │
│   • Return analysis only                │
│   • No alert created                    │
└─────────────────────────────────────────┘
```

#### Code Flow

```python
# Step 1: Transcribe
segments = await ai_service.transcribe_audio(
    audio_data=audio_bytes,
    filename="audio.webm"
)
# Result: [WhisperSegment(text="help me please", start=0.0, end=2.5)]

# Step 2: Keyword Detection
full_text = " ".join(seg.text for seg in segments).lower()
# "help me please"

keywords_found = []
for keyword in DISTRESS_KEYWORDS:
    if keyword.lower() in full_text:
        keywords_found.append(keyword)
# ["help", "help me", "please"]

# Step 3: Classification
if "help" in keywords_found:
    distress_type = DistressType.HELP_CALL
    confidence = 0.95

# Step 4: Alert Creation
if confidence >= 0.8:
    alert = Alert(
        user_id=user.id,
        type=AlertType.VOICE_ACTIVATION,
        confidence=0.95,
        status=AlertStatus.PENDING
    )
    db.add(alert)
    db.commit()

    asyncio.create_task(alert_manager.start_alert_countdown(alert.id))
```

#### API Request

```bash
POST /api/ai/analyze/audio
Content-Type: multipart/form-data
Authorization: Bearer {token}

Fields:
  audio: [binary audio file]
  session_id: 123 (optional)
  location_lat: 40.7128 (optional)
  location_lng: -74.0060 (optional)
```

#### API Response

```json
{
  "transcription": "help me please someone",
  "distress_detected": true,
  "distress_type": "HELP_CALL",
  "confidence": 0.95,
  "keywords_found": ["help", "help me", "please"],
  "alert_triggered": true,
  "alert_id": 456
}
```

#### Rate Limit

```
50 requests per hour per IP address
```

---

### 2. Real-Time Audio Monitoring

**Technology:** WebSocket connection to Azure OpenAI Realtime API

**Use Case:** Continuous audio monitoring during walk sessions

#### Flow Diagram

```
┌──────────────────────┐
│ User Enables         │
│ Realtime Monitoring  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Frontend: Get Config │
│ GET /api/ai/         │
│     realtime/config  │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Backend Returns:                   │
│ {                                  │
│   "ws_url": "wss://...?api-key=..",│
│   "deployment": "gpt-4o-realtime", │
│   "instructions": "You are a..."   │
│ }                                  │
└──────────┬─────────────────────────┘
           │
           ▼
┌──────────────────────┐
│ Frontend: Connect    │
│ WebSocket            │
│                      │
│ const ws = new       │
│   WebSocket(ws_url)  │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Send Session Configuration         │
│                                    │
│ {                                  │
│   "type": "session.update",       │
│   "session": {                    │
│     "modalities": ["text","audio"],│
│     "input_audio_format": "pcm16",│
│     "turn_detection": {           │
│       "type": "server_vad",       │
│       "threshold": 0.5,           │
│       "silence_duration_ms": 500  │
│     }                             │
│   }                               │
│ }                                  │
└──────────┬─────────────────────────┘
           │
           ▼
┌──────────────────────┐
│ Start Microphone     │
│                      │
│ • Sample rate: 24kHz │
│ • Format: PCM16      │
│ • Mono channel       │
│ • Noise suppression  │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Capture Audio Loop                 │
│                                    │
│ Every 4096 samples (~170ms):       │
│                                    │
│ 1. Capture raw audio               │
│    Float32Array (24kHz)            │
│                                    │
│ 2. Convert to PCM16                │
│    Int16 array                     │
│                                    │
│ 3. Encode to Base64                │
│    String                          │
│                                    │
│ 4. Send via WebSocket              │
│    {                               │
│      "type": "input_audio_buffer   │
│              .append",             │
│      "audio": "base64_data"        │
│    }                               │
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Azure OpenAI Processing            │
│                                    │
│ Server-side:                       │
│ • Voice Activity Detection (VAD)   │
│ • Automatic speech detection       │
│ • Real-time transcription          │
│ • AI analysis (GPT-4o-realtime)   │
│ • Structured JSON response         │
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ WebSocket Events Received          │
│                                    │
│ 1. "input_audio_buffer.           │
│     speech_started"                │
│    → User started speaking         │
│                                    │
│ 2. "conversation.item.input_audio  │
│     _transcription.completed"     │
│    → {                            │
│        "transcript": "help me"    │
│      }                            │
│                                    │
│ 3. "response.text.done"           │
│    → {                            │
│        "distress_detected": true, │
│        "distress_type": "HELP_CALL│
│        "confidence": 0.95,        │
│        "keywords": ["help"],      │
│        "action": "trigger_alert"  │
│      }                            │
└──────────┬─────────────────────────┘
           │
           ▼
┌──────────────────────┐
│ Frontend Callback    │
│ onDistressDetected() │
│                      │
│ • Show emergency UI  │
│ • Create alert via   │
│   POST /api/alerts/  │
│ • Start countdown    │
└──────────────────────┘
```

#### Key Features

- **Instant Detection:** ~500ms latency from speech to analysis
- **Continuous Monitoring:** Always listening, no recording delay
- **AI-Powered:** Understands context, not just keywords
- **Server VAD:** Automatic speech detection on server side
- **Streaming Transcription:** Real-time text as user speaks

#### Code Implementation

**Frontend Hook: `useRealtimeAudio.ts`**

```typescript
// 1. Connect to WebSocket
const connect = async () => {
  const config = await aiAPI.getRealtimeConfig();
  const ws = new WebSocket(config.ws_url);

  ws.onopen = () => {
    // Configure session
    ws.send(JSON.stringify({
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        input_audio_format: 'pcm16',
        turn_detection: { type: 'server_vad' }
      }
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'conversation.item.input_audio_transcription.completed') {
      console.log('Heard:', data.transcript);
      onTranscript?.(data.transcript);
    }

    if (data.type === 'response.text.done') {
      const analysis = JSON.parse(data.text);
      if (analysis.distress_detected) {
        onDistressDetected?.(analysis);
      }
    }
  };
};

// 2. Start listening
const startListening = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { sampleRate: 24000, channelCount: 1 }
  });

  const audioContext = new AudioContext({ sampleRate: 24000 });
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (e) => {
    const inputData = e.inputBuffer.getChannelData(0);
    const pcm16 = floatTo16BitPCM(inputData);
    const base64 = arrayBufferToBase64(pcm16);

    ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64
    }));
  };
};
```

**Backend Config Endpoint:**

```python
@router.get("/realtime/config")
async def get_realtime_config(current_user: User = Depends(get_current_user)):
    ws_url = (
        f"{settings.azure_openai_realtime_endpoint}"
        f"/openai/realtime?api-version=2024-10-01-preview"
        f"&deployment={settings.azure_openai_realtime_deployment}"
        f"&api-key={settings.azure_openai_realtime_api_key}"
    )

    return {
        "ws_url": ws_url,
        "deployment": settings.azure_openai_realtime_deployment,
        "instructions": """You are a safety monitoring AI for Protego.
            Listen for distress and respond in JSON format:
            {
              "distress_detected": boolean,
              "distress_type": "SCREAM" | "HELP_CALL" | "PANIC" | "CRYING" | "NONE",
              "confidence": float (0-1),
              "transcript": "what you heard",
              "keywords": ["distress", "keywords"],
              "action": "trigger_alert" | "monitor" | "none"
            }"""
    }
```

#### WebSocket Message Types

| Event Type | Direction | Description |
|-----------|-----------|-------------|
| `session.update` | Client → Server | Configure session parameters |
| `session.created` | Server → Client | Session initialized |
| `input_audio_buffer.append` | Client → Server | Audio data chunk |
| `input_audio_buffer.speech_started` | Server → Client | Speech detected |
| `input_audio_buffer.speech_stopped` | Server → Client | Speech ended |
| `conversation.item.input_audio_transcription.completed` | Server → Client | Transcription ready |
| `response.text.done` | Server → Client | AI analysis complete |
| `error` | Server → Client | Error occurred |

---

### 3. Text Analysis & Chat

**Use Case:** Analyze text input, chat with AI assistant, get safety tips

#### A) Quick Text Analysis

**Endpoint:** `POST /api/ai/analyze/text`

**Flow:**

```
User Types or Speaks
    ↓
Frontend converts to text
    ↓
POST /api/ai/analyze/text
{
  "text": "someone is following me",
  "context": "walking alone at night"
}
    ↓
Backend: ai_service.analyze_with_llm()
    ↓
MegaLLM API Call
    System: "You are a safety analysis AI..."
    User: "Analyze: 'someone is following me'"
    Temperature: 0.3 (deterministic)
    Model: claude-sonnet-4-5-20250929
    ↓
LLM Response (JSON)
{
  "is_emergency": true,
  "confidence": 0.85,
  "distress_type": "PANIC",
  "analysis": "User reports being followed - immediate concern",
  "recommended_action": "trigger_alert"
}
    ↓
Return to Frontend
```

**API Request:**

```bash
POST /api/ai/analyze/text
Content-Type: application/json
Authorization: Bearer {token}

{
  "text": "someone is following me",
  "context": "walking home from subway station"
}
```

**API Response:**

```json
{
  "is_emergency": true,
  "confidence": 0.85,
  "distress_type": "PANIC",
  "analysis": "User reports being followed - potential safety threat",
  "recommended_action": "trigger_alert"
}
```

**Rate Limit:** 100 requests/hour per IP

---

#### B) Chat Assistant

**Endpoint:** `POST /api/ai/chat`

**Flow:**

```
User: "What should I do if someone follows me?"
    ↓
POST /api/ai/chat
{
  "message": "What should I do if someone follows me?",
  "conversation_history": [
    {"role": "user", "content": "previous message"},
    {"role": "assistant", "content": "previous response"}
  ]
}
    ↓
Backend: ai_service.chat_safety_assistant()
    ↓
MegaLLM API Call
    System: "You are Protego's AI Safety Assistant..."
    Messages: [history + new message]
    Temperature: 0.7 (creative)
    Max tokens: 4000
    ↓
LLM Response (Natural Language)
"If you think someone is following you:

1. Cross the street and see if they follow
2. Head to a populated, well-lit area
3. Call a friend or 911 if you feel threatened
4. Use the SOS button in Protego immediately
5. Don't go home - they'll know where you live

Trust your instincts. It's better to be safe."
    ↓
Return to Frontend
```

**API Request:**

```bash
POST /api/ai/chat
Content-Type: application/json
Authorization: Bearer {token}

{
  "message": "What should I do if someone follows me?",
  "conversation_history": [
    {
      "role": "user",
      "content": "How does Protego work?"
    },
    {
      "role": "assistant",
      "content": "Protego monitors your safety..."
    }
  ]
}
```

**API Response:**

```json
{
  "response": "If you think someone is following you:\n\n1. Cross the street...",
  "timestamp": "2026-01-15T20:30:00Z"
}
```

**Rate Limit:** 30 requests/hour per IP

---

#### C) Safety Summary

**Endpoint:** `GET /api/ai/summary/session/{session_id}`

**Flow:**

```
Walk Session Ends
    ↓
Frontend: GET /api/ai/summary/session/123
    ↓
Backend fetches session data:
    - Duration: 45 minutes
    - Alerts: [
        {type: "SCREAM", confidence: 0.9, status: "cancelled"},
        {type: "VOICE_ACTIVATION", confidence: 0.85, status: "safe"}
      ]
    ↓
ai_service.generate_safety_summary()
    ↓
MegaLLM API Call
    Prompt: "Generate summary for 45-minute walk with 2 alerts..."
    Temperature: 0.5
    ↓
LLM Response
{
  "summary": "Completed 45-minute evening walk. Two alerts were
              triggered but both resolved safely. First alert at
              8:15 PM was a false positive (background noise).
              Second alert at 8:32 PM was user-initiated voice
              test. Overall safe journey.",
  "risk_level": "medium",
  "recommendations": [
    "Consider walking in groups during late hours",
    "Keep phone volume up to ensure alerts are heard",
    "Test voice activation in quieter environment"
  ],
  "alerts_analysis": "Both alerts were precautionary and
                      canceled by user within countdown period.
                      No actual danger detected."
}
```

**API Response:**

```json
{
  "summary": "Completed 45-minute evening walk...",
  "risk_level": "medium",
  "recommendations": [
    "Consider walking in groups during late hours",
    "Keep phone volume up"
  ],
  "alerts_analysis": "Both alerts were precautionary...",
  "session_duration_minutes": 45,
  "total_alerts": 2
}
```

---

#### D) Location Safety Analysis

**Endpoint:** `POST /api/ai/analyze/location`

**Flow:**

```
User Location: 40.7128, -74.0060
Time: 11:30 PM, Saturday
    ↓
POST /api/ai/analyze/location
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "timestamp": "2026-01-15T23:30:00Z",
  "context": "walking home from subway"
}
    ↓
Backend: Time Analysis (Heuristic)
    Hour: 23 (11 PM)
    is_night: true
    is_late_night: true

    Base safety score: 85
    Late night penalty: -25
    Weekend adjustment: -5

    Final score: 60
    ↓
MegaLLM API Call (if available)
    Prompt: "Analyze safety at coordinates..."
    Temperature: 0.4
    ↓
LLM Response
{
  "safety_score": 60,
  "status": "caution",
  "risk_level": "medium",
  "factors": [
    "Late night hours - reduced visibility and foot traffic",
    "Weekend night - be aware of surroundings",
    "Subway exit area - stay alert for groups"
  ],
  "recommendations": [
    "Stay on well-lit main streets",
    "Share live location with trusted contact",
    "Consider rideshare for last mile",
    "Keep phone easily accessible"
  ]
}
```

**API Request:**

```bash
POST /api/ai/analyze/location
Content-Type: application/json
Authorization: Bearer {token}

{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "timestamp": "2026-01-15T23:30:00Z",
  "context": "walking home from subway"
}
```

**API Response:**

```json
{
  "safety_score": 60,
  "status": "caution",
  "risk_level": "medium",
  "factors": [
    "Late night hours - reduced visibility",
    "Weekend night - be aware of surroundings"
  ],
  "recommendations": [
    "Stay on well-lit routes",
    "Share live location with contacts",
    "Consider rideshare"
  ],
  "time_context": {
    "hour": 23,
    "is_night": true,
    "is_late_night": true,
    "day_of_week": "Saturday"
  },
  "analyzed_at": "2026-01-15T23:30:00Z"
}
```

**Rate Limit:** 100 requests/hour per IP

---

### 4. AI Safety Call 🆕

**Technology:** WebSocket connection to Azure OpenAI Realtime API with bidirectional audio streaming

**Use Case:** User triggers fake phone call where AI acts as a concerned friend, creating deterrent effect while secretly detecting distress

#### Overview

The Safety Call feature allows users to start a realistic phone call with an AI that:
- Acts like a concerned friend checking on them
- Naturally mentions tracking their location
- Creates the impression someone is monitoring them (deterrent for threats)
- Detects distress keywords in user's speech
- Silently triggers alerts without revealing to potential attackers

#### Flow Diagram

```
┌──────────────────────┐
│ User Clicks          │
│ "Start Safety Call"  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Frontend: POST       │
│ /api/safety-call/    │
│     start            │
│                      │
│ {                    │
│   location: {...}    │
│ }                    │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Backend: SafetyCallManager         │
│                                    │
│ • Create session (UUID)            │
│ • Build AI prompt with context     │
│ • Initialize Azure Realtime        │
│ • Return WebSocket URL + config    │
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Backend Response:                  │
│ {                                  │
│   "session_id": "uuid...",        │
│   "connection": {                 │
│     "type": "websocket",          │
│     "url": "wss://azure...",      │
│     "protocol": "azure_realtime"  │
│   },                              │
│   "system_instructions": "You are │
│      a concerned friend calling..." │
│ }                                  │
└──────────┬─────────────────────────┘
           │
           ▼
┌──────────────────────┐
│ Frontend: Connect    │
│ WebSocket            │
│                      │
│ const ws = new       │
│   WebSocket(url)     │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Send Session Configuration         │
│                                    │
│ {                                  │
│   "type": "session.update",       │
│   "session": {                    │
│     "modalities": ["text","audio"],│
│     "voice": "alloy",             │
│     "input_audio_format": "pcm16",│
│     "output_audio_format": "pcm16"│
│     "instructions": "You are a... │
│        concerned friend calling to │
│        check on [name]'s safety.  │
│        Mention you're tracking    │
│        their location..."         │
│     "turn_detection": {           │
│       "type": "server_vad",       │
│       "threshold": 0.5,           │
│       "silence_duration_ms": 500  │
│     }                             │
│   }                               │
│ }                                  │
└──────────┬─────────────────────────┘
           │
           ▼
┌──────────────────────┐
│ Start Microphone     │
│                      │
│ • Sample rate: 24kHz │
│ • Format: PCM16      │
│ • Mono channel       │
│ • Real-time stream   │
└──────────┬───────────┘
           │
           │
┌──────────▼──────────────────────────┐
│ Bidirectional Audio Loop            │
│                                     │
│ USER → AI:                          │
│ 1. Capture user audio (Float32)    │
│ 2. Convert to PCM16                 │
│ 3. Encode to Base64                 │
│ 4. Send via WebSocket:              │
│    {                                │
│      "type": "input_audio_buffer    │
│              .append",              │
│      "audio": "base64_data"         │
│    }                                │
│                                     │
│ AI → USER:                          │
│ 1. Receive audio from Azure         │
│ 2. Decode Base64                    │
│ 3. Convert PCM16 to Float32         │
│ 4. Play through speaker             │
│                                     │
│ TRANSCRIPTS:                        │
│ • User speech transcribed           │
│ • AI responses transcribed          │
│ • Both sent to backend              │
└──────────┬──────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Azure OpenAI Processing            │
│                                    │
│ Server-side:                       │
│ • Voice Activity Detection (VAD)   │
│ • Real-time transcription          │
│ • AI conversation (GPT-4o-realtime)│
│ • Natural TTS output               │
│                                    │
│ AI Conversation Example:           │
│ AI: "Hey! Just checking in - I saw │
│      you're walking alone. I'm     │
│      following your location.      │
│      Everything okay?"             │
│                                    │
│ User: "help me please"             │
│                                    │
│ AI: "What's wrong? Talk to me -    │
│      I'm right here tracking you." │
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ WebSocket Events Received          │
│                                    │
│ 1. "conversation.item.input_audio  │
│     _transcription.completed"     │
│    → {                            │
│        "transcript": "help me     │
│                      please"      │
│      }                            │
│    → Frontend sends to backend:   │
│       POST /api/safety-call/      │
│            transcript             │
│                                    │
│ 2. "response.audio.delta"         │
│    → AI speaking (audio chunks)   │
│    → Play to user                 │
│                                    │
│ 3. "response.audio_transcript     │
│     .done"                        │
│    → {                            │
│        "transcript": "What's wrong│
│                       Talk to me" │
│      }                            │
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Backend: Process Transcript        │
│                                    │
│ POST /api/safety-call/transcript   │
│ {                                  │
│   "session_id": "uuid...",        │
│   "transcript": "help me please", │
│   "speaker": "user"               │
│ }                                  │
│                                    │
│ SafetyCallManager:                 │
│ • Add to session conversation      │
│ • Run DistressDetector.analyze()   │
│ • Check keywords: ["help", "help  │
│   me", "please"]                   │
│ • Confidence: 0.95 (HIGH)          │
│ • Trigger alert: YES               │
└──────────┬─────────────────────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Silent Alert Triggering            │
│                                    │
│ Backend:                           │
│ • Create Alert (PENDING)           │
│ • Link to safety_call_session      │
│ • Send SMS to ALL trusted contacts:│
│                                    │
│   "🚨 EMERGENCY ALERT               │
│    from [Name]                     │
│                                    │
│    Safety call detected distress.  │
│                                    │
│    Location:                       │
│    [lat, lng]                      │
│    [Google Maps link]              │
│                                    │
│    Distress keywords: help me      │
│    Time: 11:30 PM                  │
│                                    │
│    Call them: [phone] or 911"      │
│                                    │
│ • Update session:                  │
│   distress_detected = true         │
│   alert_triggered = true           │
│   distress_keywords = [...]        │
│                                    │
│ Frontend:                          │
│ • NO indication shown to user      │
│ • Call continues normally          │
│ • AI acts naturally (no alarm)     │
└──────────┬─────────────────────────┘
           │
           ▼
┌──────────────────────┐
│ User Ends Call       │
│                      │
│ Frontend:            │
│ POST /api/safety-call│
│      /end/{id}       │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────────────┐
│ Backend: End Session               │
│                                    │
│ SafetyCallManager:                 │
│ • Calculate duration               │
│ • Save conversation JSON           │
│ • Persist to database:             │
│   - Full transcript                │
│   - Distress keywords found        │
│   - Alert ID (if triggered)        │
│   - Start/end times                │
│   - Location                       │
│                                    │
│ Response:                          │
│ {                                  │
│   "session_id": "...",            │
│   "duration_seconds": 180,        │
│   "distress_detected": true,      │
│   "alert_triggered": true,        │
│   "alert_id": 789,                │
│   "conversation_summary": "Call   │
│      lasted 3 minutes. Distress   │
│      detected at 1:30. Alert sent │
│      to 3 contacts."              │
│ }                                  │
└────────────────────────────────────┘
```

#### Key Features

- **Realistic Conversation:** Natural AI voice with conversational responses
- **Deterrent Effect:** Mentions tracking location to scare off potential threats
- **Silent Detection:** Distress keywords trigger alerts without user's knowledge
- **No Indication:** Call appears normal - attacker doesn't know alert was sent
- **Bidirectional Audio:** User hears AI, AI hears user (like real call)
- **Full Logging:** Complete transcript saved for evidence

#### API Endpoints

**1. Start Call**

```bash
POST /api/safety-call/start
Content-Type: application/json
Authorization: Bearer {token}

{
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```

**Response:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "connection": {
    "type": "websocket",
    "url": "wss://your-resource.openai.azure.com/openai/realtime?...",
    "protocol": "azure_realtime"
  },
  "system_instructions": "You are a concerned friend calling to check on...",
  "created_at": "2026-01-16T20:30:00Z"
}
```

**2. Send Transcript (for distress detection)**

```bash
POST /api/safety-call/transcript
Content-Type: application/json
Authorization: Bearer {token}

{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "transcript": "help me please someone",
  "speaker": "user"
}
```

**Response:**
```json
{
  "status": "distress_detected",
  "distress_level": "high",
  "confidence": 0.95,
  "keywords_found": ["help", "help me", "please"],
  "alert_triggered": true,
  "alert_id": 789
}
```

**3. End Call**

```bash
POST /api/safety-call/end/{session_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "duration_seconds": 180,
  "distress_detected": true,
  "alert_triggered": true,
  "alert_id": 789,
  "conversation_summary": "Call lasted 3 minutes. Distress detected and alert sent to contacts.",
  "ended_at": "2026-01-16T20:33:00Z"
}
```

**4. Get Call History**

```bash
GET /api/safety-call/history
Authorization: Bearer {token}
```

**Response:**
```json
{
  "calls": [
    {
      "session_id": "...",
      "start_time": "2026-01-16T20:30:00Z",
      "duration_seconds": 180,
      "distress_detected": true,
      "alert_triggered": true,
      "location": { "latitude": 40.7128, "longitude": -74.0060 }
    }
  ]
}
```

**5. Get Stats**

```bash
GET /api/safety-call/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "total_calls": 15,
  "total_duration_minutes": 45,
  "distress_detected_count": 2,
  "alerts_triggered_count": 1,
  "average_call_duration_seconds": 180,
  "last_call_at": "2026-01-16T20:30:00Z"
}
```

#### Distress Detection in Safety Calls

The Safety Call uses a **4-tier distress detection system**:

**Critical Keywords (Confidence: 0.95):**
- "help me", "someone help", "call 911", "call police"
- "i'm being attacked", "he's following me", "she's following me"

**High Priority (Confidence: 0.75-0.85):**
- "help", "emergency", "danger", "attack"
- "following me", "scared", "threatening"

**Medium Priority (Confidence: 0.50-0.65):**
- "uncomfortable", "nervous", "alone"
- "get away", "stop", "leave me alone"

**Low Priority (Confidence: 0.35):**
- "worried", "anxious", "dark", "afraid"

**Safe Phrases (Override - No Alert):**
- "I'm fine", "I'm okay", "just kidding"
- "everything's fine", "all good"

**Alert Threshold:** Confidence ≥ 0.75 triggers alert

#### AI Conversation Prompt

```
You are a concerned friend calling [Name] to check on their safety.

YOUR ROLE:
- Be warm, natural, and conversational like a REAL friend would be
- Keep responses SHORT (1-2 sentences max)
- Casually mention you're "checking their location" or "following their walk"
- If they seem distressed, subtly offer help WITHOUT alarming potential attackers

CONTEXT:
- User is currently at: [latitude, longitude]
- Time: [time of day]
- They are walking alone

CONVERSATION STYLE:
"Hey! Just wanted to check in - I saw you're out walking. I'm following your
location on the app. Everything going okay?"

IMPORTANT RULES:
- NEVER reveal this is an AI
- Stay in character as their concerned friend
- Be conversational and natural
- Don't be overly dramatic or suspicious
- If they say distress words, stay calm and supportive
- Keep mentioning you're "tracking them" for deterrent effect
```

#### Frontend Implementation

**React Hook: `useSafetyCall.ts`**

```typescript
export function useSafetyCall() {
  const [callActive, setCallActive] = useState(false)
  const [calling, setCalling] = useState(false)
  const [muted, setMuted] = useState(false)
  const [transcript, setTranscript] = useState<string[]>([])
  const [distressDetected, setDistressDetected] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  const startCall = async (location?: {...}) => {
    setCalling(true)

    // 1. Start session
    const response = await api.post('/safety-call/start', { location })
    const { session_id, connection, system_instructions } = response.data
    sessionIdRef.current = session_id

    // 2. Connect WebSocket
    const ws = new WebSocket(connection.url)
    wsRef.current = ws

    ws.onopen = async () => {
      // Configure session
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: system_instructions,
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          turn_detection: { type: 'server_vad', threshold: 0.5 }
        }
      }))

      await startMicrophone()
      setCallActive(true)
      setCalling(false)
    }

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data)

      // User transcript
      if (data.type === 'conversation.item.input_audio_transcription.completed') {
        const userText = `You: ${data.transcript}`
        setTranscript(prev => [...prev, userText])

        // Send to backend for distress detection
        const result = await api.post('/safety-call/transcript', {
          session_id,
          transcript: data.transcript,
          speaker: 'user'
        })

        if (result.data.distress_detected) {
          setDistressDetected(true)
        }
      }

      // AI audio output
      if (data.type === 'response.audio.delta') {
        playAudio(data.delta)
      }

      // AI transcript
      if (data.type === 'response.audio_transcript.done') {
        setTranscript(prev => [...prev, `AI: ${data.transcript}`])
      }
    }
  }

  const startMicrophone = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 24000, channelCount: 1, echoCancellation: true }
    })

    const audioContext = new AudioContext({ sampleRate: 24000 })
    audioContextRef.current = audioContext

    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)

    processor.onaudioprocess = (e) => {
      if (muted) return

      const inputData = e.inputBuffer.getChannelData(0)
      const pcm16 = floatTo16BitPCM(inputData)
      const base64 = arrayBufferToBase64(pcm16)

      wsRef.current?.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64
      }))
    }

    source.connect(processor)
    processor.connect(audioContext.destination)
  }

  const endCall = async () => {
    wsRef.current?.close()
    audioContextRef.current?.close()

    if (sessionIdRef.current) {
      await api.post(`/safety-call/end/${sessionIdRef.current}`)
    }

    setCallActive(false)
    setTranscript([])
    setDistressDetected(false)
  }

  const toggleMute = () => setMuted(!muted)

  return {
    callActive,
    calling,
    muted,
    transcript,
    distressDetected,
    startCall,
    endCall,
    toggleMute
  }
}
```

#### Cost Analysis

**Azure OpenAI Realtime Pricing (as of Jan 2026):**

| Component | Rate | Per 5-min Call |
|-----------|------|----------------|
| Audio Input (Streaming) | ~$0.01/min | $0.05 |
| Audio Output (TTS) | ~$0.02/min | $0.10 |
| Text Tokens (GPT-4o) | ~$0.01/1K tokens | $0.01 |
| **Total** | | **~$0.16** |

**Monthly Estimates:**
- 100 calls/month: ~$16
- 500 calls/month: ~$80
- 1,000 calls/month: ~$160

**Cost Optimization Tips:**
- Use shorter system prompts (fewer tokens)
- Implement call duration limits (e.g., max 10 minutes)
- Cache common AI responses
- Monitor usage and set budget alerts

#### Security & Privacy

- **End-to-End Security:** WebSocket connections use TLS (wss://)
- **Authentication:** JWT required for all endpoints
- **Session Isolation:** Each call gets unique session ID
- **Data Retention:** Transcripts stored encrypted in database
- **Silent Alerts:** No UI indication prevents attacker awareness
- **Location Privacy:** GPS coordinates never sent to Azure (only backend)

#### Testing Checklist

- [ ] Start call and verify WebSocket connection
- [ ] Test microphone audio streaming
- [ ] Verify AI responds naturally in conversation
- [ ] Say distress keyword ("help") and check backend logs
- [ ] Confirm alert created (check database)
- [ ] Verify SMS sent to trusted contacts
- [ ] Test mute functionality
- [ ] End call and verify session saved
- [ ] Check call history endpoint
- [ ] Review conversation transcript in database
- [ ] Test with multiple distress keywords
- [ ] Test safe phrases ("I'm fine") - should NOT trigger alert
- [ ] Verify no UI indication when distress detected

---

## Key Components

### 1. AI Service Class

**Location:** `backend/services/ai_service.py`

```python
class AIService:
    """
    AI Service for audio analysis and safety intelligence.
    Integrates Whisper, MegaLLM, and Azure OpenAI Realtime.
    """

    def __init__(self):
        self.whisper_endpoint = settings.whisper_endpoint
        self.whisper_api_key = settings.whisper_api_key
        self.megallm_endpoint = settings.megallm_endpoint
        self.megallm_api_key = settings.megallm_api_key
        self.megallm_model = settings.megallm_model
        self.test_mode = settings.test_mode

    # Core Methods
    async def transcribe_audio(
        audio_data: bytes,
        filename: str
    ) -> List[WhisperSegment]

    async def analyze_audio_for_distress(
        audio_data: bytes
    ) -> AudioAnalysisResult

    async def analyze_with_llm(
        transcription: str,
        context: str
    ) -> Dict[str, Any]

    async def generate_safety_summary(
        user_name: str,
        session_duration_minutes: int,
        alerts: List[Dict]
    ) -> SafetySummary

    async def chat_safety_assistant(
        message: str,
        conversation_history: List[Dict]
    ) -> str

    async def analyze_location_safety(
        latitude: float,
        longitude: float,
        timestamp: str,
        user_context: str
    ) -> Dict[str, Any]
```

### 2. Data Classes

```python
from dataclasses import dataclass
from enum import Enum

class DistressType(str, Enum):
    SCREAM = "SCREAM"
    HELP_CALL = "HELP_CALL"
    CRYING = "CRYING"
    PANIC = "PANIC"
    NONE = "NONE"

@dataclass
class WhisperSegment:
    text: str
    start: float
    end: float

@dataclass
class AudioAnalysisResult:
    transcription: str
    distress_detected: bool
    distress_type: DistressType
    confidence: float
    keywords_found: List[str]
    segments: List[WhisperSegment]

@dataclass
class SafetySummary:
    summary: str
    risk_level: str  # low, medium, high
    recommendations: List[str]
    alerts_analysis: str
```

---

## Distress Detection Engine

### Keyword Lists

```python
# Primary distress keywords
DISTRESS_KEYWORDS = [
    # Calls for help
    "help", "help me", "someone help", "please help",

    # Commands to stop
    "stop", "let me go", "leave me alone",

    # Negative responses
    "no", "don't", "please don't",

    # Emergency terms
    "emergency", "call 911", "police",
    "fire", "attack", "danger",

    # Fear and pain
    "hurt", "pain", "scared",
    "run", "get away", "save me"
]

# Scream and audio indicators
SCREAM_INDICATORS = [
    "scream", "screaming",
    "yell", "yelling",
    "shout", "shouting",
    "cry", "crying",
    "[scream]", "[screaming]",
    "[yelling]", "[inaudible]",
    "[noise]", "[loud noise]"
]
```

### Classification Algorithm

```python
def classify_distress(
    transcription: str,
    keywords_found: List[str],
    scream_detected: bool
) -> Tuple[DistressType, float]:
    """
    Classify distress type and calculate confidence.

    Priority Order:
    1. Scream indicators (highest confidence)
    2. Explicit help keywords
    3. Crying indicators
    4. Multiple distress keywords (panic)
    5. Single keyword (lower confidence)
    """

    if scream_detected:
        return DistressType.SCREAM, 0.9

    # Check for explicit help
    help_keywords = ["help", "help me", "someone help", "please help"]
    if any(kw in keywords_found for kw in help_keywords):
        return DistressType.HELP_CALL, 0.95

    # Check for crying
    crying_keywords = ["crying", "cry"]
    if any(kw in keywords_found for kw in crying_keywords):
        return DistressType.CRYING, 0.7

    # Multiple keywords = panic
    if len(keywords_found) >= 2:
        return DistressType.PANIC, 0.8

    # Single keyword = lower confidence panic
    if len(keywords_found) == 1:
        return DistressType.PANIC, 0.6

    # No distress
    return DistressType.NONE, 0.0
```

### Confidence Thresholds

| Distress Type | Confidence | Alert Triggered (≥0.8) |
|--------------|-----------|----------------------|
| SCREAM | 0.9 | ✅ Yes |
| HELP_CALL | 0.95 | ✅ Yes |
| PANIC (multiple keywords) | 0.8 | ✅ Yes |
| CRYING | 0.7 | ❌ No (logged only) |
| PANIC (single keyword) | 0.6 | ❌ No (logged only) |
| NONE | 0.0 | ❌ No |

**Default Threshold:** `ALERT_CONFIDENCE_THRESHOLD = 0.8`

---

## Alert Flow

### Complete Alert Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│                    ALERT LIFECYCLE                              │
└────────────────────────────────────────────────────────────────┘

1. Detection
   ↓
   Audio/Text analyzed → Distress detected → Confidence ≥ 0.8

2. Alert Creation
   ↓
   Create Alert record in database
   {
     user_id: 123,
     type: HELP_CALL,
     confidence: 0.95,
     status: PENDING,
     location_lat: 40.7128,
     location_lng: -74.0060,
     countdown_started_at: 2026-01-15T20:30:00Z,
     countdown_expires_at: 2026-01-15T20:30:05Z
   }

3. Countdown Start
   ↓
   Background task: alert_manager.start_alert_countdown(alert_id)

   Timer: 5 seconds (default)

   Frontend shows:
   ┌──────────────────────────┐
   │  ⚠️  EMERGENCY DETECTED  │
   │                          │
   │  Triggering in 5s...     │
   │                          │
   │  [  CANCEL ALERT  ]      │
   └──────────────────────────┘

4. User Decision
   ↓
   ┌─────────────────┬─────────────────┐
   │  User Cancels   │ Countdown Expires│
   └────────┬────────┴────────┬─────────┘
            │                 │
            ▼                 ▼
   ┌────────────────┐  ┌──────────────┐
   │ Update Alert   │  │ Trigger SMS  │
   │ status =       │  │              │
   │ CANCELLED      │  │ status =     │
   │                │  │ TRIGGERED    │
   │ cancelled_at = │  │              │
   │ timestamp      │  │ triggered_at=│
   │                │  │ timestamp    │
   └────────────────┘  └──────┬───────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Send SMS to ALL  │
                    │ Trusted Contacts │
                    │                  │
                    │ "EMERGENCY ALERT │
                    │ from {name}      │
                    │                  │
                    │ Location:        │
                    │ {coordinates}    │
                    │ {google_maps}    │
                    │                  │
                    │ Type: {type}     │
                    │ Time: {time}     │
                    │                  │
                    │ Call: {phone}    │
                    │ or 911"          │
                    └──────────────────┘
```

### Alert Manager Service

**Location:** `backend/services/alert_manager.py`

```python
class AlertManager:
    """Manages alert countdowns and triggering."""

    def __init__(self):
        self.pending_alerts: Dict[int, asyncio.Task] = {}

    async def start_alert_countdown(self, alert_id: int) -> bool:
        """
        Start countdown timer for alert.
        Persists countdown state to database.
        """
        db = SessionLocal()
        try:
            alert = db.query(Alert).filter(Alert.id == alert_id).first()
            if not alert:
                return False

            # Persist countdown timestamps
            now = datetime.utcnow()
            expires_at = now + timedelta(seconds=settings.alert_countdown_seconds)

            alert.countdown_started_at = now
            alert.countdown_expires_at = expires_at
            db.commit()

            # Create countdown task
            task = asyncio.create_task(self._countdown_and_trigger(alert_id))
            self.pending_alerts[alert_id] = task

            return True
        finally:
            db.close()

    async def _countdown_and_trigger(self, alert_id: int):
        """Wait for countdown and trigger if not cancelled."""
        try:
            await asyncio.sleep(settings.alert_countdown_seconds)

            # Check if alert still pending
            db = SessionLocal()
            try:
                alert = db.query(Alert).filter(Alert.id == alert_id).first()

                if alert and alert.status == AlertStatus.PENDING:
                    await self._trigger_alert(alert_id, db)
            finally:
                db.close()
        finally:
            # Cleanup
            self.pending_alerts.pop(alert_id, None)

    async def _trigger_alert(self, alert_id: int, db: Session):
        """Trigger alert and send SMS to trusted contacts."""
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            return

        # Update alert status
        alert.status = AlertStatus.TRIGGERED
        alert.triggered_at = datetime.utcnow()
        db.commit()

        # Send SMS to trusted contacts
        user = alert.user
        contacts = user.trusted_contact_list  # New TrustedContact model

        if not contacts and user.trusted_contacts:
            # Fallback to legacy JSON field
            contacts_data = user.trusted_contacts
        else:
            contacts_data = [
                {"phone": c.phone, "name": c.name}
                for c in contacts if c.is_active
            ]

        for contact in contacts_data:
            send_emergency_sms(
                to_phone=contact["phone"],
                user=user,
                alert=alert
            )

    async def cancel_alert(self, alert_id: int) -> bool:
        """Cancel pending alert."""
        # Cancel background task
        task = self.pending_alerts.pop(alert_id, None)
        if task:
            task.cancel()

        # Update database
        db = SessionLocal()
        try:
            alert = db.query(Alert).filter(Alert.id == alert_id).first()
            if alert and alert.status == AlertStatus.PENDING:
                alert.status = AlertStatus.CANCELLED
                alert.cancelled_at = datetime.utcnow()
                db.commit()
                return True
        finally:
            db.close()

        return False

    async def recover_pending_alerts(self) -> int:
        """
        Recover pending alerts from database after server restart.
        Called on startup.
        """
        db = SessionLocal()
        try:
            now = datetime.utcnow()

            # Find alerts with unexpired countdowns
            pending = db.query(Alert).filter(
                Alert.status == AlertStatus.PENDING,
                Alert.countdown_expires_at.isnot(None),
                Alert.countdown_expires_at > now
            ).all()

            # Find expired alerts that need triggering
            expired = db.query(Alert).filter(
                Alert.status == AlertStatus.PENDING,
                Alert.countdown_expires_at.isnot(None),
                Alert.countdown_expires_at <= now
            ).all()

            recovered = 0

            # Re-schedule pending alerts
            for alert in pending:
                time_remaining = (alert.countdown_expires_at - now).total_seconds()
                if time_remaining > 0:
                    task = asyncio.create_task(
                        self._countdown_with_remaining_time(alert.id, time_remaining)
                    )
                    self.pending_alerts[alert.id] = task
                    recovered += 1

            # Trigger expired alerts immediately
            for alert in expired:
                await self._trigger_alert(alert.id, db)
                recovered += 1

            return recovered
        finally:
            db.close()

# Global instance
alert_manager = AlertManager()
```

### Alert Recovery on Restart

```python
# In main.py startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting Protego Backend...")

    # Recover pending alerts
    recovered = await alert_manager.recover_pending_alerts()
    logger.info(f"🔄 Recovered {recovered} pending alerts")

    yield

    # Shutdown
    logger.info("👋 Shutting down...")
```

---

## API Reference

### AI Endpoints Summary

| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|-----------|
| `/api/ai/analyze/audio` | POST | One-time audio analysis | 50/hour |
| `/api/ai/analyze/text` | POST | Quick text analysis | 100/hour |
| `/api/ai/chat` | POST | Chat with AI assistant | 30/hour |
| `/api/ai/summary/session/{id}` | GET | Session safety summary | - |
| `/api/ai/summary/latest` | GET | Latest session summary | - |
| `/api/ai/analyze/location` | POST | Location safety analysis | 100/hour |
| `/api/ai/tips` | GET | Get safety tips | - |
| `/api/ai/status` | GET | AI service status | - |
| `/api/ai/realtime/config` | GET | WebSocket config | - |
| **`/api/safety-call/start`** 🆕 | **POST** | **Start AI safety call** | **-** |
| **`/api/safety-call/transcript`** 🆕 | **POST** | **Process call transcript** | **-** |
| **`/api/safety-call/end/{id}`** 🆕 | **POST** | **End safety call** | **-** |
| **`/api/safety-call/history`** 🆕 | **GET** | **Get call history** | **-** |
| **`/api/safety-call/stats`** 🆕 | **GET** | **Get call statistics** | **-** |
| **`/api/safety-call/active`** 🆕 | **GET** | **Get active call count** | **-** |

### Authentication

All endpoints require authentication via:

**Method 1: httpOnly Cookie (Recommended)**
```bash
# Cookie set automatically by backend on login
# Sent automatically by browser
```

**Method 2: Bearer Token (Backward Compatible)**
```bash
Authorization: Bearer {access_token}
```

### Common Request/Response Schemas

#### AudioAnalysisResponse
```typescript
{
  transcription: string
  distress_detected: boolean
  distress_type: "SCREAM" | "HELP_CALL" | "CRYING" | "PANIC" | "NONE"
  confidence: number  // 0.0 - 1.0
  keywords_found: string[]
  alert_triggered: boolean
  alert_id: number | null
}
```

#### QuickAnalysisResponse
```typescript
{
  is_emergency: boolean
  confidence: number
  distress_type: string
  analysis: string
  recommended_action: "trigger_alert" | "monitor" | "none"
}
```

#### ChatResponse
```typescript
{
  response: string
  timestamp: string  // ISO 8601
}
```

#### SafetySummaryResponse
```typescript
{
  summary: string
  risk_level: "low" | "medium" | "high"
  recommendations: string[]
  alerts_analysis: string
  session_duration_minutes: number
  total_alerts: number
}
```

#### LocationSafetyResponse
```typescript
{
  safety_score: number  // 0-100
  status: "safe" | "caution" | "alert"
  risk_level: "low" | "medium" | "high"
  factors: string[]
  recommendations: string[]
  time_context: {
    hour: number
    is_night: boolean
    is_late_night: boolean
    day_of_week: string
  }
  analyzed_at: string  // ISO 8601
}
```

---

## Configuration

### Environment Variables

**Location:** `backend/.env`

```bash
# ===========================================
# AI Services Configuration
# ===========================================

# Whisper API (Chutes AI) - Audio transcription
WHISPER_ENDPOINT=https://chutes-whisper-large-v3.chutes.ai/transcribe
WHISPER_API_KEY=your_chutes_api_key_here

# MegaLLM API - Text analysis and chat
MEGALLM_ENDPOINT=https://ai.megallm.io/v1/chat/completions
MEGALLM_API_KEY=your_megallm_api_key_here
MEGALLM_MODEL=claude-sonnet-4-5-20250929

# Azure OpenAI Realtime - Real-time audio monitoring & safety calls
AZURE_OPENAI_REALTIME_ENDPOINT=wss://your-resource.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your_azure_api_key_here
AZURE_OPENAI_REALTIME_DEPLOYMENT=gpt-4o-realtime-preview

# ===========================================
# Safety Call Configuration 🆕
# ===========================================

# Enable/disable safety call feature
SAFETY_CALL_ENABLED=true

# Maximum call duration in minutes (to prevent runaway costs)
SAFETY_CALL_MAX_DURATION_MINUTES=10

# Distress detection confidence threshold for safety calls
SAFETY_CALL_ALERT_THRESHOLD=0.75

# ===========================================
# Alert Configuration
# ===========================================

# Confidence threshold (0.0-1.0) for triggering alerts
ALERT_CONFIDENCE_THRESHOLD=0.8

# Countdown seconds before alert is triggered
ALERT_COUNTDOWN_SECONDS=5

# ===========================================
# Testing
# ===========================================

# Test mode prevents real SMS and simulates AI responses
TEST_MODE=false  # IMPORTANT: Set to false in production!
```

### Settings Class

**Location:** `backend/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # AI Services
    whisper_endpoint: str
    whisper_api_key: str
    megallm_endpoint: str
    megallm_api_key: str
    megallm_model: str = "claude-sonnet-4-5-20250929"
    azure_openai_realtime_endpoint: str = ""
    azure_openai_realtime_api_key: str = ""
    azure_openai_realtime_deployment: str = "gpt-4o-realtime-preview"

    # Alert Configuration
    alert_confidence_threshold: float = 0.8
    alert_countdown_seconds: int = 5

    # Testing
    test_mode: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False
    )

settings = Settings()
```

---

## Rate Limiting

All AI endpoints are rate-limited using `slowapi` to prevent abuse.

### Rate Limit Configuration

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

### Endpoint Limits

| Endpoint | Limit | Reason |
|----------|-------|--------|
| `/api/ai/analyze/audio` | 50/hour | CPU-intensive transcription |
| `/api/ai/analyze/text` | 100/hour | Moderate LLM usage |
| `/api/ai/chat` | 30/hour | Conversational, prevent spam |
| `/api/ai/analyze/location` | 100/hour | Quick heuristic + LLM |

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "error": "Rate limit exceeded: 50 per 1 hour"
}
```

**HTTP Status:** `429 Too Many Requests`

### Bypass Rate Limiting

For development or testing:

```python
# In main.py, comment out rate limiter
# app.state.limiter = limiter
```

---

## Test Mode

### Overview

Test mode allows development without consuming AI API credits or sending real SMS alerts.

### Enabling Test Mode

```bash
# In .env
TEST_MODE=true
```

### Test Mode Behavior

#### Whisper Transcription
```python
if test_mode:
    return [WhisperSegment(
        text="[Test transcription - AI service in test mode]",
        start=0.0,
        end=1.0
    )]
```

#### MegaLLM Analysis
```python
if test_mode:
    return {
        "is_emergency": False,
        "confidence": 0.5,
        "analysis": "Test mode - no actual analysis performed",
        "recommended_action": "none"
    }
```

#### Chat Assistant
```python
if test_mode:
    return (
        "I'm Protego's AI safety assistant. "
        "I can help you with safety tips and guidance. "
        "How can I help you stay safe today?"
    )
```

#### Location Safety
```python
if test_mode:
    # Use heuristic-based analysis
    # No LLM API call
    safety_score = 85
    if is_late_night:
        safety_score -= 25

    return {
        "safety_score": safety_score,
        "status": "caution",
        "factors": ["Time-based heuristic analysis"],
        "recommendations": ["Stay alert"]
    }
```

### Production Validation

The backend validates that test mode is disabled in production:

```python
def validate_production_config(self) -> None:
    if self.is_production and self.test_mode:
        raise ValueError(
            "CRITICAL: test_mode is enabled in production! "
            "This will prevent real alerts. "
            "Set TEST_MODE=false in .env"
        )

# Called on startup
settings.validate_production_config()
```

---

## Performance Metrics

### AI Service Latency

| Service | Typical Latency | Max Latency |
|---------|----------------|-------------|
| Whisper Transcription | 2-5 seconds | 10 seconds |
| MegaLLM Text Analysis | 1-2 seconds | 5 seconds |
| MegaLLM Chat | 2-3 seconds | 8 seconds |
| MegaLLM Summary | 2-4 seconds | 10 seconds |
| MegaLLM Location | 1-3 seconds | 7 seconds |
| Azure Realtime | 500ms | 2 seconds |

### End-to-End Timing

**One-Time Audio Analysis:**
```
User stops recording → Upload (500ms) → Transcription (3s) →
Detection (100ms) → Alert creation (50ms) → UI update (50ms)

Total: ~3.7 seconds
```

**Real-Time Monitoring:**
```
User speaks "help" → VAD detection (200ms) → Transcription (300ms) →
AI analysis (500ms) → Alert creation (50ms) → UI update (50ms)

Total: ~1.1 seconds
```

### Cost Optimization

- **Caching:** Redis caches AI results for identical inputs (5-minute TTL)
- **Rate Limiting:** Prevents API abuse and cost spikes
- **Test Mode:** Development without API costs
- **Efficient Prompts:** Minimal token usage with focused prompts

---

## Troubleshooting

### Common Issues

#### 1. Whisper API Returns Empty Response

**Symptom:** Audio analysis returns no transcription

**Causes:**
- Audio file too short (<1 second)
- Unsupported audio format
- API key invalid
- Network timeout

**Solution:**
```python
# Check audio duration
if len(audio_data) < 16000:  # ~1 second at 16kHz
    raise HTTPException(400, "Audio too short")

# Verify API key
if not settings.whisper_api_key:
    logger.error("Whisper API key not configured")
```

#### 2. Azure Realtime WebSocket Connection Fails

**Symptom:** WebSocket connection rejected

**Causes:**
- Invalid API key
- Wrong deployment name
- Endpoint URL incorrect
- CORS issues

**Solution:**
```typescript
// Check config response
const config = await aiAPI.getRealtimeConfig();
console.log('WebSocket URL:', config.ws_url);

// Verify connection
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  // Check: API key valid? Endpoint correct?
};
```

#### 3. Rate Limit Exceeded

**Symptom:** 429 Too Many Requests

**Causes:**
- Too many requests from same IP
- Development testing without limits

**Solution:**
```python
# Temporarily disable rate limiting for development
# In main.py:
# app.state.limiter = limiter  # Comment out
```

#### 4. False Positive Alerts

**Symptom:** Alerts triggered by normal conversation

**Causes:**
- Confidence threshold too low
- Keywords in normal speech
- Background noise

**Solution:**
```bash
# Increase confidence threshold
ALERT_CONFIDENCE_THRESHOLD=0.85  # Default: 0.8
```

#### 5. Test Mode Enabled in Production

**Symptom:** No real alerts sent

**Causes:**
- TEST_MODE=true in production .env

**Solution:**
```bash
# Check .env file
TEST_MODE=false

# Backend will throw error on startup if enabled in production
```

---

## Summary Table

### AI Services Comparison

| Feature | Whisper | MegaLLM | Azure Realtime (Monitoring) | Azure Realtime (Safety Call) 🆕 |
|---------|---------|---------|----------------|----------------|
| **Purpose** | Transcription | Analysis/Chat | Live Monitoring | AI Phone Call |
| **Input** | Audio file | Text | Audio stream | Bidirectional audio |
| **Output** | Text + timestamps | JSON/Natural | JSON + transcript | AI conversation + alerts |
| **Latency** | 2-5 seconds | 1-3 seconds | 500ms | 500ms |
| **Cost** | Low | Medium | High | Very High (~$0.16/5min) |
| **When to Use** | One-time analysis | Text analysis, chat | Continuous monitoring | Deterrent situations |
| **Best For** | Post-recording | Recommendations, summaries | Real-time detection | Fake call with AI friend |

### AI Modes Comparison

| Mode | Technology | Use Case | User Action | Alert Trigger |
|------|-----------|----------|-------------|---------------|
| **One-Time Analysis** | Whisper + Rules | Record short audio for analysis | Manual recording | Keywords (0.8+ confidence) |
| **Real-Time Monitoring** | Azure Realtime | Continuous monitoring during walk | Enable monitoring | AI analysis + keywords |
| **Text Analysis** | MegaLLM | Analyze typed/spoken text | Type or speak text | AI determines emergency |
| **Safety Call** 🆕 | Azure Realtime | Fake phone call deterrent | Start safety call | Silent detection (0.75+) |

### Deployment Checklist

Before deploying AI features to production:

- [ ] Set `TEST_MODE=false` in production `.env`
- [ ] Verify all API keys are production keys
- [ ] Set `ALERT_CONFIDENCE_THRESHOLD` appropriately (0.8 recommended)
- [ ] Set `ALERT_COUNTDOWN_SECONDS` appropriately (5 recommended)
- [ ] **🆕 Set `SAFETY_CALL_ENABLED=true` if enabling safety calls**
- [ ] **🆕 Set `SAFETY_CALL_MAX_DURATION_MINUTES` to prevent cost overruns**
- [ ] **🆕 Set `SAFETY_CALL_ALERT_THRESHOLD` (0.75 recommended)**
- [ ] Configure Sentry for error tracking
- [ ] Test audio analysis with real recordings
- [ ] Test real-time monitoring WebSocket connection
- [ ] **🆕 Test safety call end-to-end (start, converse, distress detection, alert)**
- [ ] **🆕 Verify safety call transcripts saved to database**
- [ ] **🆕 Test safety call silent alert triggering (no UI indication)**
- [ ] Verify rate limits are appropriate
- [ ] Test alert recovery after server restart
- [ ] Ensure trusted contacts receive SMS (end-to-end test)

---

## Additional Resources

### Documentation Links

- **Whisper API (Chutes):** https://chutes.ai/docs
- **MegaLLM API:** https://docs.megallm.io
- **Azure OpenAI Realtime:** https://learn.microsoft.com/azure/ai-services/openai/realtime-audio

### Related Protego Documentation

- [COMPLETE_IMPLEMENTATION_REPORT.md](./COMPLETE_IMPLEMENTATION_REPORT.md) - Full implementation details
- [E2E_TEST_GUIDE.md](./E2E_TEST_GUIDE.md) - Testing procedures
- [IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md) - Security improvements
- [backend/services/ai_service.py](./backend/services/ai_service.py) - AI service source code
- [backend/routers/ai.py](./backend/routers/ai.py) - AI endpoints
- **🆕 [SAFETY_CALL_IMPLEMENTATION.md](./SAFETY_CALL_IMPLEMENTATION.md) - Safety Call technical documentation**
- **🆕 [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) - Safety Call completion summary**
- **🆕 [backend/services/safety_call/](./backend/services/safety_call/) - Safety Call service layer**
- **🆕 [backend/routers/safety_call.py](./backend/routers/safety_call.py) - Safety Call API endpoints**

---

**Document Version:** 2.0
**Last Updated:** 2026-01-16
**Maintained By:** Protego Development Team

**Changelog:**
- **v2.0 (2026-01-16):** Added AI Safety Call feature documentation
- **v1.0 (2026-01-15):** Initial comprehensive AI usage guide
