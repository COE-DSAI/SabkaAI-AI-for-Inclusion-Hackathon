# WhatsApp Sandbox Setup Guide 📱

> **Quick Fix for Demo**: Follow steps 1-3 below to get WhatsApp working immediately.

## Root Cause

The Twilio WhatsApp Sandbox requires:
1. **User Enrollment** - Each user must opt-in by sending a message to the sandbox
2. **Webhook Configuration** - Twilio Console must point to your server
3. **Session Renewal** - Sandbox sessions expire every **3 days**

---

## Step 1: Configure Webhook in Twilio Console ✅

1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Find your **Sandbox Settings** (gear icon)
4. Set the webhook URL:
   - **When a message comes in**: 
     ```
     https://phone-cough-classifier.fly.dev/whatsapp/incoming
     ```
   - Method: **POST**
5. **Save** the configuration

> 💡 For local testing with ngrok:
> ```
> https://your-ngrok-url.ngrok.io/whatsapp/incoming
> ```

---

## Step 2: Join the Sandbox 📲

Each phone number that wants to send/receive messages must join the sandbox first:

1. Open WhatsApp on your phone
2. Send a message to the **Twilio Sandbox Number**: `+1 415 523 8886`
3. The message should be: `join <your-sandbox-keyword>`

> 🔍 **Find your sandbox keyword** in Twilio Console under:
> Messaging → Try it out → Send a WhatsApp message → Sandbox Settings

**Example**: If your keyword is `curious-star`, send:
```
join curious-star
```

You should receive a confirmation: *"You are all set! ..."*

---

## Step 3: Test the Integration 🧪

1. Send `hi` or `help` to the sandbox number from your joined phone
2. You should receive the welcome menu:
   ```
   🩺 Welcome to Voice Health! I can check your cough for health issues.
   
   Please reply with your preferred language:
   1. English
   2. Hindi
   ```

---

## Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| **No response from WhatsApp** | Ensure you've joined the sandbox (Step 2) |
| **Worked before, now failing** | Sandbox session expired - rejoin (Step 2) |
| **"Could not find a Channel"** | Webhook URL not set correctly (Step 1) |
| **Messages sending but not received** | Check Twilio Message Logs for errors |
| **Error 21608** | Recipient hasn't joined sandbox |

---

## Verify Secrets are Set on Fly.io

```bash
fly secrets list
```

Ensure these are set:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` = `whatsapp:+14155238886`

If missing:
```bash
fly secrets set TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
```

---

## For Demo Day 🎯

**Before the demo:**
1. Re-join the sandbox (sessions expire every 3 days)
2. Test send a message to confirm it's working
3. Have the sandbox join code ready for audience members

**Demo Flow:**
1. Show audience how to join: `join <keyword>` to `+1 415 523 8886`
2. They send `hi` to start
3. They select language, then send a voice message
4. They receive their health card!

---

## Checking Logs for Errors

**On Fly.io:**
```bash
fly logs | grep -i whatsapp
```

**Locally:**
```bash
# Check server output for WhatsApp-related logs
grep -i "whatsapp" nohup.out
```

---

## Production WhatsApp (Beyond Sandbox)

For production, you'll need:
1. A verified Facebook Business account
2. A registered WhatsApp Business API number
3. Approved message templates for out-of-session messages

Apply at: [Twilio WhatsApp Senders](https://www.twilio.com/console/sms/whatsapp/senders)
