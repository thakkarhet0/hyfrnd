# Dithered Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat/gradient backgrounds behind the four main tabs (capture, calendar, contacts, settings) with a single shared, procedurally-generated, black/grey/red dithered noise texture that re-rolls on tab switch, app foreground, and capture recording milestones.

**Architecture:** One new `'use dom'` canvas component (`DitheredBackgroundDOM.tsx`, same pattern as the existing `RecordButtonDOM`/`FooterDOM`) draws a Bayer-ordered-dithered noise field. A single instance of it is mounted once in `(tabs)/_layout.tsx`, absolutely positioned behind the tab stack, driven by one `seed` number that the layout bumps on tab change, `AppState` foreground events, and `useCaptureStore()` recording-state transitions. The four tab screens stop painting their own opaque backgrounds so the shared layer shows through.

**Tech Stack:** Expo Router `'use dom'` components (WebView-backed on native, plain React on web), `styled-components` (already used by `FooterDOM`/`RecordButtonDOM`), React Native `AppState`, Zustand (`useCaptureStore`). No new dependencies.

## Global Constraints

- No light mode — the app is permanently dark ("metal") themed (`src/constants/theme.ts`: `Colors.light === Colors.dark`). Only use colors from `MetalColors`/`Colors` — do not invent new hex values beyond the three named in this plan (`#1c1c1e`, `#2e3032`, `#cc1a00`), which are already `MetalColors.footerBackground`-adjacent / `MetalColors.accentGlow` values.
- `'use dom'` components are sized via the `dom={{ style: ... }}` prop passed from the RN side (manual sizing), matching `FooterDOM`'s usage in `(tabs)/_layout.tsx` — not via `matchContents` or a `ResizeObserver`.
- On native, `'use dom'` components render as real WebViews (`@expo/dom-webview`, SDK 56+). On web (`expo start --web`), the `dom` prop is ignored and the component renders as a plain React component — this is the fastest way to visually preview the dither algorithm during development.
- This project has **no automated test runner** (no jest/vitest configured, no `*.test.ts` files exist anywhere in the repo). Every task's verification step is `npx tsc --noEmit` (type safety) plus `npm run lint`, plus a manual run-through — this matches how every other screen in this codebase has been verified (see `docs/superpowers/plans/2026-07-12-calendar-tab.md`).
- Do not touch `CaptureScreenBackground.tsx` — it's shared with `onboarding/capture.tsx`, which is out of scope and must keep its existing `MetalColors.gradient` background unchanged.

---

### Task 1: `DitheredBackgroundDOM` canvas component

**Files:**
- Create: `src/components/background/DitheredBackgroundDOM.tsx`

**Interfaces:**
- Produces: `export default function DitheredBackgroundDOM(props: { seed: number; dom?: import('expo/dom').DOMProps }): JSX.Element` — consumed by Task 2.

- [ ] **Step 1: Create the component file**

```tsx
'use dom';

import React, { useEffect, useRef } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

// Matches the reset used by RecordButtonDOM.tsx / FooterDOM.tsx so the
// WebView's default document doesn't add margin/UA-stylesheet offsets.
const GlobalStyle = createGlobalStyle`
  html, body, #root {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: transparent;
  }
`;

export interface DitheredBackgroundDOMProps {
  /** Bump this to redraw a new pattern; the same seed always redraws identically. */
  seed: number;
  dom?: import('expo/dom').DOMProps;
}

// 8x8 Bayer ordered-dither matrix (values 0-63).
const BAYER_8X8 = [
  [0, 48, 12, 60, 3, 51, 15, 63],
  [32, 16, 44, 28, 35, 19, 47, 31],
  [8, 56, 4, 52, 11, 59, 7, 55],
  [40, 24, 36, 20, 43, 27, 39, 23],
  [2, 50, 14, 62, 1, 49, 13, 61],
  [34, 18, 46, 30, 33, 17, 45, 29],
  [10, 58, 6, 54, 9, 57, 5, 53],
  [42, 26, 38, 22, 41, 25, 37, 21],
];

// Deterministic PRNG (mulberry32) so a given seed always draws the same
// pattern — no dependency needed for this.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bilinear-interpolated value noise: a coarse grid of random values,
// upsampled to (width, height) so the tone field has cloud-like structure
// instead of reading as flat static.
function generateValueNoise(
  width: number,
  height: number,
  rng: () => number,
  cell: number,
): Float32Array {
  const cols = Math.ceil(width / cell) + 2;
  const rows = Math.ceil(height / cell) + 2;
  const grid = new Float32Array(cols * rows);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();

  const field = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const gy = y / cell;
    const y0 = Math.floor(gy);
    const fy = gy - y0;
    for (let x = 0; x < width; x++) {
      const gx = x / cell;
      const x0 = Math.floor(gx);
      const fx = gx - x0;
      const v00 = grid[y0 * cols + x0];
      const v10 = grid[y0 * cols + x0 + 1];
      const v01 = grid[(y0 + 1) * cols + x0];
      const v11 = grid[(y0 + 1) * cols + x0 + 1];
      const top = v00 + (v10 - v00) * fx;
      const bottom = v01 + (v11 - v01) * fx;
      field[y * width + x] = top + (bottom - top) * fy;
    }
  }
  return field;
}

// MetalColors.footerBackground-adjacent near-black + a lighter charcoal grey
// (the app's two darkest metal tones), plus MetalColors.accentGlow red.
const COLOR_BLACK: readonly [number, number, number] = [28, 28, 30]; // #1c1c1e
const COLOR_GREY: readonly [number, number, number] = [46, 48, 50]; // #2e3032
const COLOR_RED: readonly [number, number, number] = [204, 26, 0]; // #cc1a00

function drawDither(ctx: CanvasRenderingContext2D, width: number, height: number, seed: number): void {
  const toneField = generateValueNoise(width, height, mulberry32(seed), 24);
  // Independent per-pixel draw (not smoothed) for the red mask, so red reads
  // as sparse flecks rather than smoothed blobs.
  const redRng = mulberry32(seed ^ 0x9e3779b9);

  const image = ctx.createImageData(width, height);
  const data = image.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const threshold = (BAYER_8X8[y % 8][x % 8] + 0.5) / 64;
      const isRed = redRng() > 0.96; // ~4% of pixels
      const color = isRed ? COLOR_RED : toneField[i] > threshold ? COLOR_GREY : COLOR_BLACK;
      const p = i * 4;
      data[p] = color[0];
      data[p + 1] = color[1];
      data[p + 2] = color[2];
      data[p + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
}

export default function DitheredBackgroundDOM({ seed }: DitheredBackgroundDOMProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const width = Math.max(1, Math.round(parent?.clientWidth ?? window.innerWidth));
    const height = Math.max(1, Math.round(parent?.clientHeight ?? window.innerHeight));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawDither(ctx, width, height, seed);
  }, [seed]);

  return (
    <Root>
      <GlobalStyle />
      <Canvas ref={canvasRef} />
    </Root>
  );
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  background: #1c1c1e;
`;

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `DitheredBackgroundDOM.tsx`.

Run: `npm run lint`
Expected: no errors/warnings mentioning `DitheredBackgroundDOM.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/background/DitheredBackgroundDOM.tsx
git commit -m "feat: add dithered noise background canvas component"
```

---

### Task 2: Wire the shared instance into the tab layout with seed triggers

**Files:**
- Modify: `src/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `DitheredBackgroundDOM` (`{ seed: number; dom?: DOMProps }`) from Task 1; `useCaptureStore` (`isRecording: boolean`, `isPaused: boolean`, `isProcessing: boolean`) from `@/stores/capture.store` (existing).

- [ ] **Step 1: Replace the full contents of `src/app/(tabs)/_layout.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Tabs, router, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FooterDOM, { type FooterTabKey } from '@/components/navigation/FooterDOM';
import DitheredBackgroundDOM from '@/components/background/DitheredBackgroundDOM';
import { useCaptureStore } from '@/stores/capture.store';

const FOOTER_HEIGHT = 58;

const ROUTE_BY_TAB = {
  capture: '/capture',
  calendar: '/calendar',
  contacts: '/contacts',
  settings: '/settings',
} as const;

export default function TabLayout() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [seed, setSeed] = useState(() => Date.now());
  const isRecording = useCaptureStore((s) => s.isRecording);
  const isPaused = useCaptureStore((s) => s.isPaused);
  const isProcessing = useCaptureStore((s) => s.isProcessing);

  const activeTab: FooterTabKey = pathname.startsWith('/calendar')
    ? 'calendar'
    : pathname.startsWith('/contacts')
      ? 'contacts'
      : pathname.startsWith('/settings')
        ? 'settings'
        : 'capture';

  // Re-roll on tab switch.
  useEffect(() => {
    setSeed((s) => s + 1);
  }, [activeTab]);

  // Re-roll on capture recording milestones.
  useEffect(() => {
    setSeed((s) => s + 1);
  }, [isRecording, isPaused, isProcessing]);

  // Re-roll when the app returns to the foreground.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') setSeed((s) => s + 1);
    });
    return () => subscription.remove();
  }, []);

  const handleSelect = async (tab: FooterTabKey) => {
    router.push(ROUTE_BY_TAB[tab]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.background} pointerEvents="none">
        <DitheredBackgroundDOM
          seed={seed}
          dom={{
            style: styles.backgroundDom,
            scrollEnabled: false,
            backgroundColor: 'transparent',
          }}
        />
      </View>
      <View style={styles.tabs}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tabs.Screen name="capture" options={{ title: t('tabs.capture') }} />
          <Tabs.Screen name="calendar" options={{ title: t('tabs.calendar') }} />
          <Tabs.Screen name="contacts" options={{ title: t('tabs.contacts') }} />
          <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
        </Tabs>
      </View>
      <View style={{ height: FOOTER_HEIGHT + insets.bottom }}>
        <FooterDOM
          activeTab={activeTab}
          labels={{
            capture: t('tabs.capture'),
            calendar: t('tabs.calendar'),
            contacts: t('tabs.contacts'),
            settings: t('tabs.settings'),
          }}
          bottomInset={insets.bottom}
          onSelect={handleSelect}
          dom={{
            style: styles.footerDom,
            scrollEnabled: false,
            backgroundColor: 'transparent',
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundDom: {
    width: '100%',
    height: '100%',
  },
  tabs: {
    flex: 1,
  },
  footerDom: {
    width: '100%',
    height: '100%',
  },
});
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `(tabs)/_layout.tsx`.

Run: `npm run lint`
Expected: no errors/warnings mentioning `(tabs)/_layout.tsx`.

- [ ] **Step 3: Manual verification**

Run: `npm run ios` (or `npm run web` for a faster first look, though the WebView-specific `dom` prop is ignored there so it's a rough approximation of native sizing/behavior)

Confirm:
- A dithered black/grey/red pattern is visible full-bleed behind the capture tab (record button and text still fully legible on top of it).
- Switching to calendar/contacts/settings shows the same style of pattern (may differ in exact noise since it re-rolls per switch), not a flat color.
- Backgrounding the app (e.g. cmd+shift+H in simulator) and returning changes the pattern.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(tabs)/_layout.tsx"
git commit -m "feat: mount shared dithered background behind tab layout"
```

---

### Task 3: Make the four tab screens transparent so the shared layer shows through

**Files:**
- Modify: `src/app/(tabs)/capture.tsx:1-17,84,115,122` (imports + 3 call sites)
- Modify: `src/app/(tabs)/calendar.tsx:174`
- Modify: `src/app/(tabs)/contacts.tsx:200`
- Modify: `src/app/(tabs)/settings.tsx:18`

**Interfaces:**
- Consumes: `Screen` (`{ children: ReactNode; style?: StyleProp<ViewStyle>; edges?: readonly Edge[] }`) from `@/components/Screen` (existing, unchanged).

- [ ] **Step 1: In `src/app/(tabs)/capture.tsx`, swap the `CaptureScreenBackground` import for `Screen`**

Change:
```tsx
import { CaptureScreenBackground } from '@/components/capture/CaptureScreenBackground';
```
to:
```tsx
import { Screen } from '@/components/Screen';
```

- [ ] **Step 2: Replace all three `CaptureScreenBackground` JSX usages with `Screen`**

The first (error) branch — change:
```tsx
    return (
      <CaptureScreenBackground style={styles.container}>
        <View style={styles.center}>
```
to:
```tsx
    return (
      <Screen style={styles.container}>
        <View style={styles.center}>
```
and its matching closing tag — change:
```tsx
          </Pressable>
        </View>
      </CaptureScreenBackground>
    );
  }
```
to:
```tsx
          </Pressable>
        </View>
      </Screen>
    );
  }
```

The processing branch — change:
```tsx
    return (
      <CaptureScreenBackground style={styles.container}>
        <ProcessingScreen memoId={memoId} isConnected={isConnected ?? false} />
      </CaptureScreenBackground>
    );
  }
```
to:
```tsx
    return (
      <Screen style={styles.container}>
        <ProcessingScreen memoId={memoId} isConnected={isConnected ?? false} />
      </Screen>
    );
  }
```

The default (idle/recording) branch — change:
```tsx
  return (
    <CaptureScreenBackground style={styles.container}>
      <SttConsentGate>
```
to:
```tsx
  return (
    <Screen style={styles.container}>
      <SttConsentGate>
```
and its matching closing tag — change:
```tsx
      </SttConsentGate>
    </CaptureScreenBackground>
  );
}
```
to:
```tsx
      </SttConsentGate>
    </Screen>
  );
}
```

- [ ] **Step 3: Remove the flat `backgroundColor` overrides on the other three tab screens**

In `src/app/(tabs)/calendar.tsx`, change:
```tsx
    <Screen style={[styles.container, { backgroundColor: theme.background }]}>
```
to:
```tsx
    <Screen style={styles.container}>
```

In `src/app/(tabs)/contacts.tsx`, change:
```tsx
    <Screen style={[styles.container, { backgroundColor: theme.background }]}>
```
to:
```tsx
    <Screen style={styles.container}>
```

In `src/app/(tabs)/settings.tsx`, change:
```tsx
    <Screen style={{ backgroundColor: theme.background }}>
```
to:
```tsx
    <Screen>
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors. In particular, confirm `theme` is still used elsewhere in `calendar.tsx`/`contacts.tsx`/`settings.tsx` (it is — for `theme.text`/`theme.highlight` on other elements) so removing the one `backgroundColor: theme.background` usage doesn't leave an unused-variable lint error; `capture.tsx` still uses `useTheme()`'s `theme.highlight` for the Done button, so its import stays too.

Run: `npm run lint`
Expected: no errors/warnings.

- [ ] **Step 5: Manual verification**

Run: `npm run ios`

Confirm:
- Capture tab: dithered background visible, record button and its own gradient chassis unaffected, idle/recording/paused/processing/error states all still legible.
- Calendar/Contacts/Settings tabs: dithered background visible behind list content; text, rows, and buttons remain fully readable (no contrast regression).
- Navigate to onboarding (fresh install or reset flow) and confirm the onboarding capture screen still shows its original metal gradient, unaffected.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(tabs)/capture.tsx" "src/app/(tabs)/calendar.tsx" "src/app/(tabs)/contacts.tsx" "src/app/(tabs)/settings.tsx"
git commit -m "refactor: make tab screens transparent so the shared dithered background shows through"
```

---

### Task 4: End-to-end verification pass

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Full type-check and lint**

Run: `npx tsc --noEmit`
Expected: zero errors.

Run: `npm run lint`
Expected: zero errors/warnings.

- [ ] **Step 2: Manual regression pass on device/simulator**

Run: `npm run ios`

Walk through and confirm:
1. Capture tab loads with the dithered background; tap-record → pause → the delete/done buttons are visible and tappable (this was fixed in commit `77cff58` — confirm no regression).
2. Switching capture → calendar → contacts → settings → capture re-rolls the background pattern each time (visually distinct grain each switch).
3. Background the app and resume — pattern changes again.
4. Start/pause/finish a recording on the capture tab — pattern changes on each transition.
5. Contacts and Settings screens: existing scroll/list interactions still work, text contrast against the new background is still readable.
6. Onboarding flow (if reachable via a fresh-install/reset path) still shows its original unmodified gradient background.

- [ ] **Step 3: Commit (only if Step 2 surfaced fixes)**

If any issues were found and fixed during manual verification:
```bash
git add -A
git commit -m "fix: address issues found in dithered background verification pass"
```

If no issues were found, skip this step — nothing to commit.
