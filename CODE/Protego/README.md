# Protego - Personal Safety App

**Advanced AI-powered safety monitoring system with real-time distress detection, live tracking, and emergency response.**

## The Team
- Anay Gupta
- Tejas Bal
- Athrv Aggarwal
- Danish Dhanjal
- Mannat Kaur

---

## 🚀 Quick Start

### Prerequisites
- **Backend**: Python 3.11+, PostgreSQL 14+
- **Frontend**: Node.js 18+, npm/yarn
- **AI Services**: API keys for Whisper, MegaLLM, Azure OpenAI (optional)

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
nano .env  # Edit with your configuration

# 5. Setup database
python reset_database.py  # Creates fresh database with all tables

# 6. Start server
uvicorn main:app --reload
```

Backend will be available at http://localhost:8000
API docs at http://localhost:8000/docs

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Frontend will be available at http://localhost:5173

---

## 📚 Features

### Core Safety Features

#### 1. Walk Mode
- Start/stop safety monitoring sessions
- Real-time location tracking
- Auto-start/stop with geofencing
- Countdown timer before stopping
- Session history and analytics

#### 2. Safe Locations 🆕
- Define safe zones (home, work, etc.)
- Point + radius geofencing (10-5000m)
- Auto-start walk when leaving safe location
- Auto-stop walk when entering (with 2-min countdown)
- Max 10 locations per user
- Google Maps integration

#### 3. Duress Password System 🆕
- **Dual password authentication** (main + duress)
- **Main password**: Actually stops walk mode
- **Duress password**: Frontend shows stopped, backend continues in silent mode
- Silent emergency alerts to all trusted contacts
- Live tracking link sent via SMS
- Contacts warned not to call user
- No indication which password was used

#### 4. AI Safety Call 🆕
- **Fake Phone Call**: AI acts as concerned friend checking on you
- **Deterrent Effect**: Makes threats think someone is monitoring you
- **Distress Detection**: Analyzes your speech for danger keywords
- **Silent Alerts**: Automatically notifies contacts if distress detected
- **Natural Conversation**: AI mentions tracking your location
- **Real-time Audio**: Azure OpenAI Realtime API for instant responses

#### 5. AI-Powered Distress Detection
- **Audio Analysis**: Detect screams, cries, calls for help
- **Real-Time Monitoring**: WebSocket-based continuous listening
- **Text Analysis**: Analyze text for emergency situations
- **Safety Assistant**: Chat with AI for safety tips
- **Location Analysis**: Time-based safety assessment
- See [AI_USAGE_FLOW.md](AI_USAGE_FLOW.md) for complete details

#### 6. Emergency Alerts
- 5-second countdown (cancellable)
- SMS to all trusted contacts
- Google Maps location link
- Alert history and management
- Persistent countdown (survives server restart)

#### 7. Live Tracking 🆕
- Public tracking page (no auth required)
- Real-time location updates (every 10 seconds)
- Auto-refresh toggle
- Token-based secure access (32-byte random)
- Only active during duress alerts
- Access: `https://app.protego.com/track/{token}`

---

## 🏗️ Architecture

### Tech Stack

**Backend:**
- FastAPI (Python) - High-performance async API
- PostgreSQL - Relational database
- SQLAlchemy - ORM
- Twilio - SMS notifications
- Bcrypt - Password hashing
- JWT - Authentication
- SlowAPI - Rate limiting

**Frontend:**
- Next.js 15 (App Router) - React framework
- TypeScript - Type safety
- Tailwind CSS - Styling
- Lucide React - Icons
- Axios - HTTP client

**AI Services:**
- Whisper (Chutes AI) - Audio transcription
- MegaLLM (Claude-Opus-4.5) - Text analysis & chat
- Azure OpenAI Realtime - Live audio monitoring & safety calls

### Database Schema

```
users
├── id, name, email, phone
├── password_hash (main)
├── duress_password_hash (optional) 🆕
└── relationships: trusted_contacts, walk_sessions, alerts, safe_locations

trusted_contacts
├── id, user_id
├── name, phone, email
├── contact_relationship (parent, friend, etc.)
├── priority, is_active, is_verified
└── relationship: user

walk_sessions
├── id, user_id
├── start_time, end_time, active
├── mode (manual, auto_geofence, silent) 🆕
├── started_by_geofence, safe_location_id 🆕
├── location_lat, location_lng
└── relationships: user, alerts, safe_location

alerts
├── id, user_id, session_id
├── type (SCREAM, FALL, DISTRESS, PANIC, SOS, DURESS 🆕, etc.)
├── confidence, status (PENDING, TRIGGERED, CANCELLED, SAFE)
├── is_duress (true if duress password used) 🆕
├── live_tracking_token (for public tracking) 🆕
├── location_lat, location_lng
├── countdown_started_at, countdown_expires_at
└── relationships: user, session

safe_locations 🆕
├── id, user_id
├── name, latitude, longitude
├── radius_meters (10-5000m, default 100m)
├── is_active, auto_start_walk, auto_stop_walk
├── notes, created_at, updated_at
└── relationship: user

safety_call_sessions 🆕
├── id, user_id, session_id (UUID)
├── start_time, end_time, duration_seconds
├── start_location_lat, start_location_lng
├── distress_detected, distress_keywords[]
├── alert_triggered, alert_id
├── conversation_json (full transcript)
└── relationships: user, alert
```

---

## 🔐 Security Features

### Authentication
- JWT tokens with httpOnly cookies
- Bcrypt password hashing (12 rounds)
- Session management with expiry
- Rate limiting on sensitive endpoints

### Duress System 🆕
- Separate duress password (must differ from main)
- Silent mode: frontend shows stopped, backend continues
- No indication which password was used
- Immediate SMS alerts without user interaction
- Live tracking without revealing duress state
- 32-byte random tokens (256-bit security)

### Data Protection
- SQL injection prevention (SQLAlchemy ORM)
- XSS protection (input sanitization)
- CORS configuration (allowed origins only)
- Rate limiting (SlowAPI)
- Password validation (min 6 chars, complexity)

---

## 🛠️ Database Setup

### Fresh Installation

```bash
cd backend
python reset_database.py
```

This will:
1. Drop all existing tables and enums
2. Recreate everything from SQLAlchemy models
3. Include all features (safe locations, duress, etc.)

**⚠️ WARNING**: This deletes all data! Only for development/testing.

### Manual PostgreSQL Setup

```bash
# Create database and user
sudo -u postgres psql
CREATE USER protego_user WITH PASSWORD 'protego_pass';
CREATE DATABASE protego OWNER protego_user;
GRANT ALL PRIVILEGES ON DATABASE protego TO protego_user;
\q

# Verify connection
psql postgresql://protego_user:protego_pass@localhost:5432/protego -c "SELECT version();"
```

### Verify Schema

```bash
# List tables
psql $DATABASE_URL -c "\dt"

# Expected tables:
#  - users
#  - trusted_contacts
#  - walk_sessions
#  - alerts
#  - safe_locations 🆕

# Check enum types
psql $DATABASE_URL -c "\dT"

# Expected enums:
#  - alertstatus (PENDING, CANCELLED, TRIGGERED, SAFE)
#  - alerttype (SCREAM, FALL, DISTRESS, PANIC, SOS, DURESS 🆕, etc.)
#  - walkmode (manual, auto_geofence, silent) 🆕
```

---

## 🔧 Configuration

### Backend Environment Variables

Create `backend/.env` from `backend/.env.example`:

```bash
# Database
DATABASE_URL=postgresql://protego_user:protego_pass@localhost:5432/protego

# Twilio SMS
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM=+1234567890

# Security
SECRET_KEY=your-super-secret-key-min-32-chars
ALGORITHM=HS256

# Alert Configuration
ALERT_CONFIDENCE_THRESHOLD=0.8
ALERT_COUNTDOWN_SECONDS=5

# AI Services (Optional - see AI_USAGE_FLOW.md)
WHISPER_ENDPOINT=https://chutes-whisper-large-v3.chutes.ai/transcribe
WHISPER_API_KEY=your_key
MEGALLM_ENDPOINT=https://ai.megallm.io/v1/chat/completions
MEGALLM_API_KEY=your_key
MEGALLM_MODEL=claude-sonnet-4-5-20250929
AZURE_OPENAI_REALTIME_ENDPOINT=wss://your-resource.openai.azure.com
AZURE_OPENAI_REALTIME_API_KEY=your_key

# Frontend URL (for live tracking links) 🆕
FRONTEND_URL=http://localhost:5173

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Environment
ENVIRONMENT=development
TEST_MODE=false  # IMPORTANT: false in production!
```

---

## 📡 API Reference

### Authentication Endpoints

```
POST   /api/users/signup          - Create new user
POST   /api/users/signin          - Login (returns JWT)
POST   /api/users/signout         - Logout
GET    /api/users/me              - Get current user
```

### Walk Session Endpoints

```
POST   /api/walk/start            - Start walk session
POST   /api/walk/stop             - Stop walk session (with password) 🆕
GET    /api/walk/active           - Get active session
GET    /api/walk/history          - Get session history
```

### Safe Locations Endpoints 🆕

```
GET    /api/safe-locations/                 - List all safe locations
POST   /api/safe-locations/                 - Create safe location
GET    /api/safe-locations/{id}             - Get specific location
PATCH  /api/safe-locations/{id}             - Update location
DELETE /api/safe-locations/{id}             - Delete location
POST   /api/safe-locations/check-geofence   - Check if inside safe zone
POST   /api/safe-locations/nearest          - Find nearest location
```

### Duress Password Endpoints 🆕

```
POST   /api/users/duress-password/set       - Set/update duress password
DELETE /api/users/duress-password           - Remove duress password
GET    /api/users/duress-password/status    - Check if configured
```

### Safety Call Endpoints 🆕

```
POST   /api/safety-call/start               - Start AI safety call
POST   /api/safety-call/transcript          - Handle user transcript
POST   /api/safety-call/end/{session_id}    - End safety call
GET    /api/safety-call/history             - Get call history
GET    /api/safety-call/stats               - Get call statistics
GET    /api/safety-call/active              - Get active session count
```

### Live Tracking (Public - No Auth) 🆕

```
GET    /api/track/{token}         - Get live tracking data
```

### AI Endpoints

See [AI_USAGE_FLOW.md](AI_USAGE_FLOW.md) for complete documentation.

```
POST   /api/ai/analyze/audio      - Analyze audio for distress
POST   /api/ai/analyze/text       - Analyze text for distress
POST   /api/ai/chat               - Chat with safety assistant
GET    /api/ai/summary/session/{id} - Get session summary
POST   /api/ai/analyze/location   - Analyze location safety
GET    /api/ai/realtime/config    - Get WebSocket config
```

---

## 🎯 Usage Scenarios

### Scenario 1: Regular Walk

1. User opens app and clicks "Start Walk Mode"
2. Walk session starts in `manual` mode
3. User walks to destination
4. User clicks "Stop Walk Mode"
5. Password prompt appears 🆕
6. User enters main password
7. Walk stops normally

### Scenario 2: Geofenced Walk 🆕

1. User configures home as safe location (auto-start enabled)
2. User leaves home
3. Walk mode auto-starts (`auto_geofence` mode)
4. User reaches destination (another safe location)
5. User enters safe zone
6. Notification: "Arriving at [location name] - Auto-stopping in 2 minutes"
7. Countdown: 120 seconds
8. User can cancel countdown if just passing through
9. If not cancelled, walk auto-stops after 2 minutes

### Scenario 3: Duress Situation 🆕

1. User is in danger but coerced to stop walk mode
2. User clicks "Stop Walk Mode"
3. Password prompt appears
4. User enters **duress password** (instead of main password)
5. **Frontend**: Shows "Walk stopped" (appears normal to attacker)
6. **Backend**: Session continues in `silent` mode
7. **Backend**: Creates DURESS alert with live tracking token
8. **Backend**: Sends SMS to all trusted contacts:
   ```
   🚨 EMERGENCY - DURESS ALERT 🚨

   [Name] has triggered a silent emergency alert.
   They may be in a coerced situation.

   ⚠️ DO NOT call them - they may be compromised.

   Live Tracking: https://app.protego.com/track/TOKEN
   ```
9. Contacts can view real-time location without alerting attacker
10. Location updates every 10 seconds
11. No indication to user that tracking continues

---

## 📱 Frontend Pages

### Routes

- `/` - Landing page
- `/auth/signin` - Sign in
- `/auth/signup` - Sign up
- `/dashboard` - Main dashboard with walk control
- `/tracking` - Real-time tracking view
- `/safety-call` 🆕 - AI-powered safety call
- `/contacts` - Manage trusted contacts
- `/safety` - Safety tips and resources
- `/safe-locations` 🆕 - Manage safe zones
- `/settings` 🆕 - App settings and duress password
- `/track/[token]` 🆕 - Public live tracking (no auth)

---

## 🧪 Testing

### Create Test User

```bash
curl -X POST http://localhost:8000/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+12345678900",
    "password": "testpass123"
  }'
```

### Set Duress Password 🆕

```bash
curl -X POST http://localhost:8000/api/users/duress-password/set \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "testpass123",
    "duress_password": "different_duress_pass"
  }'
```

### Create Safe Location 🆕

```bash
curl -X POST http://localhost:8000/api/safe-locations/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Home",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "radius_meters": 100,
    "auto_start_walk": true,
    "auto_stop_walk": true
  }'
```

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error**: `TypeError: 'Column' object is not callable`
**Solution**: Fixed in models.py - column renamed from `relationship` to `contact_relationship`

**Error**: `psycopg2.OperationalError: could not connect to server`
**Solution**: PostgreSQL not running
```bash
sudo systemctl start postgresql
```

**Error**: `relation "users" does not exist`
**Solution**: Run database reset
```bash
python reset_database.py
```

### Frontend Issues

**Error**: `CORS error`
**Solution**: Check `ALLOWED_ORIGINS` in backend `.env`

**Error**: `Network request failed`
**Solution**: Verify `NEXT_PUBLIC_API_URL` in frontend `.env.local`

---

## 📚 Documentation

- **[AI_USAGE_FLOW.md](AI_USAGE_FLOW.md)** - Complete AI integration guide
  - AI services architecture
  - Audio transcription (Whisper)
  - Real-time monitoring (Azure OpenAI)
  - Text analysis and chat (MegaLLM)
  - Distress detection algorithms
  - Alert flow diagrams
  - API reference for all AI endpoints

---

## 🚀 Deployment

### Production Checklist

- [ ] `TEST_MODE=false`
- [ ] `ENVIRONMENT=production`
- [ ] Strong `SECRET_KEY` (32+ random chars)
- [ ] Production database with SSL
- [ ] Production Twilio credentials
- [ ] Production AI API keys
- [ ] HTTPS enabled
- [ ] CORS configured for production domains
- [ ] Database backups enabled
- [ ] Rate limiting configured
- [ ] SSL certificates installed

---

## 🎯 Roadmap

### Completed ✅
- Walk mode with manual start/stop
- Alert system with countdown
- Trusted contacts management
- SMS notifications
- AI-powered distress detection
- Real-time audio monitoring
- **Safe locations with geofencing** 🆕
- **Duress password system** 🆕
- **Live tracking for duress alerts** 🆕
- **Auto-start/stop walk mode** 🆕
- **AI Safety Call (fake call deterrent)** 🆕

### Planned 🚧
- Mobile app (React Native)
- Apple Watch integration
- Android Wear integration
- Video recording on alert
- Community safety network
- Crime data integration
- Predictive risk assessment
- Multi-language support

---

## 📄 License

This project is proprietary software. All rights reserved.

---

**Version**: 2.0.0
**Last Updated**: 2026-01-16
**Status**: Production Ready ✅
