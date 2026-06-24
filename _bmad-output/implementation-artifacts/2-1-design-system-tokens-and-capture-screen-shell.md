# Story 2.1: Design System Tokens and Capture Screen Shell

Status: done

## Story

As a user,
I want the app to feel visually distinct and immediately trustworthy from the first screen I see,
so that the capture ritual feels intentional, not administrative.

## Acceptance Criteria

1. **Given** Story 1.1 is complete **When** the design tokens are applied **Then** the Mint+Navy palette is configured: light mode `#DCF2F1` bg / `#0F1035` text / `#365486` CTA / `#7FC7D9` accent (UX-DR9)
2. **And** dark mode uses the inverted palette: `#0F1035` bg / `#DCF2F1` text / `#7FC7D9` CTA / accent unchanged
3. **And** Space Mono is loaded as the sole font family; all text is lowercase (UX-DR8)
4. **And** all spacing uses 8px base unit multiples; screen padding is 24px
5. **And** all surface components (cards, buttons, chips) use `borderRadius: 0` — flat edge only (UX-DR10); the record button is the SOLE circle element (50% border-radius)
6. **And** the capture tab screen renders a centered record button placeholder and a "+" FAB
7. **And** the 3-tab bar is visible with correct icons for capture, contacts, settings (UX-DR11)
8. **And** all text on the capture screen meets the 16sp body minimum (NFR21)

## Tasks / Subtasks

- [x] Task 1: Install Space Mono font (AC: 3)
  - [x] Run `npx expo install @expo-google-fonts/space-mono` in `gods-plan/`
  - [x] Verify `SpaceMono_400Regular` and `SpaceMono_700Bold` are available from the package

- [x] Task 2: Update `src/constants/theme.ts` with full design tokens (AC: 1, 2, 3, 4, 5)
  - [x] Replace all existing Colors entries with Mint+Navy palette (light + dark)
  - [x] Add `Typography` export with all type scale entries (display, heading, subheading, body, label, caption) — each with `fontFamily`, `fontSize`, `fontWeight`, `letterSpacing`, `textTransform: 'lowercase'`
  - [x] Replace existing `Spacing` with the correct 8px-base scale
  - [x] Add `Radius` export: `none: 0`, `circle: 9999` (only two values ever used)
  - [x] Remove the `Fonts` Platform.select block — Space Mono replaces it

- [x] Task 3: Create `src/constants/paperTheme.ts` — React Native Paper MD3 theme (AC: 1, 2, 5)
  - [x] Create light Paper MD3 theme extending `MD3LightTheme` with Mint+Navy colors and `roundness: 0`
  - [x] Create dark Paper MD3 theme extending `MD3DarkTheme` with inverted Mint+Navy colors and `roundness: 0`
  - [x] Export `getPaperTheme(colorScheme: 'light' | 'dark')` helper

- [x] Task 4: Update `src/app/_layout.tsx` — load font + add PaperProvider (AC: 3)
  - [x] Import `useFonts`, `SpaceMono_400Regular`, `SpaceMono_700Bold` from `@expo-google-fonts/space-mono`
  - [x] Call `useFonts` and gate `SplashScreen.hideAsync()` behind BOTH db ready AND fonts loaded
  - [x] Wrap the returned tree with `PaperProvider` from `react-native-paper` using `getPaperTheme(colorScheme)`
  - [x] PaperProvider wraps inside PostHogProvider (PostHog outermost, PaperProvider inner)

- [x] Task 5: Update `src/app/(tabs)/_layout.tsx` — add tab icons + theme styling (AC: 7)
  - [x] Add `tabBarIcon` to each `Tabs.Screen` using `expo-symbols` `SymbolView`
  - [x] Capture: SF Symbol `"mic.fill"` (focused) / `"mic"` (unfocused)
  - [x] Contacts: SF Symbol `"person.2.fill"` (focused) / `"person.2"` (unfocused)
  - [x] Settings: SF Symbol `"gearshape.fill"` (focused) / `"gearshape"` (unfocused)
  - [x] Tab bar `activeBackgroundColor`, `activeTintColor`, `inactiveTintColor` wired to theme tokens
  - [x] Tab bar background: `#DCF2F1` (light) / `#0F1035` (dark)
  - [x] Active tint: `#365486` (light) / `#7FC7D9` (dark); Inactive tint: `#0F1035` at 50% opacity

- [x] Task 6: Update `src/app/(tabs)/capture.tsx` — render shell (AC: 6, 7, 8)
  - [x] Background: theme `background` color, full flex
  - [x] Centered circle record button placeholder: 80×80, borderRadius 40, backgroundColor `#365486` (CTA), with microphone icon centered inside
  - [x] "tap to speak" label below button — Space Mono, 16sp, lowercase, `#0F1035` / `#DCF2F1`
  - [x] "+" FAB bottom-right: use Paper `FAB` component, `icon="plus"`, `style={{ position: 'absolute', bottom: 24, right: 24 }}`
  - [x] All text on screen: minimum 16sp, Space Mono, lowercase

- [x] Task 7: Validate (AC: all)
  - [x] Run `npx tsc --noEmit` — zero errors
  - [x] Run `npm run lint` — zero warnings

## Dev Notes

**CRITICAL: Read `https://docs.expo.dev/versions/v56.0.0/` before writing any code (per AGENTS.md).**

### Current File State (READ BEFORE TOUCHING)

**`src/constants/theme.ts` (UPDATE — completely replace Colors and Fonts)**
Current state: generic black/white Colors, Platform.select Fonts (system-ui etc.), basic Spacing. NONE of this is Mint+Navy — it is wrong and must be fully replaced.

**`src/app/_layout.tsx` (UPDATE — add PaperProvider + font loading)**
Current state: PostHogProvider + ThemeProvider from @react-navigation wrapping a Stack. No PaperProvider. No font loading. `SplashScreen.hideAsync()` fires after DB init only.
- DO NOT remove or break: Sentry.init, PostHogProvider, initializeDatabase(), SplashScreen.preventAutoHideAsync(), DB error screen
- ADD: useFonts call; gate hideAsync on BOTH dbReady AND fontsLoaded; add PaperProvider

**`src/app/(tabs)/_layout.tsx` (UPDATE — add icons + styling)**
Current state: bare `<Tabs>` with three `<Tabs.Screen>` — no icons, no color config.

**`src/app/(tabs)/capture.tsx` (UPDATE — render shell)**
Current state: `<View flex:1 center><Text>{t('capture.title')}</Text></View>` — a placeholder only.

### Design Token Spec

```typescript
// src/constants/theme.ts
export const Colors = {
  light: {
    background: '#DCF2F1',
    text: '#0F1035',
    cta: '#365486',
    accent: '#7FC7D9',
  },
  dark: {
    background: '#0F1035',
    text: '#DCF2F1',
    cta: '#7FC7D9',
    accent: '#7FC7D9',
  },
} as const;

export const Typography = {
  display:    { fontSize: 32, fontWeight: '700', letterSpacing: 2.5,  textTransform: 'lowercase' as const },
  heading:    { fontSize: 24, fontWeight: '700', letterSpacing: 1.9,  textTransform: 'lowercase' as const },
  subheading: { fontSize: 20, fontWeight: '400', letterSpacing: 0.8,  textTransform: 'lowercase' as const },
  body:       { fontSize: 16, fontWeight: '400', letterSpacing: 0.6,  textTransform: 'lowercase' as const },
  label:      { fontSize: 14, fontWeight: '700', letterSpacing: 0.5,  textTransform: 'lowercase' as const },
  caption:    { fontSize: 12, fontWeight: '400', letterSpacing: 0.5,  textTransform: 'lowercase' as const },
} as const;

// letterSpacing values are in pixels, derived from em values:
// display:    0.08em × 32 = 2.56 → 2.5
// heading:    0.08em × 24 = 1.92 → 1.9
// subheading: 0.04em × 20 = 0.80
// body:       0.04em × 16 = 0.64 → 0.6
// label/cap:  0.04em × 14 = 0.56 → 0.5

export const Spacing = {
  xs:     4,   // 0.5 unit
  sm:     8,   // 1 unit
  md:     16,  // 2 units
  lg:     24,  // 3 units — screen padding
  xl:     32,  // 4 units — section gap
  xxl:    64,  // 8 units
} as const;

export const Radius = {
  none:   0,
  circle: 9999,
} as const;

// Remove Fonts Platform.select entirely. fontFamily is set globally via useFonts.
```

### Paper Theme Spec

```typescript
// src/constants/paperTheme.ts
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightPaperTheme = {
  ...MD3LightTheme,
  roundness: 0,  // flat-edge on ALL Paper components
  colors: {
    ...MD3LightTheme.colors,
    primary: '#365486',
    onPrimary: '#DCF2F1',
    background: '#DCF2F1',
    onBackground: '#0F1035',
    surface: '#DCF2F1',
    onSurface: '#0F1035',
    secondary: '#7FC7D9',
    onSecondary: '#0F1035',
  },
};

export const darkPaperTheme = {
  ...MD3DarkTheme,
  roundness: 0,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#7FC7D9',
    onPrimary: '#0F1035',
    background: '#0F1035',
    onBackground: '#DCF2F1',
    surface: '#0F1035',
    onSurface: '#DCF2F1',
    secondary: '#7FC7D9',
    onSecondary: '#0F1035',
  },
};

export function getPaperTheme(scheme: 'light' | 'dark') {
  return scheme === 'dark' ? darkPaperTheme : lightPaperTheme;
}
```

### Font Loading Pattern

```typescript
// In src/app/_layout.tsx — key changes only
import { useFonts, SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const [fontsLoaded] = useFonts({ SpaceMono_400Regular, SpaceMono_700Bold });
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    if (!fontsLoaded) return;  // wait for fonts before DB init
    initializeDatabase()
      .then(() => { setDbReady(true); SplashScreen.hideAsync(); })
      .catch((error) => { setDbError(...); SplashScreen.hideAsync(); });
  }, [fontsLoaded]);

  if (!fontsLoaded || (!dbReady && !dbError)) return null; // keep splash up

  return (
    <PostHogProvider client={analyticsClient}>
      <PaperProvider theme={getPaperTheme(scheme)}>
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </PaperProvider>
    </PostHogProvider>
  );
}
```

**IMPORTANT:** `fontFamily` in StyleSheet must reference the LOADED font name exactly: `'SpaceMono_400Regular'` or `'SpaceMono_700Bold'`. Paper components inherit font via theme — to apply Space Mono to Paper text, add `fonts` override to the Paper theme (see React Native Paper v5 custom font docs) OR use `StyleSheet` with `fontFamily: 'SpaceMono_400Regular'` on all `<Text>` and Paper `<Text>` variants.

### Tab Icons

Use `expo-symbols` (already installed). The `SymbolView` component renders SF Symbols on iOS and Material Symbols on Android (via `@expo-google-fonts/material-symbols`, already in node_modules).

```typescript
// In src/app/(tabs)/_layout.tsx
import { SymbolView } from 'expo-symbols';

<Tabs.Screen
  name="capture"
  options={{
    title: t('tabs.capture'),
    tabBarIcon: ({ focused, color }) => (
      <SymbolView
        name={focused ? 'mic.fill' : 'mic'}
        size={24}
        tintColor={color}
      />
    ),
  }}
/>
```

SF Symbol names:
- capture: `"mic.fill"` / `"mic"`
- contacts: `"person.2.fill"` / `"person.2"`
- settings: `"gearshape.fill"` / `"gearshape"`

Tab bar styling (add to `<Tabs screenOptions={...}>`):
```typescript
screenOptions={{
  headerShown: false,
  tabBarStyle: {
    backgroundColor: scheme === 'dark' ? '#0F1035' : '#DCF2F1',
    borderTopWidth: 0,
    elevation: 0,
  },
  tabBarActiveTintColor: scheme === 'dark' ? '#7FC7D9' : '#365486',
  tabBarInactiveTintColor: scheme === 'dark' ? '#DCF2F1' + '80' : '#0F1035' + '80',
  tabBarLabelStyle: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 10,
    textTransform: 'lowercase',
  },
}}
```

Tab layout needs access to `colorScheme` — use `useColorScheme()` from `'react-native'`.

### Capture Screen Shell

```typescript
// src/app/(tabs)/capture.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/use-theme';

export default function CaptureScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Record button placeholder — circle is the ONLY curved element */}
      <View style={styles.center}>
        <Pressable style={[styles.recordPlaceholder, { backgroundColor: theme.cta }]}>
          {/* mic icon placeholder — replaced by RecordButton in Story 2.2 */}
        </Pressable>
        <Text style={[styles.hint, { color: theme.text }]}>
          {t('capture.recordButton')}
        </Text>
      </View>

      {/* "+" FAB — bottom right */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.cta }]}
        onPress={() => {/* wired in Story 2.2 */}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  recordPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,   // 50% — the SOLE circle element (UX-DR10)
    marginBottom: 16,
  },
  hint: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 16,          // body minimum (NFR21)
    textTransform: 'lowercase',
    letterSpacing: 0.6,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    borderRadius: 0,  // override Paper's default radius — flat edge
  },
});
```

**NOTE on FAB borderRadius:** React Native Paper's FAB uses `roundness` from the theme, but applying `borderRadius: 0` to its `style` prop may not fully override the internal rounded shape. If the FAB renders with a rounded corner despite `roundness: 0` in the Paper theme, apply `{ borderRadius: 0 }` to both `style` and `contentStyle` props on the FAB. Check Paper v5 FAB docs for the correct override.

### Critical UX Invariants for This Story

- `borderRadius: 0` on ALL surfaces — record placeholder is the ONLY `borderRadius: 40` element
- `textTransform: 'lowercase'` on every `<Text>` — including tab labels
- Body text minimum 16sp — the `hint` text must be `fontSize: 16` minimum (NFR21)
- Dark mode uses `#0F1035` bg / `#DCF2F1` text (NOT just system dark defaults)

### `useTheme` hook

`src/hooks/use-theme.ts` already exists and returns `Colors[scheme]`. After updating `Colors` in theme.ts, this hook will automatically return the correct Mint+Navy values — no changes needed to the hook itself.

### Typography not applied via Paper fonts

React Native Paper v5 allows setting a custom font via the `fonts` key in the theme. This is NOT required for this story — only the capture screen and tab bar need Space Mono. Full Paper font integration can be done in a future story. For this story: apply `fontFamily: 'SpaceMono_400Regular'` directly in StyleSheet to all Text components on the capture screen.

### Previous Story Learnings

- File paths always use `src/` prefix (confirmed: `gods-plan/src/...`, NOT `gods-plan/...`)
- No test runner — validation is `npx tsc --noEmit` + `npm run lint` only
- `dangerouslyDisableSandbox: true` on all Bash tool calls

### File Structure — No New Dirs Needed

All files are modifications to existing files or additions to existing directories:
- `src/constants/theme.ts` — UPDATE (exists)
- `src/constants/paperTheme.ts` — NEW (in existing `constants/` dir)
- `src/app/_layout.tsx` — UPDATE (exists)
- `src/app/(tabs)/_layout.tsx` — UPDATE (exists)
- `src/app/(tabs)/capture.tsx` — UPDATE (exists)

**Do NOT create** `src/components/capture/` for this story — RecordButton.tsx is Story 2.2. The placeholder in capture.tsx uses an inline `Pressable` + `View` style only.

### References

- [Source: epics/epic-2-core-capture-loop.md — Story 2.1 ACs]
- [Source: ux-design-specification.md — Visual Design section (palette, typography, spacing, shape)]
- [Source: ux-design-specification.md — Components table (React Native Paper, custom components)]
- [Source: architecture.md — Frontend Architecture (state management, UI components)]
- [Source: architecture.md — Project Structure (file locations)]
- [Source: implementation-artifacts/1-7-stt-accuracy-validation-spike.md — Dev Notes (file path conventions, no test runner, dangerouslyDisableSandbox)]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- `src/constants/theme.ts` (updated): Replaced generic Colors with Mint+Navy palette (light + dark). Added Typography scale with 6 levels (display→caption), all with `textTransform: 'lowercase'` and pixel letterSpacing derived from em spec. New Spacing (8px base), Radius (none:0, circle:9999). Removed Platform.select Fonts block.
- `src/constants/paperTheme.ts` (new): MD3 light + dark Paper themes with `roundness: 0` (flat-edge all Paper components) and Mint+Navy color overrides. `getPaperTheme(scheme)` helper exported.
- `src/app/_layout.tsx` (updated): Added `useFonts` from `@expo-google-fonts/space-mono` loading `SpaceMono_400Regular` + `SpaceMono_700Bold`. `SplashScreen.hideAsync()` gated behind BOTH fonts loaded AND DB ready. Added `PaperProvider` wrapping inside `PostHogProvider`.
- `src/app/(tabs)/_layout.tsx` (updated): Tab icons via `expo-symbols` `SymbolView` (mic/person.2/gearshape, filled when focused). Tab bar background, active/inactive tint wired to Mint+Navy tokens. Tab labels in SpaceMono_400Regular, 10sp, lowercase.
- `src/app/(tabs)/capture.tsx` (updated): Full shell — mint/navy background, centered 80×80 circle record placeholder (sole curved element), hint text at 16sp SpaceMono lowercase, Paper FAB bottom-right.
- Validation: `npx tsc --noEmit` zero errors; `npm run lint` zero warnings.

### File List

- `gods-plan/src/constants/theme.ts` (updated)
- `gods-plan/src/constants/paperTheme.ts` (new)
- `gods-plan/src/app/_layout.tsx` (updated)
- `gods-plan/src/app/(tabs)/_layout.tsx` (updated)
- `gods-plan/src/app/(tabs)/capture.tsx` (updated)
- `gods-plan/package.json` (updated — @expo-google-fonts/space-mono added)
- `gods-plan/package-lock.json` (updated)
