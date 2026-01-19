# 🧠 Gramin Saathi - Technical Algorithms & Logic

This document details the core technical implementations and mathematical models used in Gramin Saathi.

## 1. 🤖 AI Context Window & NLP
### Condensed Context Strategy
To maintain high performance and stay within token limits of **Gemini 2.5 Flash**, we use a "Condensed Profile Context" instead of sending the full database.
- **Context Injection**: User metadata (state, crop, land size) is minimized into a single-line string injected into the system instruction.
- **Sliding History**: Only the last 5 messages are sent to the API, preventing "context drift" and reducing cost per request.
- **Intent Detection**: Before calling the LLM, a local regex/keyword-based NLP engine (`detectIntent`) classifies the query to decide if it can be handled by a faster, deterministic **Local Algorithm** (88% accuracy).

## 2. ⚖️ Matching Algorithms
### A. Scheme Eligibility (Scoring Model)
We use a **Weighted Multi-Factor Scoring System** (Max 100 points):
- **State Match (25 pts)**: Binary match or "National" status.
- **Landholding (25 pts)**: Uses a **Proximity Bonus** formula. If the user is in the "sweet spot" (mid-range), they get +5 bonus points.
- **Income (25 pts)**: Logarithmic priority scoring for marginal farmers.
- **Crop Fit (20 pts)**: Calculates matching ratio.
- **Category (10 pts)**: Handles specific demographics (Young vs Senior).

### B. Loan Affordability Engine
Uses a **Debt-to-Income (DTI) Ratio** model:
- **EMI Formula**: $P \times r \times \frac{(1+r)^n}{(1+r)^n - 1}$
- **Logic**: Any loan where the EMI exceeds 60% of monthly income is automatically disqualified to prevent debt traps.
- **Ranking**: Sorts by $(Match Score \times 0.6) + (Interest Rate Inverse \times 0.4)$.

## 3. 🔐 Security & Privacy
### End-to-End Encryption (E2EE)
Financial data in the **Khata** is encrypted BEFORE it hits the disk or cloud.
- **Algorithm**: AES-GCM 256-bit (authenticated encryption).
- **Key Derivation**: PBKDF2 with 100,000 iterations using a per-user salt.
- **Zero-Knowledge**: The server never sees the raw transaction descriptions or amounts; only the client holds the derivation key.

### Banking-Grade IDs
Transaction IDs are generated using a cryptographically secure random string: `GS-XXXX-XXXX-XXXX`. This ensures non-sequential, non-guessable IDs for accounting integrity.

## 4. 📈 Yield Prediction Model
A multi-variant deterministic model simulating agro-climatic conditions:
$$Yield = B \times (S_{factor} \times W_{factor} \times F_{factor})$$
- **Soil Factor ($S$):** Weighting based on pH stability and moisture retention.
- **Weather Factor ($W$):** Rainfall deviation from the crop's ideal mean.
- **Fertilizer Factor ($F$):** Efficiency gain based on soil pH compatibility.

## 5. 🔄 Offline State Machine
- **Storage**: IndexedDB via **Dexie.js**.
- **Sync Strategy**: "Outbox" pattern. Transactions are written to a local `pending_sync` table and a Service Worker attempts to flush them when `navigator.onLine` is true.
- **Conflict Resolution**: Last-Write-Wins (LWW) based on high-resolution timestamps.

## 6. 🗣️ Voice Processor
Uses the **Web Speech API** for Synthesis (TTS) and Recognition (STT).
- **Cleaning Logic**: TTS input is pre-processed to remove Markdown symbols and extra spaces to ensure natural cadence.
- **Navigation Maps**: Voice commands are mapped to internal React routes using fuzzy matching.
