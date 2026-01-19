# Language Selection Fix - What Changed

## Problem
The system was skipping language selection and going straight to English conversation.

## Root Cause
The `/start` endpoint was:
1. Playing an English greeting first
2. Setting up a Gather for speech input
3. THEN redirecting to language detection

**Result**: Users heard English greeting and could start speaking before language selection happened.

## Solution

### 1. **Cleaned up `/start` endpoint**
**Before:**
```python
# Played greeting in default language
greeting = agent.get_initial_greeting(language)
response.say(greeting, voice=voice, language=lang_code)

# Set up gather for speech
gather = Gather(input="speech dtmf", ...)
response.append(gather)

# THEN redirect to language detection
response.redirect("/voice-agent/language-detection")
```

**After:**
```python
# Store call info but DON'T set language yet
_call_states[CallSid] = {
    "language": None,  # Not set - user will select
    ...
}

# IMMEDIATELY redirect to language detection
# NO greeting, NO gather, NO assumptions
response = VoiceResponse()
response.redirect("/voice-agent/language-detection")
return twiml_response(response)
```

### 2. **Improved Language Detection UX**
- Added 0.5-second pauses between each language announcement
- Reduced timeout to 2 seconds (after all languages finish)
- Welcome message only plays on first attempt

## Expected Flow Now

### Call Flow:
```
1. User calls system
2. IMMEDIATELY redirected to /language-detection
3. Hears: "Welcome to the Health Screening Service. Please select your language."
   [1 second pause]
4. Hears: "For English, press 1"
   [0.5 second pause]
5. Hears: "हिंदी के लिए, 2 दबाएं"
   [0.5 second pause]
6. Hears: "தமிழுக்கு, 3 அழுத்தவும்"
   [0.5 second pause]
   ... (continues through all 10 languages)
7. After last language, waits 2 seconds for input
8. If no button: Repeats languages (without welcome message)
9. When button pressed: Language locks, greeting plays in selected language
```

## What Was Fixed

✅ **No English greeting before language selection**
✅ **No speech gather before language selection**
✅ **Language starts as None, not "en"**
✅ **Clear pauses between language options**
✅ **Proper timeout timing**

## Testing Checklist

- [ ] Call system
- [ ] First thing you hear is: "Welcome to the Health Screening Service..."
- [ ] Hear all 10 languages with clear pauses
- [ ] Press 1 → English greeting and conversation
- [ ] Press 2 → Hindi greeting and conversation
- [ ] Don't press anything → Hear all languages again
- [ ] Language persists throughout call
- [ ] WhatsApp report in selected language

## Code Changes

### File: `app/api/voice_agent_webhooks.py`

**Line 207-249**: `/start` endpoint
- Removed greeting playback
- Removed speech gather setup
- Language set to `None` instead of "en"
- Immediate redirect to language detection

**Line 295**: Gather timeout
- Changed from 3 seconds to 2 seconds
- Starts counting AFTER all languages finish

**Line 312-319**: Language playback
- Added 0.5-second pauses between languages
- Makes it clearer and gives users time to press buttons

## Why It Works Now

### Before:
```
/start → Play English greeting → Set up English gather → Redirect to lang detection
           ↑ USER HEARS THIS AND THINKS IT'S ENGLISH ONLY
```

### After:
```
/start → Immediate redirect → /language-detection → Play all languages → Wait for button
                                                          ↑ USER HEARS THIS FIRST
```

## Debugging Tips

If language selection still doesn't work:

1. **Check Twilio logs** for the call:
   - Verify `/start` is being called
   - Verify redirect to `/language-detection` happens
   - Check if any errors occur

2. **Check application logs**:
   ```bash
   grep "Language detection" /path/to/logs
   grep "Language locked" /path/to/logs
   ```

3. **Test digit mapping**:
   - Call and press 1 immediately
   - Should hear English greeting
   - If you hear something else, check digit_map

4. **Verify TwiML**:
   - Add logging to see actual TwiML being returned
   - Ensure no extra `<Say>` before `<Redirect>`
