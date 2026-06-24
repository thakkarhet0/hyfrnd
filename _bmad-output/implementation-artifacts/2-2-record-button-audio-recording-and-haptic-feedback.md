# Story 2.2: Record Button, Audio Recording, and Haptic Feedback

Status: done

## Story

As a user,
I want to tap a button to start and stop recording my voice memo,
So that the capture ritual feels physical and intentional.

## Acceptance Criteria

1. **Given** the capture screen is open **When** the user taps the record button **Then** a strong haptic fires (mic live signal) (UX-DR1)
2. **And** the teal waveform animation begins playing (UX-DR2)
3. **And** `expo-av` begins recording audio to a temporary file path
4. **And** the record button changes visual state to indicate active recording (navy → teal fill)
5. **When** the user taps the record button again (stop) **Then** a soft haptic fires (memo captured signal) (UX-DR1)
6. **And** the waveform animation fades to still (UX-DR2)
7. **And** `expo-av` stops recording and the audio file is written to permanent storage via `expo-file-system` — **this write completes before `hasRecorded` is set true or any state transition** (Critical Invariant 1)
8. **And** a "re-record" option is available before the user proceeds (tapping it deletes the permanent file and resets to idle)
9. **And** the record button is the only circle element on screen (50% border-radius); all other elements are flat-edge (UX-DR10)

## Tasks / Subtasks

- [x] Task 1: Install `expo-file-system` (AC: 7)
  - [x] Run `npx expo install expo-file-system` in `gods-plan/`
  - [x] Verify `FileSystem.documentDirectory` is accessible in a TypeScript import

- [x] Task 2: Create `src/stores/capture.store.ts` — Zustand recording state (AC: 3, 4, 7, 8)
  - [x] Create `useCaptureStore` with `create<CaptureState>` from `zustand`
  - [x] State fields: `recordingUri: string | null`, `isRecording: boolean`, `hasRecorded: boolean`
  - [x] Actions: `setRecordingUri(uri)`, `setIsRecording(b)`, `setHasRecorded(b)`, `reset()`
  - [x] `reset()` returns all fields to initial values: `null`, `false`, `false`

- [x] Task 3: Create `src/components/capture/WaveformAnimation.tsx` — animated teal bars (AC: 2, 6)
  - [x] 5 animated bars using `react-native-reanimated` `useSharedValue` + `useAnimatedStyle`
  - [x] `isActive: boolean` prop controls animation on/off
  - [x] Active state: bars animate height 4→28px with `withRepeat(withSequence(withTiming up, withTiming down), -1)` — staggered by DELAYS `[0, 80, 160, 80, 0]` ms via `withDelay`
  - [x] Inactive state: bars `withTiming` to height 4px over 300ms (fade to still)
  - [x] `color: string` prop sets bar fill — caller passes `theme.accent`
  - [x] Bar style: `width: 4`, `borderRadius: 0` (flat-edge — UX-DR10), height animated
  - [x] Container: `flexDirection: 'row'`, `alignItems: 'center'`, `columnGap: 4`, `height: 32`

- [x] Task 4: Create `src/components/capture/RecordButton.tsx` — custom circle button (AC: 1–4, 9)
  - [x] Import `useTheme` from `@/hooks/use-theme` for theme-aware colors
  - [x] Circle: `width: 80, height: 80, borderRadius: 40` — SOLE circle element, never duplicate this radius anywhere else
  - [x] Idle background: `theme.cta`; recording background: `theme.accent`
  - [x] Center: `SymbolView name="mic.fill" size={32} tintColor={theme.background}` (from `expo-symbols`)
  - [x] `WaveformAnimation` rendered below the button (inside wrapper `View`), `isActive={isRecording}`, `color={theme.accent}`
  - [x] Props: `isRecording: boolean, onPress: () => void, disabled?: boolean`
  - [x] Disabled state: `opacity: 0.5` on button
  - [x] Accessibility: `accessibilityRole="button"`, label toggles "start recording" / "stop recording", `accessibilityState={{ selected: isRecording }}`

- [x] Task 5: Create `src/hooks/use-capture-flow.ts` — recording orchestration (AC: 1–8)
  - [x] Keep `Audio.Recording` instance in `useRef<Audio.Recording | null>` — not Zustand (recording objects are not serializable)
  - [x] `startRecording()`:
    - [x] Call `Audio.requestPermissionsAsync()` — store status; if not granted, set `permissionStatus: 'denied'` and return early
    - [x] Call `Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })`
    - [x] Call `Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)` — store ref
    - [x] Call `store.setIsRecording(true)`
    - [x] Fire `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)` — strong haptic (UX-DR1)
  - [x] `stopRecording()`:
    - [x] Call `recording.stopAndUnloadAsync()` on the ref
    - [x] Get `tempUri = recording.getURI()` — guard null (if null, set error and return)
    - [x] Ensure permanent audio directory exists: `FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true })` (idempotent)
    - [x] Generate permanent path: `AUDIO_DIR + 'memo-' + Date.now() + '.m4a'` — use `Date.now()` for uniqueness
    - [x] `await FileSystem.moveAsync({ from: tempUri, to: permanentPath })` — completes before any state update (Critical Invariant 1)
    - [x] Call `store.setRecordingUri(permanentPath)`, `store.setHasRecorded(true)`, `store.setIsRecording(false)`
    - [x] Reset audio mode: `Audio.setAudioModeAsync({ allowsRecordingIOS: false })`
    - [x] Fire `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` — soft haptic (UX-DR1)
  - [x] `reRecord()`:
    - [x] If `store.recordingUri` exists: `await FileSystem.deleteAsync(store.recordingUri, { idempotent: true })`
    - [x] Call `store.reset()`
  - [x] Return: `{ isRecording, hasRecorded, recordingUri, permissionStatus, error, startRecording, stopRecording, reRecord }`
  - [x] Wrap `startRecording` + `stopRecording` in `try/catch` — on error, call `store.reset()` and set local error state; never leave `isRecording: true` on failure
  - [x] `AUDIO_DIR` constant: `(FileSystem.documentDirectory ?? '') + 'audio/'`
  - [x] Import `Audio` from `expo-av`; `Haptics` from `expo-haptics`; `FileSystem` from `expo-file-system/legacy`; `useCaptureStore` from `@/stores/capture.store`

- [x] Task 6: Update `src/app/(tabs)/capture.tsx` — wire RecordButton (AC: all)
  - [x] Import and use `useCaptureFlow` from `@/hooks/use-capture-flow`
  - [x] Replace `<Pressable>` record placeholder with `<RecordButton isRecording={isRecording} onPress={handleToggleRecord} />`
  - [x] `handleToggleRecord`: if `isRecording` → call `stopRecording()`; else → call `startRecording()`
  - [x] Hint text: `t('capture.recordButton')` when idle; `t('capture.tapToStop')` when recording; hidden when `hasRecorded && !isRecording` (re-record state)
  - [x] Re-record row (shown when `hasRecorded && !isRecording`): a flat-edge `Pressable` with `t('capture.reRecord')` label, calling `reRecord()`; Typography.label style
  - [x] If `permissionStatus === 'denied'`: show `t('capture.micPermissionNeeded')` in place of hint text
  - [x] Keep the Paper `FAB` icon="plus" as-is — will be wired in Story 2.3

- [x] Task 7: Update i18n locale files (AC: UX copy)
  - [x] `en.json`: update `capture.recordButton` → `"tap to speak"`; add `capture.tapToStop`, `capture.reRecord`, `capture.micPermissionNeeded`
  - [x] `hi.json`: update `capture.recordButton` → `"बोलने के लिए टैप करें"`; add three new keys in Hindi
  - [x] `gu.json`: update `capture.recordButton` → `"બોલવા માટે ટૅપ કરો"`; add three new keys in Gujarati

- [x] Task 8: Validate (AC: all)
  - [x] Run `npx tsc --noEmit` in `gods-plan/` — zero errors
  - [x] Run `npm run lint` in `gods-plan/` — zero warnings

### Review Follow-ups (AI)

- [x] [AI-Review] Fix #1 (CONFIRMED): double-tap race in `startRecording` — add `if (recordingRef.current) return` guard at function entry
- [x] [AI-Review] Fix #2 (CONFIRMED): audio mode not reset in `startRecording` catch — track `audioModeSet` flag; call `setAudioModeAsync({ allowsRecordingIOS: false })` in catch when flag is true
- [x] [AI-Review] Fix #3 (CONFIRMED): `store.reset()` after successful `moveAsync` could orphan persisted file — move `setAudioModeAsync` and haptic outside the try block so a failure there cannot trigger `store.reset()` on an already-persisted file
- [x] [AI-Review] Fix #4 (PLAUSIBLE): native recorder not stopped when `stopAndUnloadAsync` throws — call `recording.stopAndUnloadAsync().catch(() => {})` in the catch block to best-effort release the microphone
- [x] [AI-Review] Fix #5 (PLAUSIBLE): no unmount cleanup — add `useEffect` that stops active recording and calls `store.reset()` on unmount to prevent stale `isRecording: true` after navigation

## Dev Notes

**CRITICAL: Read `https://docs.expo.dev/versions/v56.0.0/` before writing any code (per AGENTS.md).**

### What Story 2.1 Built (Do Not Break)

Story 2.1 completed:
- `src/constants/theme.ts` — Mint+Navy `Colors`, `Typography`, `Spacing`, `Radius`, `FONT_REGULAR`, `FONT_BOLD`
- `src/constants/paperTheme.ts` — `getPaperTheme(scheme)`, `lightPaperTheme`, `darkPaperTheme` (no `as const`)
- `src/app/_layout.tsx` — `PaperProvider` wraps inside `PostHogProvider`; fonts gated with `useFonts`; DB init behind fonts
- `src/app/(tabs)/_layout.tsx` — Tab bar with `expo-symbols` icons, Mint+Navy colors via `Colors` import
- `src/app/(tabs)/capture.tsx` — 80×80 Pressable placeholder, hint text, Paper FAB (all replaced/updated by this story)
- `src/hooks/use-theme.ts` — `useTheme()` returns `Colors[scheme === 'dark' ? 'dark' : 'light']`

### Current `capture.tsx` State (MUST READ Before Modifying)

```tsx
// gods-plan/src/app/(tabs)/capture.tsx — current (Story 2.1 output)
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function CaptureScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.center}>
        {/* REPLACE THIS Pressable with RecordButton component */}
        <Pressable style={[styles.recordPlaceholder, { backgroundColor: theme.cta }]} ... />
        <Text style={[styles.hint, { color: theme.text }]}>
          {t('capture.recordButton')}
        </Text>
      </View>
      {/* Keep FAB — wired in Story 2.3 */}
      <FAB icon="plus" style={[styles.fab, { backgroundColor: theme.cta }]} onPress={() => {}} />
    </View>
  );
}
```

Story 2.2 replaces the `Pressable` + hint with `RecordButton` + dynamic hint + re-record option. **Keep the FAB unchanged.**

### Design Token Reference (from theme.ts)

```ts
Colors.light = { background: '#DCF2F1', text: '#0F1035', cta: '#365486', accent: '#7FC7D9' }
Colors.dark  = { background: '#0F1035', text: '#DCF2F1', cta: '#7FC7D9', accent: '#7FC7D9' }
// Note: accent is #7FC7D9 (teal) in BOTH modes — waveform is always teal
```

### Installed Packages (no new installs needed except expo-file-system)

- `expo-av ^16.0.8` ✅ — audio recording
- `expo-haptics ~56.0.3` ✅ — haptic feedback
- `expo-symbols ~56.0.5` ✅ — mic icon (SymbolView)
- `react-native-reanimated 4.3.1` ✅ — waveform animation
- `zustand ^5.0.14` ✅ — capture state store
- `expo-file-system` ❌ — **NOT installed, Task 1 installs it**

### expo-av v16 Recording API (Expo SDK 56)

```ts
import { Audio } from 'expo-av';

// Step 1: Check permission
const { granted } = await Audio.requestPermissionsAsync();
if (!granted) { /* handle denied */ return; }

// Step 2: Set audio mode (required for iOS)
await Audio.setAudioModeAsync({
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
});

// Step 3: Start recording
const { recording } = await Audio.Recording.createAsync(
  Audio.RecordingOptionsPresets.HIGH_QUALITY
);
// Store `recording` in useRef — not Zustand (not serializable)

// Step 4: Stop recording
await recording.stopAndUnloadAsync();
const tempUri = recording.getURI(); // string | null — guard the null case

// Step 5: Reset audio mode (or next playback call breaks)
await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
```

**HIGH_QUALITY preset produces `.m4a` on both iOS and Android.**

### expo-file-system Permanent Storage Pattern

```ts
import * as FileSystem from 'expo-file-system';

const AUDIO_DIR = FileSystem.documentDirectory + 'audio/';

// Ensure directory exists (call once per startRecording, idempotent)
await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });

// Move from temp cache → permanent document directory
// MUST complete BEFORE any store update (Critical Invariant 1)
const permanentPath = AUDIO_DIR + 'memo-' + Date.now() + '.m4a';
await FileSystem.moveAsync({ from: tempUri!, to: permanentPath });

// On re-record: delete the saved file
await FileSystem.deleteAsync(permanentPath, { idempotent: true });
```

**Why `Date.now()` not `nanoid()`:** `nanoid` v5 requires `globalThis.crypto` which needs a polyfill in React Native. `Date.now()` is monotonic + unique within a session — sufficient for a local audio filename. If the project later adds `expo-crypto`, switch to `nanoid()`.

### expo-haptics API

```ts
import * as Haptics from 'expo-haptics';

// Strong haptic — mic live (tap to start)
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Soft haptic — memo captured (tap to stop)
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
```

Haptics are fire-and-forget — do NOT await them before proceeding with recording start/stop. Call them async alongside the recording action.

### Zustand Store Pattern (from architecture.md)

```ts
// src/stores/capture.store.ts
import { create } from 'zustand';

interface CaptureState {
  recordingUri: string | null;
  isRecording: boolean;
  hasRecorded: boolean;
  setRecordingUri: (uri: string | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setHasRecorded: (hasRecorded: boolean) => void;
  reset: () => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  recordingUri: null,
  isRecording: false,
  hasRecorded: false,
  setRecordingUri: (uri) => set({ recordingUri: uri }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setHasRecorded: (hasRecorded) => set({ hasRecorded }),
  reset: () => set({ recordingUri: null, isRecording: false, hasRecorded: false }),
}));
```

Store name `useCaptureStore` matches architecture.md convention: `capture.store.ts` → exported as `useCaptureStore`.

### WaveformAnimation Implementation

```tsx
// src/components/capture/WaveformAnimation.tsx
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

const BAR_COUNT = 5;
const BAR_MAX_HEIGHT = 28;
const BAR_MIN_HEIGHT = 4;
const ANIMATION_DURATION = 400;
const DELAYS = [0, 80, 160, 80, 0]; // wave-like stagger

function WaveBar({ isActive, delay, color }: { isActive: boolean; delay: number; color: string }) {
  const height = useSharedValue(BAR_MIN_HEIGHT);

  useEffect(() => {
    if (isActive) {
      height.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(BAR_MAX_HEIGHT, { duration: ANIMATION_DURATION }),
            withTiming(BAR_MIN_HEIGHT, { duration: ANIMATION_DURATION }),
          ),
          -1,
          false,
        ),
      );
    } else {
      height.value = withTiming(BAR_MIN_HEIGHT, { duration: 300 });
    }
  }, [isActive]); // intentionally omit delay + height from deps — stable values

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return <Animated.View style={[styles.bar, animatedStyle, { backgroundColor: color }]} />;
}

interface WaveformAnimationProps {
  isActive: boolean;
  color: string;
}

export function WaveformAnimation({ isActive, color }: WaveformAnimationProps) {
  return (
    <View style={styles.container}>
      {DELAYS.map((delay, index) => (
        <WaveBar key={index} isActive={isActive} delay={delay} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
  },
  bar: {
    width: 4,
    borderRadius: 0, // flat-edge — UX-DR10, only record button gets circle
  },
});
```

**Reanimated 4 note:** Setting `.value` directly in `useEffect` is the correct cross-version pattern. Reanimated 4 runs the animation on the UI thread automatically. The `withDelay + withRepeat + withSequence` nesting is supported in all Reanimated versions ≥2.

### RecordButton Implementation

```tsx
// src/components/capture/RecordButton.tsx
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/hooks/use-theme';
import { WaveformAnimation } from './WaveformAnimation';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export function RecordButton({ isRecording, onPress, disabled = false }: RecordButtonProps) {
  const theme = useTheme();
  const buttonColor = isRecording ? theme.accent : theme.cta;

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[styles.button, { backgroundColor: buttonColor, opacity: disabled ? 0.5 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={isRecording ? 'stop recording' : 'start recording'}
        accessibilityState={{ selected: isRecording }}
      >
        <SymbolView name="mic.fill" size={32} tintColor={theme.background} />
      </Pressable>
      <WaveformAnimation isActive={isRecording} color={theme.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 16,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40, // 50% — SOLE circle element on screen (UX-DR10)
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

**CRITICAL:** `borderRadius: 40` on the button is the ONLY occurrence of this value in this story. Do not add `borderRadius` to any re-record button, hint text container, or any other element.

### use-capture-flow.ts Hook

```ts
// src/hooks/use-capture-flow.ts
import { useCallback, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';

import { useCaptureStore } from '@/stores/capture.store';

const AUDIO_DIR = FileSystem.documentDirectory + 'audio/';

type PermissionStatus = 'undetermined' | 'granted' | 'denied';

export function useCaptureFlow() {
  const store = useCaptureStore();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [error, setError] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setPermissionStatus('denied');
        return;
      }
      setPermissionStatus('granted');

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      store.setIsRecording(true);
      // fire-and-forget — do not await haptic
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err) {
      store.reset();
      setError(err instanceof Error ? err.message : 'recording failed');
    }
  }, [store]);

  const stopRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const tempUri = recording.getURI();
      if (!tempUri) throw new Error('recording URI is null after stop');

      await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
      const permanentPath = AUDIO_DIR + 'memo-' + Date.now() + '.m4a';
      // AUDIO-FIRST: move to permanent storage before updating any state
      await FileSystem.moveAsync({ from: tempUri, to: permanentPath });

      store.setRecordingUri(permanentPath);
      store.setHasRecorded(true);
      store.setIsRecording(false);
      recordingRef.current = null;

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      // fire-and-forget
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      store.reset();
      recordingRef.current = null;
      setError(err instanceof Error ? err.message : 'stop failed');
    }
  }, [store]);

  const reRecord = useCallback(async () => {
    if (store.recordingUri) {
      await FileSystem.deleteAsync(store.recordingUri, { idempotent: true });
    }
    store.reset();
    setError(null);
  }, [store]);

  return {
    isRecording: store.isRecording,
    hasRecorded: store.hasRecorded,
    recordingUri: store.recordingUri,
    permissionStatus,
    error,
    startRecording,
    stopRecording,
    reRecord,
  };
}
```

### Updated capture.tsx Structure

```tsx
// src/app/(tabs)/capture.tsx — Story 2.2 final shape
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCaptureFlow } from '@/hooks/use-capture-flow';
import { RecordButton } from '@/components/capture/RecordButton';

export default function CaptureScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { isRecording, hasRecorded, permissionStatus, startRecording, stopRecording, reRecord } =
    useCaptureFlow();

  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.center}>
        <RecordButton isRecording={isRecording} onPress={handleToggleRecord} />

        {/* Hint text — contextual */}
        {!hasRecorded && (
          <Text style={[styles.hint, { color: theme.text }]}>
            {permissionStatus === 'denied'
              ? t('capture.micPermissionNeeded')
              : isRecording
                ? t('capture.tapToStop')
                : t('capture.recordButton')}
          </Text>
        )}

        {/* Re-record option — shown after a successful recording */}
        {hasRecorded && !isRecording && (
          <Pressable onPress={reRecord} style={styles.reRecordButton}>
            <Text style={[styles.reRecordLabel, { color: theme.cta }]}>
              {t('capture.reRecord')}
            </Text>
          </Pressable>
        )}
      </View>

      {/* "+" FAB — will be wired to capture flow in Story 2.3 */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.cta }]}
        onPress={() => {}}
        accessibilityLabel="new capture"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  hint: {
    ...Typography.body,
  },
  reRecordButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 0, // flat-edge — UX-DR10
  },
  reRecordLabel: {
    ...Typography.label,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 0,
  },
});
```

### i18n Key Changes

| File | Key | Old value | New value |
|------|-----|-----------|-----------|
| en.json | `capture.recordButton` | "Hold to record" | "tap to speak" |
| en.json | `capture.tapToStop` | _(new)_ | "tap to stop" |
| en.json | `capture.reRecord` | _(new)_ | "re-record" |
| en.json | `capture.micPermissionNeeded` | _(new)_ | "microphone access needed" |
| hi.json | `capture.recordButton` | "रिकॉर्ड करने के लिए दबाएं" | "बोलने के लिए टैप करें" |
| hi.json | `capture.tapToStop` | _(new)_ | "रोकने के लिए टैप करें" |
| hi.json | `capture.reRecord` | _(new)_ | "फिर से रिकॉर्ड करें" |
| hi.json | `capture.micPermissionNeeded` | _(new)_ | "माइक्रोफ़ोन एक्सेस आवश्यक है" |
| gu.json | `capture.recordButton` | "રેકોર્ડ કરવા માટે દબાવો" | "બોલવા માટે ટૅપ કરો" |
| gu.json | `capture.tapToStop` | _(new)_ | "રોકવા માટે ટૅપ કરો" |
| gu.json | `capture.reRecord` | _(new)_ | "ફરી રેકોર્ડ કરો" |
| gu.json | `capture.micPermissionNeeded` | _(new)_ | "માઇક્રોફોન એક્સેસ જરૂરી છે" |

### Critical Invariants (must not violate)

1. **Audio-first (Architecture Critical Invariant 1):** `FileSystem.moveAsync` MUST `await` and resolve before calling `store.setHasRecorded(true)`. No navigation, no state update, no haptic fires before the file is persisted to disk.
2. **Recording ref in useRef, NOT Zustand:** `Audio.Recording` objects are stateful native objects. Storing them in Zustand (which may serialize state) will crash or behave incorrectly. Always keep in `useRef`.
3. **Audio mode reset:** After `stopAndUnloadAsync()`, call `Audio.setAudioModeAsync({ allowsRecordingIOS: false })`. If omitted, subsequent audio playback (e.g., voice prompts in later stories) will be silenced on iOS.
4. **Reset on error:** Wrap both `startRecording` and `stopRecording` in try/catch. On any error, call `store.reset()` and null `recordingRef.current`. Never leave `isRecording: true` in an error state.
5. **borderRadius: 40 is exclusive to the record button.** Do not use this value anywhere else. All other elements use `borderRadius: 0`.
6. **Haptics are fire-and-forget.** Do not `await` `Haptics.impactAsync()` — fire it alongside other operations, not before.

### New Directory to Create

The `src/components/capture/` directory does not exist yet. Create it with the two new component files. No `index.ts` barrel needed — import directly from file path.

### Validation Commands

```bash
cd gods-plan
npx tsc --noEmit   # must exit 0
npm run lint       # must exit 0 (eslint --max-warnings 0)
```

No test runner exists in this project — TypeScript + lint IS the validation layer.

### File Structure for This Story

```
gods-plan/src/
├── app/(tabs)/capture.tsx          ← UPDATE: replace Pressable, wire RecordButton
├── components/capture/             ← NEW DIRECTORY
│   ├── RecordButton.tsx            ← NEW
│   └── WaveformAnimation.tsx       ← NEW
├── hooks/use-capture-flow.ts       ← NEW
├── stores/capture.store.ts         ← NEW
└── constants/i18n/locales/
    ├── en.json                     ← UPDATE: 4 capture key changes
    ├── hi.json                     ← UPDATE: 4 capture key changes
    └── gu.json                     ← UPDATE: 4 capture key changes
```

### References

- [Source: epics/epic-2-core-capture-loop.md — Story 2.2 ACs and Critical Invariant 1]
- [Source: ux-design-specification.md — Capture Mechanics (haptics, waveform, re-record)]
- [Source: ux-design-specification.md — Components table (RecordButton: custom, circle, navy fill, teal waveform)]
- [Source: architecture.md — Critical Invariants (audio-first, no silent drops)]
- [Source: architecture.md — Frontend Architecture (Zustand stores, useCaptureFlow hook)]
- [Source: architecture.md — Project Structure (components/capture/, hooks/, stores/)]
- [Source: 2-1-design-system-tokens-and-capture-screen-shell.md — established patterns, no test runner, dangerouslyDisableSandbox]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- expo-file-system ~56.0.8 (SDK 56) ships a new OOP API (`File`, `Directory`, `Paths`) and marks the old functional API deprecated-throws-at-runtime. Fixed by importing from `expo-file-system/legacy` which provides the full `documentDirectory`, `makeDirectoryAsync`, `moveAsync`, `deleteAsync` API unchanged. `tsc --noEmit` confirmed zero errors with the legacy import.

### Completion Notes List

- `src/stores/capture.store.ts` (new): Zustand store — `recordingUri | null`, `isRecording`, `hasRecorded`; `reset()` returns all to initial values.
- `src/components/capture/WaveformAnimation.tsx` (new): 5-bar animated waveform via Reanimated 4 `useSharedValue + useAnimatedStyle + withRepeat/withSequence/withDelay`. Wave-stagger delays `[0,80,160,80,0]`ms. Bars: `width:4, borderRadius:0` (flat-edge). Active: height 4→28px loops; Inactive: `withTiming` 300ms to 4px.
- `src/components/capture/RecordButton.tsx` (new): 80×80 circle (`borderRadius:40`) — sole curved element. Idle=`theme.cta`, recording=`theme.accent`. `SymbolView "mic.fill"` centered. `WaveformAnimation` below. Full accessibility state.
- `src/hooks/use-capture-flow.ts` (new): `Audio.Recording` held in `useRef` (not Zustand). `startRecording`: permission → setAudioMode → createAsync → Heavy haptic (fire-and-forget). `stopRecording`: stopAndUnload → `expo-file-system/legacy` makeDirectory + moveAsync (AUDIO-FIRST before state update) → setRecordingUri/setHasRecorded/setIsRecording → reset audioMode → Light haptic. `reRecord`: deleteAsync + store.reset(). Both wrapped in try/catch — always resets on error.
- `src/app/(tabs)/capture.tsx` (updated): Replaced Pressable placeholder with `<RecordButton>`. Contextual hint (`tapToSpeak / tapToStop / micPermissionNeeded`). Re-record `<Pressable>` shown when `hasRecorded && !isRecording`. FAB unchanged.
- i18n locales (updated): `en/hi/gu.json` — `capture.recordButton` updated to UX-spec copy; added `tapToStop`, `reRecord`, `micPermissionNeeded` in all three languages.
- Validation: `npx tsc --noEmit` zero errors; `npm run lint` zero warnings.

### File List

- `gods-plan/src/components/capture/RecordButton.tsx` (new)
- `gods-plan/src/components/capture/WaveformAnimation.tsx` (new)
- `gods-plan/src/stores/capture.store.ts` (new)
- `gods-plan/src/hooks/use-capture-flow.ts` (new)
- `gods-plan/src/app/(tabs)/capture.tsx` (updated)
- `gods-plan/src/constants/i18n/locales/en.json` (updated)
- `gods-plan/src/constants/i18n/locales/hi.json` (updated)
- `gods-plan/src/constants/i18n/locales/gu.json` (updated)
- `gods-plan/package.json` (updated — expo-file-system added)
- `gods-plan/package-lock.json` (updated)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-06-11 | Story created — ready-for-dev | bmad-create-story |
| 2026-06-11 | Implemented all tasks — status set to review | claude-sonnet-4-6 |
| 2026-06-11 | Addressed code review findings — 5 items resolved; status set to done | claude-sonnet-4-6 |
