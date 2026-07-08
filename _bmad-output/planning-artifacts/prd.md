---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
releaseMode: phased
inputDocuments:
  - _bmad-output/brainstorming/brainstorming-session-2026-05-14-1.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: mobile_app
  domain: consumer_productivity_personal_crm
  complexity: medium
  projectContext: greenfield
  team: solo_founder
---

# Product Requirements Document - God's plan

**Author:** God
**Date:** 2026-05-15

## Executive Summary

A voice-first personal relationship management app for Indian consumers that eliminates the friction of remembering and following up on the people who matter. Users speak a 10-second voice memo after any meaningful interaction; the app extracts structure silently, schedules follow-ups automatically, and surfaces context before the next conversation. The result: users show up as genuinely caring friends and more competent professionals — without the administrative overhead of a traditional CRM.

**Target Users:** Indian professionals and everyday users (Android + iOS) who maintain meaningful relationships with clients, friends, and service providers, and who currently fail at follow-through not from lack of care but from lack of a low-friction system.

**Problem:** Maintaining relationships requires remembering names, context, dates, and following through. Most people fail not because they don't care, but because the friction of tracking it is too high. Existing tools are either too complex (CRMs), too generic (notes apps), or English-only.

**Solution:** A minimalist, habit-forming app built around a single core loop: periodic nudge → intentional voice memo → AI extraction → scheduled follow-up → contextual morning briefing → pre-call summary card → repeat. On-device data storage by default, with optional Google Drive backup. DPDP compliant by architecture.

### What Makes This Special

**Multilingual STT as core infrastructure, not afterthought.** Indian users naturally code-switch between Hindi, Gujarati, Tamil, and English. The app is built from the ground up for this reality.

**Radical simplicity as a deliberate constraint.** Fewer features than anything in this space — deliberately. The friction of traditional CRMs is the problem; solving it with another feature-heavy tool is self-defeating.

**Habit formation as the real product outcome.** The product succeeds when it becomes a 10-second daily ritual, not when it has the deepest feature set. Every design decision is measured against one test: does it make the habit stronger or weaker?

**Technology unlock.** Multilingual STT quality (Whisper, Sarvam AI, ElevenLabs STT) has crossed the threshold where voice can genuinely replace typing for Indian user.

## Project Classification

- **Project Type:** Mobile App — cross-platform iOS + Android, single codebase via React Native + Expo, distributed via Play Store and App Store simultaneously
- **Tech Stack:** React Native (Expo managed/bare workflow), EAS Build for production, expo-notifications (FCM + APNS), expo-contacts, expo-calendar, expo-av for audio recording
- **Domain:** Consumer Productivity / Personal CRM
- **Complexity:** Medium — multilingual STT as load-bearing infrastructure, cross-platform OEM compatibility, DPDP + App Store privacy compliance, on-device AI extraction, habit-loop design
- **Project Context:** Greenfield
- **Team:** Solo founder
- **Market:** Indian consumers, Android + iOS simultaneous launch

## Success Criteria

### User Success

- User completes the full capture loop in their first session: smart prompt fires after a call or meeting → voice memo recorded in their language → contact linked → follow-up scheduled — without friction or confusion.
- STT correctly transcribes multilingual input (Hindi, Gujarati, Tamil-English code-switching) without requiring manual correction.
- User arrives at a follow-up interaction with the correct context (last conversation summary) and AI-suggested questions drawn from their previous voice memo — and feels more prepared than they would have been otherwise.
- Onboarding "aha!" moment: user sees their first memo correctly parsed and a contact populated before leaving the onboarding flow.
- Capture ritual feel: after recording, the user experiences the moment as satisfying and intentional — not administrative. If users describe the recording experience as "filling in a form," the product has failed at its core UX goal regardless of functional correctness.

### Business Success

- Sustainable from day one: infrastructure costs remain low (on-device processing minimizes server costs; voice memos never leave the device).
- **3-month target:** 50–200 daily active users who genuinely rely on the app — quality signal over quantity. Retention and daily open rate matter more than total installs.
- **12-month target:** Meaningful freemium conversion rate among users who hit the 10-contact limit (converts to ₹400/month). Word-of-mouth as primary growth channel.
- Growth is pull-driven, not acquisition-spend driven. A user who relies on it daily is the only metric that matters in year one.

### Technical Success

- STT word accuracy ≥90% on Hindi-English and Gujarati-English code-switching under real conditions (noisy environments, fast speech) — hard gate before any other development begins.
- Three daily notifications (morning, afternoon, night) deliver reliably across target OEMs. Notification tap opens the capture flow within 2 seconds.
- AI extraction from unstructured voice memo reliably produces: contact name, 3–5 context points, follow-up date/intent, and 2–3 suggested questions. Missing fields are prompted — not silently dropped.
- All personal notes and voice memos stored on-device only. DPDP compliant by architecture.
- Core features work across major Indian Android OEMs (Samsung, Xiaomi, OnePlus, Realme) and iOS 16+.
- Notification permission granted by user on first ask (iOS) — UX must make the value clear before the system prompt fires, since denial requires a Settings detour to recover.

### Measurable Outcomes

- Capture loop completed within 30 seconds of a call ending (prompt to scheduled follow-up).
- STT transcription latency under 5 seconds for a 60-second memo.
- Zero server-side storage of voice memos or extracted notes by default. Optional Google Drive backup stores encrypted data in the user's own Drive — not on app servers.

## Product Scope

### MVP — Minimum Viable Product

1. **Multilingual STT** — Hindi, Gujarati, Tamil-English code-switching as primary input. Engine selected and validated before any other work.
2. **Periodic capture nudges** — three daily notifications (morning, afternoon, night) prompt the user to open the app and log any interactions since the last session. Intentional by design — no background process, no call detection, no OEM compatibility risk.
3. **Voice memo → AI extraction** — contact name, key context, follow-up date/intent, suggested questions extracted silently. Missing fields prompted one at a time.
4. **Contact linking** — memo linked to existing contact (with confirmation) or new contact created. Up to 10 contacts free.
5. **Follow-up scheduling and contextual reminders** — reminder carries the context, not just the name.
6. **Onboarding** — scripted first capture: user completes one full real loop before leaving onboarding.
7. **Freemium gate** — 10 contacts free, ₹400/month unlimited.

### Growth Features (Post-MVP)

- Morning relationship briefing (curated 3–5 contacts, daily habit anchor)
- Rest day signal — "You're caught up. Rest today." on days with no follow-ups due; maintains the daily ritual even on quiet days
- Relationship tiers (Recent Popups / Consistent Regulars / Older Acquaintances)
- Transparent curation nudges ("You've snoozed Meera 3 times — want to change her cadence?")
- Fast-access home screen widget / voice overlay (one-tap capture without opening app)
- Gentle resurface for dormant contacts
- Weekly extraction accuracy micro-review

### Vision (Future)

- Relationship risk prediction — proactive drift detection before the user notices
- Commute mode / idle state recommendations
- True ambient capture (background voice, no unlock)
- Sales CRM extension
- Team / shared relationship tracking

## User Journeys

### Journey 1: Vashishth — The Networking Blur *(Primary User, Success Path)*

**Opening Scene:** Vashishth just walked out of a startup mixer in Ahmedabad. He met nine people in two hours — a manufacturer from Rajkot, a CA looking for young clients, a woman from an FMCG brand who seemed genuinely interested. He's standing at the auto stand, phone in hand. He knows that by Friday he'll remember none of it. His notes app has three half-finished lines from the last event. He doesn't type well in Gujarati, and English feels wrong for people he met in Gujarati.

**Rising Action:** At 9 PM, his phone buzzes — the app's evening notification: *"Evening check-in. Anything worth remembering from today?"* He taps it. The app opens to a clean capture screen. He taps New Person and speaks freely — Gujarati-English mix, raw, unstructured: *"Rajesh bhai, Rajkot manufacturer, kapas ni vaato karti hati, ekvar mil-va nu keh-yu, next week kem che puchhe."* The app transcribes, extracts: Rajesh / cotton manufacturer, Rajkot / wants to meet / follow up next week. It asks: "When this week?" He says Wednesday. Done. 40 seconds.

**Climax:** Wednesday morning. The app surfaces: *"Rajesh — cotton manufacturer, Rajkot. He mentioned wanting to meet. You said you'd check his availability this week."* Vashishth calls. Rajesh picks up. *"Rajesh bhai, kapas ni vaato yaad che ne? Next week meeting kari shiye?"* Rajesh: *"Arre, tune yaad rakhyo!"* Meeting set.

**Resolution:** Vashishth didn't become more organized. He became the kind of person who follows through. The app didn't store contacts — it made him feel like a better version of himself.

---

### Journey 2: Prayag — Lost in English *(Primary User, Language-First Path)*

**Opening Scene:** Prayag, 45, runs a mid-size textile trading business in Surat. 60–70 active clients, relationships built over decades, most calling his personal number. His son set up a CRM last year. English interface. He tried for a week — it felt like filing taxes in a foreign language. He quit after day 4. He tracks everything in a dog-eared notebook and his own memory, which is starting to fail him. Last month he forgot to follow up with a client who went to a competitor. The loss stung.

**Rising Action:** His nephew shows him the app: *"Kaka, bas bolo — kuch type nahi karna."* After a call with Manubhai — long-time client, son's wedding coming, needs 500 metres of fabric before season — Prayag speaks in pure Gujarati: *"Manubhai no dikro parne cho, sadi pehla 500 meter joie, season pehla yaad karje."* The app handles it completely. Extracts: Manubhai / son's wedding / 500m fabric needed / remind before season. "When?" — October first week. Done.

**Climax:** October 3rd. Morning briefing. Manubhai at the top: *"Son's wedding coming. Mentioned needing 500m of fabric before season."* Prayag calls. Mentions the fabric. Manubhai: *"Arre, tune yaad rakha! Haa, bhej de."* ₹40,000 order placed.

**Resolution:** Prayag didn't learn English. Didn't learn a CRM. He just talked — in the language his relationships already live in. The app met him where he is, not where software assumed he'd be.

---

### Journey 3: Pooja — Reconnecting from the Inside *(Primary User, Personal/Social Path)*

**Opening Scene:** Pooja is 34. Three kids, ages 6, 4, and 2. She hasn't had a real conversation unrelated to school pickups in two years. She used to be a marketing executive. She runs into an old colleague, Neha, at the pediatrician's waiting room. They talk for 20 minutes — the first real conversation Pooja has had in months. Neha has her own content agency now, is looking for a brand strategist. They exchange numbers. Pooja promises to stay in touch. She's made this promise before. She knows what happens next.

**Rising Action:** Sitting in the car after, she opens the app — downloaded it last week. She records manually: *"Neha, content marketing, own agency now, used to be at JWT. Looking for a brand strategist, might be relevant for me. Kids same age. Real conversation — want to keep this one."* The app extracts: Neha / content agency / potential opportunity / reconnection context. "When to check in?" — Two weeks.

**Climax:** Two weeks later, the pre-call summary card surfaces: *"Neha — her agency is scaling, mentioned looking for a brand strategist. You could ask how that search is going, and whether the role is still open."* Pooja feels prepared. She messages Neha. They set up a coffee. Neha offers her a freelance project.

**Resolution:** Pooja didn't just reconnect — she showed up like the professional she used to be. The app didn't fix her relationships. It gave her the courage to tend them again, one at a time.

---

### Journey 4: Vashishth — The Wall *(Primary User, Freemium Conversion)*

**Opening Scene:** Six weeks in. The app is a reflex — after every call, after every chai meeting, he records. He's at 9 contacts. Tonight he met Farid, a logistics operator who could solve a real supply chain problem. He wants to add him immediately.

**Rising Action:** He taps New Person. The app stops him: *"You've reached your 10-contact limit on the free plan."* Below that, a single line from his last note — something about his supplier Kiran that paid off last week. He pauses. He thinks about the deals that came from the app in six weeks.

**Climax:** ₹400/month. No sales pitch. Just: *"Unlimited contacts. Your notes stay on your phone."* He pays. He records Farid immediately.

**Resolution:** He didn't buy a subscription. He bought the feeling that he could keep up. For Vashishth at 23, ₹400/month to feel like the most connected person in the room is an obvious trade.

---

## Domain-Specific Requirements

### Compliance & Regulatory

- **DPDP Act (2023):** Consent screen at onboarding in plain language — not legalese. Granular: contacts access, calendar access, and STT audio processing consented to separately. A "delete all my data" flow is mandatory — must reach cloud backup if enabled. Grievance officer email registered and linked from app settings and Play Store listing before launch. Add a `consent_version` field to local DB schema from day one so re-consent can be triggered if data processing purpose changes (e.g. new STT provider in v1.1).
- **STT audio disclosure:** Audio is briefly processed off-device by the STT engine and not persisted anywhere. This must be disclosed at onboarding in a single plain sentence, in the user's language — not buried in a privacy policy. Store `stt_consent_granted: bool` locally. STT processing is gated on this flag — no audio leaves the device until explicit opt-in is recorded.
- **Google Play sensitive permissions:** READ_CONTACTS and READ_CALENDAR are required and must be declared with a live Privacy Policy. No READ_PHONE_STATE, no READ_CALL_LOG, no accessibility service — the intentional capture pivot eliminates all call-detection permissions entirely.
- **Apple App Store compliance:** iOS privacy manifest (PrivacyInfo.xcprivacy) required since iOS 17 — must declare all API usage (contacts, calendar, microphone, notifications) with approved reasons. App Store review is stricter than Play Store; microphone + contacts + STT off-device combination will be scrutinized. Prepare a clear use-case statement. Allow 1–2 week buffer for first submission review.
- **iOS privacy nutrition label:** App Store requires a privacy "nutrition label" declaring all data types collected. Contacts (linked to identity), usage data, and diagnostics must be declared accurately before submission.
- **Payment compliance — dual platform:** Google Play Billing mandatory on Android. Apple IAP mandatory on iOS — Apple takes 15–30% commission on subscriptions. At ₹400/month, net revenue per iOS subscriber is ~₹280–340. Consider whether pricing needs to be unified or platform-differentiated. External payment links are prohibited in iOS builds — no Razorpay deeplink on iOS.

### Data Architecture

- **Default: on-device encrypted storage.** Voice memos, extracted notes, and contact data stored in encrypted SQLite/Room database. Nothing leaves the device by default.
- **Optional: Google Drive backup (user opt-in).** Backup handled via Google's own OAuth and Drive App Data folder — no user-managed encryption keys. Users authenticate with their Google account; Google manages the key. Clear disclosure at opt-in: backup lives in the user's own Drive and is only accessible by the app.
- **STT audio:** Processed transiently by the STT engine. Not persisted on-device or server-side after transcription completes. Disclosed at onboarding.

### Risk Mitigations

| Risk | Likelihood | Mitigation | Owner |
|---|---|---|---|
| Phone lost/reset, data unrecoverable | Medium | Google Drive backup (opt-in). Warning shown at onboarding: "Your data lives on this phone. Enable backup to protect it." | UX + Backend |
| Notification not delivered (OEM suppression) | Medium | WorkManager scheduling. Re-prompt if user hasn't opened app in 3+ days. Guide to OEM notification settings on first launch. | Technical |
| STT service unavailable | Low | Sarvam → ElevenLabs STT fallback. Offline queue with local processing on reconnect. Raw transcript stored as last resort. | Technical |
| STT audio privacy perception | Medium | Plain-language disclosure at onboarding. Engine named explicitly. Opt-in gate before first STT use. | UX |
| DPDP non-compliance | Low | Grievance officer registered. Consent screen live. Data deletion flow implemented. `consent_version` field in DB. | Legal + Technical |
| Play Store rejection | Low | No high-risk permissions (call detection removed). Privacy Policy live. STT use-case declared clearly. | Product |
| App Store rejection (iOS) | Medium | Privacy manifest complete. Microphone + contacts + off-device STT use-case documented. Allow 1–2 week buffer for first review. | Product |
| iOS notification permission denied | Medium | Request after first successful capture, not on cold open. In-app Settings guidance if denied. Value must be demonstrated before the system prompt fires. | UX |
| Apple IAP revenue cut (15–30%) | Certain | Accepted cost of iOS distribution. Factor into pricing model — consider whether ₹400/month remains viable or needs platform adjustment. | Product |
| Capture ritual perceived as data entry | Medium | Watch first-session recordings. If users describe the experience as "filling in fields," the framing has leaked. Fix before scaling. | UX |
| Solo founder bandwidth | Medium | Pre-call summary card deferred to week 2 post-launch to protect launch scope. Morning briefing is next to defer if runway compresses. The 7-feature MVP is the floor. | Product |

### Market Context & Competitive Landscape

| Competitor | Gap |
|---|---|
| Dex, Clay | English-only, desktop-first, professional networks only |
| Monica (open source) | English-only, self-hosted, no mobile-first experience |
| Google Contacts / Notes | No relationship memory, no follow-ups, no extraction |
| Notion / Obsidian (manual CRM) | High friction, English interface, requires system design |
| Salesforce Mobile | Enterprise complexity, English, no voice input |

No tool exists that combines: voice-first capture + Indian multilingual STT + personal (non-enterprise) relationships + mobile-native + habit-loop design. The nearest adjacents are either too complex, English-only, or built for sales teams.

## Mobile App Specific Requirements

### Project-Type Overview

God's plan is a React Native + Expo cross-platform mobile app launching simultaneously on Android (Play Store) and iOS (App Store). Single codebase via Expo managed workflow, EAS Build for production builds, targeting Indian consumers on Android-first OEMs (Samsung, Xiaomi, Realme, OnePlus) with iOS as a co-equal launch platform.

### Platform Requirements

| Dimension            | Android                    | iOS                         |
| -------------------- | -------------------------- | --------------------------- |
| Min SDK / OS Version | API 26 (Android 8.0)       | iOS 16                      |
| Target SDK           | API 35                     | Latest stable               |
| Build toolchain      | EAS Build (Gradle)         | EAS Build (Xcode)           |
| Distribution         | Google Play Store          | Apple App Store             |
| In-app purchases     | Google Play Billing        | Apple IAP (15–30% cut)      |
| Notification channel | FCM via expo-notifications | APNS via expo-notifications |

### Device Permissions

| Permission | Android | iOS | When Requested |
|---|---|---|---|
| Microphone | RECORD_AUDIO | NSMicrophoneUsageDescription | First capture attempt |
| Contacts | READ_CONTACTS | NSContactsUsageDescription | First contact link attempt |
| Camera | CAMERA | NSCameraUsageDescription | First contact photo attempt |
| Notifications | POST_NOTIFICATIONS (API 33+) | UNUserNotificationCenter | After first successful capture |
| Calendar | READ_CALENDAR, WRITE_CALENDAR | NSCalendarsUsageDescription | First follow-up scheduling |

**Permission strategy:** Request at moment of first use only — never on cold open. iOS notification permission requested specifically after the user's first successful capture, not before. If denied, show in-app guidance to re-enable via Settings.

**Excluded permissions:** READ_PHONE_STATE, READ_CALL_LOG, PROCESS_OUTGOING_CALLS, BIND_ACCESSIBILITY_SERVICE. The intentional capture design eliminates all call-detection permissions entirely — this simplifies store review and removes surveillance anxiety.

### Offline Mode

| Scenario | Behaviour |
|---|---|
| No internet at capture time | Voice memo recorded locally; STT processing queued |
| Connectivity restored | Queued audio sent to Sarvam AI (primary), then ElevenLabs STT (fallback) |
| Both STT services unavailable | Raw audio kept locally; user prompted to retry |
| Contact list access | Full read-only access always available (on-device SQLite) |
| Follow-up reminders | Fired locally via expo-notifications — no server dependency |
| Google Drive backup | Sync attempted on reconnect; silent retry on failure |

### Push Notification Strategy

| Notification | Default Timing | Copy | Tap Action |
|---|---|---|---|
| Morning nudge | ~8 AM (±2hr window) | "Morning. Anything from yesterday worth remembering?" | Opens capture screen |
| Afternoon nudge | ~1 PM (±2hr window) | "Any calls or meetings this morning?" | Opens capture screen |
| Evening nudge | ~9 PM (±2hr window) | "Evening check-in. Anything worth remembering from today?" | Opens capture screen |
| Follow-up reminder | User-set date, morning | "[Name] — [context]. You wanted to follow up." | Opens pre-call summary card |

3 daily nudges maximum. No marketing push. No engagement push. Timing configurable within ±2hr window per nudge.

**Android:** WorkManager scheduling via expo-notifications. On first launch, guide users on Xiaomi MIUI and Realme UI to whitelist the app in battery settings.
**iOS:** Permission requested after first successful capture. If denied: in-app Settings guidance shown.

### Haptic Feedback

Two moments only: recording start (mic is live) and recording stop (memo captured). No haptics for navigation or scrolling — scarcity preserves the signaling value of the capture ritual.

### Store Compliance Summary

**Google Play:** No high-risk permissions. READ_CONTACTS + READ_CALENDAR declared with live Privacy Policy. STT off-device processing disclosed. DPDP grievance officer email in app settings and listing. Google Play Billing for subscriptions.

**Apple App Store:** iOS privacy manifest (PrivacyInfo.xcprivacy) declaring contacts, calendar, microphone, notifications API usage. Privacy nutrition label accurate for identity-linked contacts, usage data, diagnostics. Apple IAP mandatory — no external payment links in iOS builds. Allow 1–2 week buffer for first submission review.

### Expo Implementation Packages

| Package | Purpose |
|---|---|
| expo-notifications | FCM + APNS push + local notifications |
| expo-contacts | Contact read/link |
| expo-calendar | Follow-up scheduling |
| expo-av | Voice memo recording |
| expo-haptics | Recording start/stop feedback |
| expo-secure-store | Encrypted local storage |
| expo-camera | Contact profile photos |

STT integrated via HTTP API from JS layer — no native module required. Sarvam AI primary, ElevenLabs STT fallback.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Habit-forming problem-solving MVP — prove the core capture loop works, get 10–20 users who genuinely rely on it daily, and validate that multilingual STT quality is good enough to make the habit stick. No feature beyond what makes a user say *"I couldn't go back to not having this."*

**Resource Requirements:** Solo founder, full-stack. Zero external dev budget at launch. Every feature in the MVP must be buildable and maintainable by one person.

### MVP Feature Set (v1.0 Launch)

**Core User Journeys Supported:**
- Vashishth — Networking Blur (full capture loop in Gujarati-English)
- Prayag — Lost in English (pure Gujarati capture, language-agnostic UI)
- Pooja — Reconnecting (manual capture, personal/social context)
- Vashishth — The Wall (freemium conversion at 10-contact limit)

### Post-MVP Releases

**Week 2 (Immediate Post-Launch):**
- Pre-call summary card — context + last memo summary + 2–3 AI-suggested questions, surfaced before dialing. Deliberately excluded from v1.0 to reduce solo-founder scope; does not break the core habit loop.

**Growth Phase (Post-Validation):**
- Morning relationship briefing (curated 3–5 contacts, daily habit anchor)
- Relationship tiers (Recent Popups / Consistent Regulars / Older Acquaintances)
- Transparent curation nudges ("You've snoozed Meera 3 times — want to change her cadence?")
- Home screen widget / voice overlay (one-tap capture without opening app)
- Gentle resurface for dormant contacts
- Weekly extraction accuracy micro-review

**Vision (Long-Term):**
- Relationship risk prediction
- Commute mode / idle state recommendations
- True ambient capture
- Sales CRM extension
- Team / shared relationship tracking

## Functional Requirements

### Capture & Recording

- FR1: User can record a voice memo from the capture screen
- FR2: User can initiate a capture session by tapping a daily nudge notification
- FR3: User can manually open the capture screen at any time without a notification
- FR4: System provides clear feedback to the user when voice recording begins and when it stops
- FR5: A capture session completes successfully regardless of network availability at the time of recording; STT processing occurs when connectivity allows
- FR6: System displays a processing state after recording stops and transitions the user to the extraction review screen once STT results are available
- FR7: System displays a visible pending status on a voice memo queued for STT processing and updates it to extracted or failed once processing completes

### STT & AI Extraction

- FR8: System transcribes voice memos recorded in Hindi, Gujarati, English, and Hindi/Gujarati-English code-switched speech
- FR9: System presents extracted fields (contact name, context points, follow-up date and intent) to the user for review and confirmation before saving
- FR10: System extracts a contact name from an unstructured voice memo transcript
- FR11: System extracts 3–5 context points from a voice memo transcript
- FR12: System extracts a follow-up date and intent from a voice memo transcript (calculating relative dates based on the memo's creation date passed as a reference)
- FR13: System prompts the user to confirm or supply any extraction fields that could not be inferred, presenting one missing field at a time with the raw transcript as context, and accepts both typed and voice input for each response
- FR14: System stores the raw transcript locally if AI extraction fails, without silently discarding it
- FR15: System retries queued STT processing when network connectivity is restored
- FR15b: System provides a diagnostic logging feature ("log it") in the review screen to copy the audio file and save the transcript and all extracted fields to a dedicated SQLite log table using a matching generated ID for testing and verification


### Contact Management

- FR16: User can link a voice memo extraction result to an existing contact from their device contacts
- FR17: System suggests potential matching contacts when linking a memo to help avoid duplicate entries
- FR18: User can create a new contact from a voice memo extraction result
- FR19: User can edit a contact's name, phone number, and profile photo at any time
- FR20: User can delete a single contact and all associated memos and follow-ups
- FR21: User can edit or delete individual extracted context points and add free-text notes to any memo after it has been saved
- FR22: User can search for contacts by name
- FR23: User can view a contact's full history of memo extractions and follow-ups
- FR24: User can view their full contact list with last-interaction date and next follow-up date
- FR25: System enforces a 10-contact limit on the free plan

### Follow-up & Scheduling

- FR26: User can schedule a follow-up reminder for a contact with a specific date
- FR27: System delivers follow-up reminders with the contact name and associated context from the linked memo
- FR28: Tapping a follow-up reminder notification navigates the user to the contact's detail screen with the linked memo summary surfaced
- FR29: User can mark a follow-up as completed, moving it to the contact's history with a completion timestamp
- FR30: User can dismiss a pending follow-up reminder (marking it skipped) or reschedule it to a new date
- FR31: User can view all pending follow-ups in a list

### Notifications & Nudges

- FR32: System sends three daily capture nudge notifications (morning, afternoon, evening)
- FR33: User can configure the timing window for each daily nudge within a ±2-hour range
- FR34: Notification tap navigates the user directly to the capture screen
- FR35: System presents a re-engagement prompt on next app open if the user has not launched the app in 3 or more days, surfacing their most recent pending follow-up or suggesting a new capture

### Onboarding

- FR36: System guides a new user through a scripted first capture loop: record → STT extract → contact link → follow-up schedule
- FR37: System allows a user to exit onboarding mid-flow and resume from the same step on next app open
- FR38: System requests microphone permission at the moment of the user's first capture attempt
- FR39: System requests contacts permission at the moment of the user's first contact link attempt
- FR40: System requests notification permission after the user's first successful capture, not on cold open

### Privacy, Consent & Compliance

- FR41: System presents a plain-language consent screen at onboarding disclosing contacts access and STT audio processing as separate consent items
- FR42: System gates STT audio processing on explicit user consent and stores the consent state locally
- FR43: User can delete all their data including any associated cloud backup from within the app
- FR44: System stores a consent version field in the local database to enable re-consent if data processing purposes change
- FR45: User can access the app's grievance officer contact from within app settings
- FR46: User can enable optional Google Drive backup via Google OAuth from within app settings
- FR47: System stores all voice memos, extracted notes, and contact data on-device by default with no server-side persistence

### Subscription & Payments

- FR48: System presents a paywall when a free-plan user attempts to add an 11th contact
- FR49: System preserves any in-progress capture data when a free-plan user triggers the paywall, until the user either completes the upgrade or explicitly discards it
- FR50: User can upgrade from the free plan to the unlimited plan via in-app purchase
- FR51: System processes subscription payments via Google Play Billing on Android and Apple IAP on iOS
- FR52: User can restore a previously purchased subscription from within the app
- FR53: User can view their current plan status and manage their subscription from app settings

## Non-Functional Requirements

### Performance

- Notification tap opens the capture screen within 2 seconds on all target devices (Samsung One UI, Xiaomi MIUI, Realme UI, OnePlus OxygenOS, iPhone SE 2nd gen, iPhone 14).
- STT transcription for a 60-second voice memo completes within 5 seconds under normal network conditions.
- AI extraction from a completed transcript completes within 3 seconds.
- App cold-start time (process not already in memory) does not exceed 3 seconds on any target device.
- Contact list renders within 1 second for lists up to 500 contacts.
- Capture screen is interactive within 1 second of opening — the mic button must be tappable immediately.

### Security

- All voice memos, extracted notes, and contact data are encrypted at rest on-device (AES-256 or platform-equivalent via expo-secure-store / SQLCipher).
- STT audio is transmitted to the STT provider over HTTPS/TLS only. No audio is persisted server-side after transcription completes.
- Google Drive backup data is stored in the user's own Drive App Data folder and is not accessible by any app server.
- The app does not handle, store, or transmit raw payment credentials. All payment processing is delegated entirely to Google Play Billing (Android) and Apple IAP (iOS).
- DPDP Act compliance is implemented before launch: consent records, consent_version field, data deletion flow, and grievance officer contact are all live.
- The app must not request or access any device permission beyond what is listed in FR38–FR40 and declared in the Play Store listing and App Store privacy manifest.

### Reliability

- STT processing must succeed for ≥95% of submitted memos across primary (Sarvam AI) and fallback (ElevenLabs STT) providers combined.
- Three daily capture nudge notifications must deliver on target Indian Android OEMs (Xiaomi MIUI, Realme UI, Samsung One UI, OnePlus OxygenOS) without requiring the user to manually exempt the app from battery optimization.
- The app must function fully in read-only mode with zero network connectivity — contact list, follow-up list, and memo history all accessible offline.
- Google Drive backup sync must retry automatically on connectivity restore without requiring user action.
- STT fallback to ElevenLabs STT must activate within 5 seconds of a Sarvam AI timeout or service error, transparently to the user.

### Scalability

- STT API integration must handle up to 2,000 transcription requests per day (10 memos/user × 200 DAU at 3-month target) without hitting API quota limits. Provider quotas must be provisioned before public launch.
- On-device SQLite schema and query patterns must not degrade in performance as memo history grows beyond 1,000 records per user.

### Accessibility

- The app UI must be operable by users with limited English literacy. All primary interaction surfaces (capture screen, contact list, follow-up list) must function with minimal or no English text dependency — icons, visual hierarchy, and audio cues carry the interaction.
- Voice input must be accepted as the primary input modality for all capture and extraction confirmation flows (FR13). Typed input is offered as an alternative, not required.
- Text displayed on critical screens (capture trigger, extraction review, follow-up reminder) must be rendered at a minimum body font size of 16sp/pt to support users in the 40–55 age range (Prayag persona).

