# Language Selection System - Implementation Guide

## Overview
The voice agent plays all 10 language options **once** at the start, each in its own language. The system blocks until the user presses a button (0-9) to select their language.

## How It Works

### User Experience Flow

1. **Call Starts**
   - User hears: "Welcome to the Health Screening Service. Please select your language."

2. **Language Options Play Once** (each in its own language)
   - English: "For English, press 1"
   - Hindi: "हिंदी के लिए, 2 दबाएं"
   - Tamil: "தமிழுக்கு, 3 அழுத்தவும்"
   - Telugu: "తెలుగు కోసం, 4 నొక్కండి"
   - Bengali: "বাংলার জন্য, 5 টিপুন"
   - Marathi: "मराठीसाठी, 6 दाबा"
   - Gujarati: "ગુજરાતી માટે, 7 દબાવો"
   - Kannada: "ಕನ್ನಡಕ್ಕಾಗಿ, 8 ಒತ್ತಿರಿ"
   - Malayalam: "മലയാളത്തിന്, 9 അമർത്തുക"
   - Punjabi: "ਪੰਜਾਬੀ ਲਈ, 0 ਦਬਾਓ"

3. **User Response**
   - **If button pressed (1-9, 0)**: Language locks, call proceeds
   - **If no input**: All languages play again (without intro message)
   - **After 5 attempts with no input**: Defaults to English

4. **Confirmation**
   - User hears greeting in selected language
   - All subsequent interactions use selected language

## Button Mappings

| Button | Language | Code |
|--------|----------|------|
| **1** | English | `en` |
| **2** | Hindi (हिंदी) | `hi` |
| **3** | Tamil (தமிழ்) | `ta` |
| **4** | Telugu (తెలుగు) | `te` |
| **5** | Bengali (বাংলা) | `bn` |
| **6** | Marathi (मराठी) | `mr` |
| **7** | Gujarati (ગુજરાતી) | `gu` |
| **8** | Kannada (ಕನ್ನಡ) | `kn` |
| **9** | Malayalam (മലയാളം) | `ml` |
| **0** | Punjabi (ਪੰਜਾਬੀ) | `pa` |

## Why This Design?

### ✅ Advantages
- **Simple**: Each language announcement is in that language - easy to recognize
- **No cycling confusion**: Languages play once, then repeat if no input
- **Sequential numbering**: 1, 2, 3... easier to remember than 0, 1, 2...
- **English first**: Most international users will recognize "press 1" immediately
- **Hindi second**: Largest language group in India gets digit 2

### ✅ User Benefits
- Users don't need to understand English to select their language
- Native speakers immediately recognize their language
- Clear, simple instructions
- No confusion about which number to press

## Technical Implementation

### Language Order
```python
language_order = ["en", "hi", "ta", "te", "bn", "mr", "gu", "kn", "ml", "pa"]
```

### Digit Mapping
```python
digit_map = {
    "1": "en",  # English
    "2": "hi",  # Hindi
    "3": "ta",  # Tamil
    "4": "te",  # Telugu
    "5": "bn",  # Bengali
    "6": "mr",  # Marathi
    "7": "gu",  # Gujarati
    "8": "kn",  # Kannada
    "9": "ml",  # Malayalam
    "0": "pa"   # Punjabi
}
```

### Key Features

**1. DTMF Only - No Speech**
```python
gather = Gather(
    input="dtmf",  # Only button presses
    num_digits=1,
    timeout=3,
)
```

**2. Introduction Plays Once**
```python
if attempt == 0:
    gather.say("Welcome to the Health Screening Service. Please select your language.")
```

**3. Continuous Looping**
```python
# If no input, loop back and play all languages again
response.redirect(f"/voice-agent/language-detection?attempt={attempt + 1}")
```

**4. Safety Limit**
```python
MAX_LANG_ATTEMPTS = 5
if attempt >= MAX_LANG_ATTEMPTS:
    # Default to English
    detected_lang = "en"
```

## Where Language is Used

Once locked, the language is used for:

### ✅ Voice Responses
```python
voice, lang_code = _get_voice_config(language)
response.say(message, voice=voice, language=lang_code)
```

### ✅ Conversation
```python
# System prompt tells LLM to respond in selected language
system_prompt = f"🗣️ LANGUAGE: {state.language} (match their language)"
```

### ✅ Reports
```python
# WhatsApp/SMS reports in selected language
whatsapp_service.send_health_card(to=caller_number, result=result, language=language)
```

### ✅ Database
```python
call_record = CallRecord(
    language=language,  # Stored for analytics
    ...
)
```

## Example Call Flow

**English Speaker:**
1. Hears: "For English, press 1"
2. Presses: **1**
3. Hears: "Hello! Welcome to the Cough Classifier..."
4. All interactions in English

**Hindi Speaker:**
1. Hears: "हिंदी के लिए, 2 दबाएं"
2. Presses: **2**
3. Hears: "नमस्ते! खांसी वर्गीकरण सेवा में आपका स्वागत है..."
4. All interactions in Hindi

**Tamil Speaker:**
1. Hears: "தமிழுக்கு, 3 அழுத்தவும்"
2. Presses: **3**
3. Hears: "வணக்கம்! இருமல் வகைப்படுத்தி சேவைக்கு வரவேற்கிறோம்..."
4. All interactions in Tamil

## Configuration Files

### i18n.py
- `LANGUAGES`: Voice and language code configs
- `TRANSLATIONS["language_selection"]`: Button press instructions
- `TRANSLATIONS["va_greeting"]`: Confirmation messages

### voice_agent_webhooks.py
- `/language-detection`: Plays all languages, accepts DTMF
- `/process-language-selection`: Validates and locks language

### voice_agent_service.py
- Uses `state.language` for all LLM prompts
- RAG queries filtered by language
- Responses generated in selected language

## Testing Checklist

- [ ] Call starts with welcome message
- [ ] All 10 languages play in sequence
- [ ] Each language announcement is in its own language
- [ ] Pressing 1 → English greeting and conversation
- [ ] Pressing 2 → Hindi greeting and conversation
- [ ] Pressing 3 → Tamil greeting and conversation
- [ ] No button press → All languages play again
- [ ] After 5 no-inputs → Defaults to English
- [ ] WhatsApp report arrives in selected language
- [ ] Language persists throughout entire call
