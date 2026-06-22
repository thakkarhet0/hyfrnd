# STT Accuracy Validation Spike

**Status:** Tooling ready — awaiting audio samples  
**Gate:** Sarvam AI ≥90% word accuracy across all categories; combined primary + fallback ≥95%  
**Blocks:** Epic 2 feature work (if gate fails, provider re-evaluation required before proceeding)

---

## API Connectivity

| Provider    | Status  | Auth Key      | Date Verified |
|-------------|---------|---------------|---------------|
| Sarvam AI   | ✅ Connected | `SARVAM_API_KEY` | 2026-06-06 |
| ElevenLabs  | ✅ Connected | `ELEVENLABS_API_KEY` | 2026-06-06 |

**Language codes confirmed:**
- Hindi: `hi-IN`
- Gujarati: `gu-IN`
- English: `en-IN`
- Code-switched: use primary language code (`hi-IN` / `gu-IN`) — saarika:v2 handles mixing automatically

---

## How to Run

```bash
# 1. Check API connectivity (no audio needed)
node scripts/stt-spike.mjs --check

# 2. Test a single file
node scripts/stt-spike.mjs --file scripts/stt-samples/hindi-01.m4a --lang hi-IN --ref "reference transcript"

# 3. Run full batch (after placing audio files in scripts/stt-samples/)
cp scripts/stt-test-cases.example.json scripts/stt-test-cases.json
# edit stt-test-cases.json to update reference transcripts with your actual recordings
node scripts/stt-spike.mjs --run scripts/stt-test-cases.json
```

---

## Recording Instructions

Record **≥10 audio samples** covering the categories below. Use your phone in realistic conditions (not studio). Target memo length: 10–30 seconds each.

| # | File name | Language | Category | What to say |
|---|-----------|----------|----------|-------------|
| 1 | `hindi-01.m4a` | hi-IN | pure-hindi | A memo about meeting someone — their name, what they said, a follow-up action |
| 2 | `hindi-02.m4a` | hi-IN | pure-hindi | A contact note — phone number spoken aloud, relationship context |
| 3 | `gujarati-01.m4a` | gu-IN | pure-gujarati | A memo in Gujarati about a meeting or event |
| 4 | `gujarati-02.m4a` | gu-IN | pure-gujarati | A contact note in Gujarati |
| 5 | `english-01.m4a` | en-IN | pure-english | A memo in Indian English — name, context, follow-up |
| 6 | `hindi-english-01.m4a` | hi-IN | hindi-english-mix | Mix Hindi and English naturally (e.g. "Aaj Amit ke saath meeting thi, next quarter mein revenue double hoga") |
| 7 | `hindi-english-02.m4a` | hi-IN | hindi-english-mix | Another code-switched Hindi-English memo |
| 8 | `gujarati-english-01.m4a` | gu-IN | gujarati-english-mix | Mix Gujarati and English naturally |
| 9 | `noisy-01.m4a` | hi-IN | noisy-environment | Record in a café / street with background noise |
| 10 | `fast-speech-01.m4a` | hi-IN | fast-speech | Speak at natural fast pace, no pauses |

**After recording each file:**
1. Place it in `scripts/stt-samples/`
2. Write the exact words you said as the `"reference"` in `scripts/stt-test-cases.json`
3. Run `node scripts/stt-spike.mjs --run scripts/stt-test-cases.json`

---

## Results

> Fill this table after running the spike.

| # | Category | Sarvam AI Accuracy | Sarvam Latency | ElevenLabs Accuracy | EL Latency |
|---|----------|--------------------|----------------|---------------------|------------|
| 1 | pure-hindi | — | — | — | — |
| 2 | pure-hindi | — | — | — | — |
| 3 | pure-gujarati | — | — | — | — |
| 4 | pure-gujarati | — | — | — | — |
| 5 | pure-english | — | — | — | — |
| 6 | hindi-english-mix | — | — | — | — |
| 7 | hindi-english-mix | — | — | — | — |
| 8 | gujarati-english-mix | — | — | — | — |
| 9 | noisy-environment | — | — | — | — |
| 10 | fast-speech | — | — | — | — |
| **AVG** | | **—** | **—** | **—** | **—** |

---

## Gate Evaluation

| Gate | Threshold | Result |
|------|-----------|--------|
| Sarvam AI word accuracy | ≥90% | ⏳ pending |
| Combined primary + fallback | ≥95% | ⏳ pending |
| Sarvam AI latency (60s memo) | <5s | ⏳ pending |
| Sarvam API quota | ≥2,000 req/day | ⏳ pending — confirm via Sarvam dashboard |

**Outcome:** ⏳ pending

---

## Next Steps (if gate fails)

1. Open a Sarvam AI support ticket requesting accuracy improvement or quota increase
2. Evaluate alternative providers (Whisper API, Google Speech-to-Text, Azure Cognitive)
3. Do NOT proceed with Epic 2 STT integration until gate passes or risk is explicitly accepted
