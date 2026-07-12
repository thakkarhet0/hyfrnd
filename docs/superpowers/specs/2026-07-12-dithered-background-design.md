# Dithered noise background (black/grey/red)

**Date:** 2026-07-12
**Scope:** new `src/components/background/DitheredBackgroundDOM.tsx`,
`(tabs)/_layout.tsx`, `capture.tsx`, `CaptureScreenBackground.tsx`,
`calendar.tsx`, `contacts.tsx`, `settings.tsx`.

## Problem

The app's four main tabs currently sit on flat, static backgrounds — either
plain `theme.background` (`#1c1c1e`) on calendar/contacts/settings, or a
two-stop metal `LinearGradient` on capture. There's a lot of background
real estate doing nothing visually. The app is already permanently
dark/flat/monospace with a fixed black-grey-red palette (`MetalColors`), and
already uses `'use dom'` canvas/CSS components (`RecordButtonDOM`,
`FooterDOM`) for its more stylized chrome — this adds one more such
component: a procedurally-generated, dithered noise texture behind all four
tabs, in the same palette.

## Visual algorithm

Runs once per redraw (see "Re-roll triggers" below), not per frame:

1. **Noise base** — generate a smooth grayscale value-noise field over the
   canvas (not flat white noise): interpolate a coarse grid of random values
   up to full resolution. This gives the dither cloud-like structure instead
   of reading as uniform static.
2. **Ordered dithering** — quantize the noise field to two dark tones
   (`#1c1c1e` near-black, `#2e3032`-ish charcoal grey, both already used
   elsewhere in the app's metal palette) using an 8×8 Bayer threshold matrix.
   This is the classic ordered-dither look and is O(pixels), no
   error-diffusion state to carry across rows.
3. **Red accent** — a second, independent noise field marks a sparse top
   percentile (~3-5% of pixels) to render in a red from the existing
   `MetalColors.accentGlow`/`accentGlowActive` family instead of grey —
   flecks, not fields, so red stays an accent and doesn't compete with red
   CTA buttons/text elsewhere on screen.
4. **Resolution** — canvas backing size matches the container's CSS/logical
   pixel dimensions (not multiplied by device pixel ratio). On a typical
   phone that's on the order of 300-800K pixel writes per redraw via
   `ImageData` — cheap enough to do synchronously on each re-roll. This
   density reads as fine grain, not chunky retro blocks.

## Architecture

- New component `src/components/background/DitheredBackgroundDOM.tsx`,
  `'use dom'`, following the existing pattern in `RecordButtonDOM.tsx` /
  `FooterDOM.tsx`. Props: `{ seed: number; dom?: import('expo/dom').DOMProps }`.
  Renders a single `<canvas>` sized to its container via a global style reset
  (same `GlobalStyle`/100%-width/height approach as `RecordButtonDOM`).
  Redraws the full algorithm above on mount and whenever `seed` changes
  (`useEffect` keyed on `seed`).
- **Single shared instance** — mounted once in `src/app/(tabs)/_layout.tsx`
  as a full-bleed `StyleSheet.absoluteFill` layer behind `<Tabs>`, in the same
  "one instance shared across all tab screens" slot as `FooterDOM` already
  occupies for the footer. `pointerEvents="none"` on the wrapping `View` so it
  never intercepts touches. This avoids running four separate WebViews (one
  per screen) — there is exactly one canvas, one WebView, for the whole tab
  bar's lifetime.
- Each screen's own background becomes transparent so the shared layer shows
  through:
  - `(tabs)/capture.tsx`: `CaptureScreenBackground.tsx` is also used by
    `onboarding/capture.tsx`, which is out of scope and must keep its
    existing metal gradient — so `CaptureScreenBackground.tsx` itself is
    **not** modified. Instead, the three `CaptureScreenBackground` call sites
    in `(tabs)/capture.tsx` are replaced with the plain `Screen` component
    (which already has no background fill of its own), dropping the gradient
    only for the tab screen. (`RecordButtonDOM`'s own `.inner` gradient
    chassis is a separate, unrelated component and is not touched either
    way.)
  - `calendar.tsx`, `contacts.tsx`, `settings.tsx`: remove the
    `backgroundColor: theme.background` override passed to `Screen`, letting
    the shared dithered layer show through instead.
- Onboarding screens and other non-tab routes are out of scope and keep their
  current backgrounds unchanged.

## Re-roll (seeding) triggers

`_layout.tsx` owns a single `seed` number (`useState`, starts at a
timestamp or `0`), passed down to the one shared `DitheredBackgroundDOM`
instance. It's incremented (not reset — a monotonically increasing seed is
simplest and avoids re-triggering on the same value) on:

1. **Tab switch** — a `useEffect` keyed on the existing `activeTab` value
   (already computed in `_layout.tsx` from `pathname`) bumps the seed
   whenever it changes.
2. **App foreground** — an `AppState` change listener (`expo`'s
   `react-native` `AppState` API) bumps the seed when state transitions to
   `'active'` from a background/inactive state.
3. **Capture milestones** — `_layout.tsx` reads `isRecording`, `isPaused`,
   `isProcessing` off the existing `useCaptureStore()` zustand store (already
   used elsewhere in the app) and bumps the seed on each transition between
   these states.

Because there is only one shared canvas instance, any trigger redraws the
pattern immediately for whichever tab is currently visible; other tabs simply
see the latest pattern next time they're focused (no extra work needed since
the canvas already holds the redrawn result).

## Out of scope

- Animation/continuous motion (explicitly rejected — static-with-re-roll was
  chosen over animated grain to avoid ongoing render/battery cost).
- Onboarding and non-tab screens.
- Configurability (no settings toggle to disable the effect) — this is a
  fixed visual, not a user preference, matching the app's existing "no light
  mode, no per-user theming" stance.
