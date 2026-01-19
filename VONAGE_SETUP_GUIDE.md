# Vonage Voice API Setup Guide
**Date:** 2026-01-17
**Status:** ✅ Implementation Complete - Ready for Testing

---

## 🎉 What's Been Implemented

✅ **Vonage Voice Service** (`services/vonage_voice_call.py`)
✅ **API Endpoints** (`routers/safety_call.py`)
✅ **WebSocket Handler** for 16kHz PCM audio streaming
✅ **Configuration Files** (`.env`, `config.py`)
✅ **Test Script** (`test_vonage_setup.py`)

---

## 📋 Prerequisites

### 1. Vonage Account Setup
- [x] Vonage account created ✅

### 2. Get Missing Credentials

You still need to add:
1. **VONAGE_API_KEY** - Get from Vonage Dashboard → API Settings
2. **VONAGE_API_SECRET** - Get from Vonage Dashboard → API Settings

---

## 🔧 Configuration

### Step 1: Update `.env` File

Open `/backend/.env` and update these values:

```bash
# Vonage Voice API Configuration
VONAGE_API_KEY=your_actual_api_key_here          # ⚠️ UPDATE THIS
VONAGE_API_SECRET=your_actual_api_secret_here    # ⚠️ UPDATE THIS
VONAGE_APPLICATION_ID= # ✅ Already set
VONAGE_PRIVATE_KEY_PATH=./private.key            # ✅ Already set
VONAGE_NUMBER=12243481745                        # ✅ Already set

# Voice Provider Selection
VOICE_PROVIDER=vonage                            # ✅ Set to vonage
BACKEND_URL=https://protego.zssh.dev            # ✅ Your backend URL
```

### Step 2: Verify Private Key

Make sure `private.key` exists in the backend directory:

```bash
cd /home/anay/Desktop/Projects/Protego/backend
ls -la private.key
```

If it doesn't exist, download it from Vonage Dashboard.

---

## 🧪 Testing

### Test 1: Verify Vonage Credentials

```bash
cd /home/anay/Desktop/Projects/Protego/backend
python test_vonage_setup.py
```

This will:
1. Generate JWT token
2. Make a test call to your phone
3. Verify the call goes through

**Expected Output:**
```
========================================
Testing Vonage Voice API Setup
========================================

📝 Generating JWT token...
✅ JWT generated (length: 450)

📞 Making test call to 919411539322...

Response Status: 201

✅ SUCCESS! Call initiated successfully

Call Details:
  UUID: abc-123-def-456
  Status: started
  Direction: outbound

📱 You should receive a call shortly!
```

### Test 2: Test Full Backend

```bash
cd /home/anay/Desktop/Projects/Protego/backend
python main.py
```

Then from frontend or Postman:

```bash
POST https://protego.zssh.dev/api/safety-call/vonage/initiate
Authorization: Bearer <your_jwt>
Content-Type: application/json

{
  "location": {
    "lat": 28.7041,
    "lng": 77.1025
  }
}
```

---

## 📱 API Endpoints

### 1. Initiate Safety Call

```http
POST /api/safety-call/vonage/initiate
Authorization: Bearer <token>
Content-Type: application/json

{
  "location": {
    "lat": 28.7041,
    "lng": 77.1025
  }
}
```

**Response:**
```json
{
  "success": true,
  "call_uuid": "abc-123-def-456",
  "status": "started",
  "test_mode": false,
  "message": "Safety call initiated via Vonage. You will receive a call shortly."
}
```

### 2. End Call

```http
POST /api/safety-call/vonage/end/{call_uuid}
Authorization: Bearer <token>
```

### 3. Get Active Calls

```http
GET /api/safety-call/vonage/active
Authorization: Bearer <token>
```

---

## 🔄 Audio Flow

### Vonage Architecture (Native 16kHz PCM)

```
User Phone ↔ Vonage ↔ WebSocket ↔ Backend
                                     ↓
                            16kHz PCM (No conversion!)
                                     ↓
                         Deepgram (STT) → Text
                                     ↓
                            MegaLLM (Claude-Opus-4.5) → Response
                                     ↓
                         ElevenLabs (TTS) → 16kHz PCM Audio
                                     ↓
                            16kHz PCM (No conversion!)
                                     ↓
                    WebSocket ↔ Vonage ↔ User Phone
```

**Key Advantage:** No audio codec conversion needed! Vonage uses 16kHz Linear PCM natively, which is exactly what Deepgram and ElevenLabs expect.

### Comparison: Twilio vs Vonage

| Feature | Twilio | Vonage |
|---------|--------|--------|
| Audio Format | 8kHz μ-law | 16kHz Linear PCM |
| Codec Conversion | Required ❌ | Not Required ✅ |
| Audio Quality | Lower (8kHz) | Higher (16kHz) |
| Latency | Higher (resampling) | Lower |
| Code Complexity | ~1000 lines | ~400 lines |
| Cost (India) | ~$0.0115/min | ~$0.0056/min |
| **Savings** | - | **51% cheaper** |

---

## 🛠️ Troubleshooting

### Issue 1: JWT Generation Fails

**Error:** `Failed to generate JWT: [Errno 2] No such file or directory: './private.key'`

**Solution:**
```bash
cd /home/anay/Desktop/Projects/Protego/backend
# Download private.key from Vonage Dashboard
# Or copy it from your local machine
```

### Issue 2: Call Fails with 401 Unauthorized

**Error:** `HTTP 401 Unauthorized`

**Solution:**
1. Check `VONAGE_API_KEY` and `VONAGE_API_SECRET` in `.env`
2. Verify they match your Vonage Dashboard credentials
3. Make sure private key matches your Application ID

### Issue 3: WebSocket Connection Fails

**Error:** `WebSocket connection refused`

**Solution:**
1. Ensure backend is running: `python main.py`
2. Verify `BACKEND_URL` in `.env` is correct
3. For local testing, use **ngrok**:
   ```bash
   ngrok http 8000
   # Update BACKEND_URL to ngrok URL
   ```

### Issue 4: No Audio from AI

**Possible causes:**
1. Deepgram API key invalid
2. ElevenLabs API key invalid
3. MegaLLM API key invalid

**Solution:**
```bash
# Check all API keys in .env:
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
MEGALLM_API_KEY=
```

---

## 📊 Cost Comparison

### Monthly Costs (500 users, 30 calls/day, 5 min avg)

#### Twilio
- Voice: 30 calls × 5 min × $0.0115 × 30 days = **$51.75**
- Total: **$51.75/month**

#### Vonage
- Voice: 30 calls × 5 min × $0.0056 × 30 days = **$25.20**
- Total: **$25.20/month**

**Savings: $26.55/month (51%)**

At 5000 users scale:
- Twilio: **$517/month**
- Vonage: **$252/month**
- **Savings: $265/month = $3,180/year** 💰

---

## ✅ Verification Checklist

Before going live, verify:

- [ ] `VONAGE_API_KEY` and `VONAGE_API_SECRET` set in `.env`
- [ ] `private.key` exists in backend directory
- [ ] Test script runs successfully (`python test_vonage_setup.py`)
- [ ] Backend starts without errors (`python main.py`)
- [ ] Test call initiated from frontend works
- [ ] Audio quality is good during call
- [ ] Deepgram transcription working
- [ ] ElevenLabs TTS working
- [ ] MegaLLM responses working
- [ ] Distress detection functioning

---

## 🚀 Deployment

### For Production

1. **Update Backend URL**
   ```bash
   BACKEND_URL=https://protego.zssh.dev
   ```

2. **Ensure HTTPS**
   - Vonage requires HTTPS for WebSocket
   - TwiML callbacks must be HTTPS

3. **Set Voice Provider**
   ```bash
   VOICE_PROVIDER=vonage
   ```

4. **Restart Backend**
   ```bash
   cd /home/anay/Desktop/Projects/Protego/backend
   # Kill existing process
   pkill -f "python main.py"
   # Start new process
   python main.py
   ```

---

## 📝 Next Steps

1. **Get Vonage API credentials** from Dashboard
2. **Update `.env`** with API key and secret
3. **Run test script** to verify setup
4. **Test from frontend** with real call
5. **Monitor call quality** and adjust if needed
6. **Switch traffic** from Twilio to Vonage gradually

---

## 🔗 Useful Links

- **Vonage Dashboard:** https://dashboard.nexmo.com
- **Vonage Voice API Docs:** https://developer.vonage.com/en/voice/voice-api/overview
- **WebSocket Guide:** https://developer.vonage.com/en/voice/voice-api/guides/websockets
- **Vonage Support:** support@api.vonage.com

---

## 💡 Tips

1. **Use Test Mode First**
   - Set `TEST_MODE=true` to simulate calls without charges

2. **Monitor Logs**
   ```bash
   tail -f backend/logs/app.log
   ```

3. **WebSocket Debugging**
   - Check browser console for WebSocket errors
   - Verify audio packets are being sent/received

4. **Cost Monitoring**
   - Check Vonage Dashboard for usage
   - Set up billing alerts

---

**Implementation Complete! 🎉**

*Ready to test with your Vonage credentials.*
