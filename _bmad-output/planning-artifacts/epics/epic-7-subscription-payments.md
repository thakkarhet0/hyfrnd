---
type: epic
epic_id: epic-7
title: "Epic 7: Subscription & Payments"
description: >
  User hits the freemium limit naturally mid-capture, sees a no-friction paywall,
  can upgrade via native IAP, and can manage or restore their subscription.
status: planned
priority: 7
depends_on: [epic-1, epic-2]
frs_covered: [FR25, FR48, FR49, FR50, FR51, FR52, FR53]
ux_drs_covered: [UX-DR13]
stories: ["7.1", "7.2", "7.3", "7.4", "7.5"]
input_documents:
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics/index.md
agent_instructions: >
  The freemium gate fires at the contact-link step (Story 2.8 in epic-2), never
  during or before recording — this is Critical Invariant 3 in architecture.md.
  The paywall must be a custom component (UX-DR13): ₹400/month, 7-day trial framing,
  no dark patterns, no countdown timers. No payment credentials pass through app
  code — platform handles them natively (NFR10). In-progress capture must be
  preserved as a draft if the user declines upgrade (FR49). Restore purchase is
  iOS-only on the paywall; Android handles it automatically via Play Store.
---

# Epic 7: Subscription & Payments

User hits the freemium limit naturally mid-capture, sees a no-friction paywall, can upgrade via native IAP, and can manage or restore their subscription.

---

## Story 7.1: Contact Count Tracking and Freemium Gate Logic

As a user (free plan),
I want the app to track my contact count and stop me cleanly at the limit,
So that the freemium constraint is enforced consistently across all flows.

**Acceptance Criteria:**

**Given** the user is on the free plan
**When** a new contact is about to be created (contact linking step in the capture flow, Story 2.8)
**Then** the system checks `SELECT COUNT(*) FROM contacts` before writing (FR25)
**And** if count is < 10, the contact is created normally
**And** if count is = 10 (this would be the 11th), the paywall is triggered (FR48)
**And** the check happens at the contact-link step — the audio and extraction are already complete and safe on disk before the paywall appears (FR49, Critical Invariant 3)
**And** `subscription.store.ts` caches `contact_count` and `plan_tier` so the check is synchronous in the UI

---

## Story 7.2: Paywall Screen

As a user,
I want the paywall to feel like a natural continuation of what I was doing, not a hard stop,
So that upgrading feels like enabling more, not being punished.

**Acceptance Criteria:**

**Given** the freemium gate is triggered
**When** the paywall screen appears
**Then** it shows ₹400/month with a 7-day free trial as the primary offer (UX-DR13)
**And** the copy references the specific contact the user was about to save (personalised anchor)
**And** the screen includes: "subscribe", "restore purchase" (iOS), and "not now" options
**And** tapping "not now" saves the in-progress capture as a draft and returns the user to the contacts tab (FR49)
**And** there are no countdown timers, false scarcity claims, or dark patterns (UX-DR13)
**And** the paywall is a custom component built per UX-DR13 spec

---

## Story 7.3: In-App Purchase Flow

As a user,
I want to subscribe directly from the paywall using my existing payment method,
So that upgrading is frictionless and my capture is saved immediately after.

**Acceptance Criteria:**

**Given** the paywall is displayed
**When** the user taps "subscribe"
**Then** Google Play Billing (Android) or Apple IAP (iOS) native purchase flow is triggered (FR51)
**And** on successful purchase, `subscription.store.ts` sets `plan_tier: 'unlimited'`
**And** the in-progress capture resumes from contact linking — seamlessly, without restarting (FR50)
**And** no payment credentials pass through app code — all handled natively by the platform (NFR10)
**And** if the purchase fails, the user is returned to the paywall with a retry option — the draft capture is still preserved

---

## Story 7.4: Subscription Restore

As a user,
I want to restore my subscription on a new device or after reinstalling,
So that I don't lose my paid access.

**Acceptance Criteria:**

**Given** the user previously purchased a subscription
**When** they tap "restore purchase" on the paywall or in settings
**Then** the platform's restore flow is triggered (FR52)
**And** on successful restore, `plan_tier` is set to `'unlimited'` and the contact limit is lifted
**And** if no prior purchase is found, a clear message is shown: "no previous purchase found"
**And** restore is available on the paywall screen (iOS only — Play Store handles this automatically on Android)

---

## Story 7.5: Plan Status and Subscription Management in Settings

As a user,
I want to see my current plan and manage my subscription from within the app,
So that I'm never surprised by what I'm paying for or when it renews.

**Acceptance Criteria:**

**Given** the settings tab is open
**When** the user opens subscription settings
**Then** the current plan tier (free or unlimited) is displayed (FR53)
**And** for unlimited plan: renewal date and price are shown
**And** a "manage subscription" deep link opens the platform's native subscription management screen (Play Store or App Store)
**And** for free plan: the current contact count (e.g. "7/10 contacts") and an upgrade CTA are shown
**And** the contact count updates in real time as contacts are added or deleted
