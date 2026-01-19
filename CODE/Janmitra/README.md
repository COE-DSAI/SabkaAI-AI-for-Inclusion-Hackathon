# Janmitra

**Web voice companion that helps rural Indians access government schemes, financial info, and local support — in their own dialect, over a web browser.**

A real-time voice AI bot accessible via web browser. Users open the web client, speak in Hindi or Bundeli dialect, and receive factual answers to questions about government schemes, loans, Aadhaar, grievances, and more. The bot provides helpful, sourced information while maintaining strict safety and accuracy standards.

## Core Features

- **Web Access**: Browser-based entry point for rural users with internet access
- **Dialect Support**: Speaks and understands Hindi and Bundeli dialects
- **Factual Answers**: Always cites sources; answers from verified government data (PM-Kisan, RBI, DBT Bharat, CPGRAMS)
- **Voice Interaction**: Real-time speech-to-speech using Google Gemini Live
- **Low-Cost Operation**: Optimized for WebRTC, Gemini API, and local hosting

## Target Users

- Rural citizens (300M+ in India) with low digital literacy but internet access
- Pain points: Middlemen exploitation, long queues, language barriers in existing systems

## Tech Stack

- **WebRTC**: SmallWebRTCTransport (peer-to-peer WebRTC for real-time bidirectional audio)
- **Framework**: Pipecat (orchestrates pipeline, handles audio frames, VAD, interruptions)
- **LLM/Voice AI**: Sarvam AI (end-to-end speech-to-speech)
  - Model: `Bulbul V2`
  - Voice: Vidya
  - Config: AUDIO modality, Multiple Indian Languages tuned via system prompt
- **Voice Activity Detection**: Silero VAD with custom parameters
- **Deployment**: Local server or containerized with Docker
  - Receives WebRTC connection → runs Pipecat pipeline → streams to/from Gemini Live

## Key Constraints & Guardrails

- **Dialect Enforcement**: Can speak in multiple Indian languages and dialects
- **Factual Only**: No medical advice, astrology, politics; always cite sources verbally
- **Safety Blocks**: Off-topic intents filtered out
- **PII Redaction**: Logs scrubbed of personal data
- **Cost Optimization**: Minimal API calls, efficient prompts

## Current MVP Scope

- **Languages**: Hindi and Bundeli dialects
- **Intents**: Scheme info, loan/pension status, Aadhaar help, grievance filing, directory lookup
- **Data Sources**: Static knowledge base (dynamic sources planned)
- **Tools**: None implemented (tool-based features planned for future development)

## Architecture

```
Web Browser → WebRTC → Pipecat Pipeline → Gemini Live → Response
```

### Components

- **SmallWebRTC Integration**: Peer-to-peer WebRTC for audio streaming with audio in/out enabled
- **Pipecat Pipeline**: Handles VAD, turn detection, context aggregation
- **Gemini Live Service**: Unified STT + LLM + TTS
- **Context Management**: LLMContext with conversation history and system instructions

## Setup and Deployment

### Prerequisites

- Python 3.12+
- Sarvam AI API key

### 1. Environment Setup

Clone and configure:

```bash
git clone <repo-url>
cd janmitra
cp env.example .env
```

Edit `.env`:

```ini
SARVAM_AI_API_KEY=your_sarvam_ai_api_key
# Add other secrets as needed
```

### 2. Install Dependencies

```bash
uv sync
```

### 3. Run the Bot

```bash
uv run janmitra_bot.py --transport webrtc
```

The server starts SmallWebRTC and listens for WebRTC connections on a local port.

### 4. Open Web Client

Open `web_client.html` in a web browser to connect and start voice chat.

### 5. Deployment

**Local**:

Run the bot locally and open the web client in a browser.

**Docker**:

```bash
docker build -t janmitra-bot .
docker run -p 8080:8080 --env-file .env janmitra-bot
```

**Docker Compose**:

```bash
docker-compose up
```

## Development

### Code Structure

- `janmitra_bot.py`: Main bot logic, pipeline setup, Sarvam AI integration
- `web_client.html`: Browser-based WebRTC client
- `pyproject.toml`: Python project configuration and dependencies
- `docker-compose.yml`: Container orchestration

### Language/Dialect Tuning

Update system prompt in `janmitra_bot.py`:

```python
system_instruction = "You are Janmitra, a helpful voice assistant for rural Indians. Speak in multiple Indian languages and dialects. Provide factual information about government schemes, loans, and services. Cite sources when possible."
```

### Testing

- Use local WebRTC client (`web_client.html`)
- Monitor logs for PII redaction and conversation flow
- Test with Hindi/Bundeli speech input

## Roadmap

### Phase 1 (Current): Core Voice Assistant
- ✅ Voice interaction
- ✅ Factual government information responses
- ✅ WebRTC browser connectivity
- ✅ Docker deployment

### Phase 2 (Next): Tool Integration
- 🔄 Implement RAG system for government document search
- 🔄 Add API integrations for live data (scheme eligibility, status checks)
- 🔄 Build transfer logic for officer directory lookup
- 🔄 Add grievance filing assistance

### Phase 3: Enhanced Features
- 📋 Expand to more Indian languages/dialects (Telugu, Awadhi, etc.)
- 📋 WhatsApp integration for outbound reminders
- 📋 Analytics dashboard for government officials
- 📋 Visual interface companion for WhatsApp

### Phase 4: Scale & Impact
- 📋 Multi-tenant deployment for different regions
- 📋 Offline capability for low-connectivity areas
- 📋 Integration with government databases
- 📋 User feedback and improvement loops

## Contributing

- Follow Livekit best practices for voice agents
- Ensure all responses are factual and sourced
- Test with web client and multiple language inputs
- Maintain dialect accuracy and cultural sensitivity

## License

BSD 2-Clause License

---

Built for rural India with Livekit and Sarvam AI.</content>
<parameter name="filePath">/home/saury/Projects/Janmitra/yayitworks/README.md
