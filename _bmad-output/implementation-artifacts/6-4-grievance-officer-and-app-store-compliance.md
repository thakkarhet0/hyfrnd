# Story 6.4: Grievance Officer and App Store Compliance

Status: done

## Story

As a user,
I want to access the app's grievance officer contact from within the app,
So that I can raise data concerns as required under the DPDP Act (FR45, NFR11).

## Acceptance Criteria

1. **Given** the settings tab is open, **When** the user scrolls to the legal section, **Then** the grievance officer email is displayed and tappable (opens native mail app)
2. **Given** the legal section is visible, **Then** a Privacy Policy link is present and tappable (opens in-app browser)
3. **Given** the legal section is visible, **Then** the app version and build number are displayed
4. **Given** the app is submitted to the App Store, **Then** the iOS `PrivacyInfo.xcprivacy` file declares `NSPrivacyCollectedDataTypes` entries for the data the app collects (contacts, usage analytics, crash data)
5. **Given** the app is submitted to stores, **Then** the Play Store listing and App Store listing include both the Privacy Policy URL and the grievance officer email (verified/documented — no code change)

## Tasks / Subtasks

- [x] Task 1: Create `src/components/settings/LegalSettings.tsx` (AC: 1, 2, 3)
  - [x] Render section title "legal"
  - [x] Render grievance officer email row — tapping calls `Linking.openURL('mailto:grievance@godsplan.app')`
  - [x] Render privacy policy row — tapping calls `WebBrowser.openBrowserAsync('https://godsplan.app/privacy')`
  - [x] Render app version row showing `version (build)` from `Constants.expoConfig`

- [x] Task 2: Add `<LegalSettings />` to settings screen (AC: 1, 2, 3)
  - [x] Import and render `<LegalSettings />` in `src/app/(tabs)/settings.tsx` below `<ConsentSettings />`

- [x] Task 3: Update `ios/Godsplan/PrivacyInfo.xcprivacy` (AC: 4)
  - [x] Add `NSPrivacyCollectedDataTypes` array with entries for: name/phone (identity-linked, app functionality), product interaction analytics (not linked, analytics), crash data (not linked, app functionality)
  - [x] Preserve all existing `NSPrivacyAccessedAPITypes` entries (3 entries — do NOT remove them)
  - [x] Keep `NSPrivacyTracking: false`

- [x] Task 4: Add i18n keys to all three locales (AC: 1, 2, 3)

- [x] Task 5: Verify `tsc --noEmit` passes cleanly

## Dev Notes

### Overview

This story adds a "legal" section at the bottom of the settings screen with three items: grievance officer contact, privacy policy link, and app version. It also updates the iOS `PrivacyInfo.xcprivacy` to accurately declare data collection types (required for App Store submission review).

**Scope is strictly**: one new settings component + settings screen update + one iOS plist update + i18n. Do NOT implement feedback forms, push contact-us flows, or in-app privacy policy rendering. The privacy policy opens in the system browser. There is no new DB schema or service.

---

### Task 1 Details: `LegalSettings.tsx`

**File**: `src/components/settings/LegalSettings.tsx`

**Imports needed**:
```ts
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';

import { FONT_BOLD, FONT_REGULAR, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
```

**Constants (module-level)**:
```ts
const GRIEVANCE_EMAIL = 'grievance@godsplan.app';
const PRIVACY_POLICY_URL = 'https://godsplan.app/privacy';
```

**Version derivation**:
```ts
const version = Constants.expoConfig?.version ?? '—';
// On iOS build number is a string (e.g. "1"), on Android it's a number (versionCode)
// Both are stored in expoConfig at compile time
const buildNumber =
  Constants.expoConfig?.ios?.buildNumber ??
  String(Constants.expoConfig?.android?.versionCode ?? '—');
const versionLabel = `${version} (${buildNumber})`;
```

**Full component**:
```tsx
export function LegalSettings() {
  const { t } = useTranslation();
  const theme = useTheme();

  const version = Constants.expoConfig?.version ?? '—';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    String(Constants.expoConfig?.android?.versionCode ?? '—');

  const handleEmailPress = () => {
    void Linking.openURL(`mailto:${GRIEVANCE_EMAIL}`);
  };

  const handlePrivacyPress = () => {
    void WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL);
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('legal.title')}</Text>

      <Pressable
        onPress={handleEmailPress}
        style={({ pressed }) => [styles.row, { borderColor: theme.text + '20', opacity: pressed ? 0.6 : 1 }]}
        accessibilityRole="link"
      >
        <Text style={[styles.rowLabel, { color: theme.text }]}>{t('legal.grievanceOfficer')}</Text>
        <Text style={[styles.rowValue, { color: theme.cta }]}>{GRIEVANCE_EMAIL}</Text>
      </Pressable>

      <Pressable
        onPress={handlePrivacyPress}
        style={({ pressed }) => [styles.row, { borderColor: theme.text + '20', opacity: pressed ? 0.6 : 1 }]}
        accessibilityRole="link"
      >
        <Text style={[styles.rowLabel, { color: theme.text }]}>{t('legal.privacyPolicy')}</Text>
        <Text style={[styles.rowValue, { color: theme.cta }]}>{t('legal.privacyPolicyLink')}</Text>
      </Pressable>

      <View style={[styles.row, { borderColor: theme.text + '20' }]}>
        <Text style={[styles.rowLabel, { color: theme.text }]}>{t('legal.version')}</Text>
        <Text style={[styles.rowValue, { color: theme.text + '80' }]}>{`${version} (${buildNumber})`}</Text>
      </View>
    </View>
  );
}
```

**Styles** (follow same patterns as `BackupSettings.tsx` and `NotificationSettings.tsx`):
```ts
const styles = StyleSheet.create({
  section: {
    gap: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: FONT_BOLD,
    fontSize: 18,
    textTransform: 'lowercase',
  },
  row: {
    borderWidth: 1,
    padding: Spacing.md,
    gap: 4,
  },
  rowLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 14,
    textTransform: 'lowercase',
  },
  rowValue: {
    fontFamily: FONT_REGULAR,
    fontSize: 14,
    textTransform: 'lowercase',
  },
});
```

**Important notes**:
- `Linking` is from `react-native` (NOT `expo-linking`) — both work for `mailto:` but react-native's is already implicit from other imports
- `WebBrowser` is from `expo-web-browser` which is already in package.json and used in `BackupSettings.tsx`
- `Constants` is from `expo-constants` (already installed, used in `_layout.tsx` and `BackupSettings.tsx`)
- DO NOT call `WebBrowser.maybeCompleteAuthSession()` — that is only for OAuth redirects in `BackupSettings.tsx`
- The email and URL are hardcoded constants at module level — not i18n keys — because they are legal/contact data that must not vary by locale
- `Constants.expoConfig?.ios?.buildNumber` is typed `string | undefined`; `Constants.expoConfig?.android?.versionCode` is typed `number | undefined` — `String()` coercion handles both

---

### Task 2 Details: Settings Screen Update

In `src/app/(tabs)/settings.tsx` — add after the existing `ConsentSettings` import and render:

```tsx
import { LegalSettings } from '@/components/settings/LegalSettings';
// inside ScrollView, after <ConsentSettings />:
<LegalSettings />
```

Current settings screen renders: heading → NotificationSettings → BackupSettings → ConsentSettings → (new) LegalSettings.

---

### Task 3 Details: `PrivacyInfo.xcprivacy` Update

**File**: `ios/Godsplan/PrivacyInfo.xcprivacy`

**Current state**: The file has 3 `NSPrivacyAccessedAPITypes` entries (FileTimestamp C617.1, UserDefaults CA92.1, SystemBootTime 35F9.1), an empty `NSPrivacyCollectedDataTypes` array, and `NSPrivacyTracking: false`.

**What to add**: Populate `NSPrivacyCollectedDataTypes` with actual data types the app collects. Per Apple's format:

```xml
<key>NSPrivacyCollectedDataTypes</key>
<array>
    <!-- Contact names from voice memos — identity-linked, required for app function -->
    <dict>
        <key>NSPrivacyCollectedDataType</key>
        <string>NSPrivacyCollectedDataTypeName</string>
        <key>NSPrivacyCollectedDataTypeLinked</key>
        <true/>
        <key>NSPrivacyCollectedDataTypeTracking</key>
        <false/>
        <key>NSPrivacyCollectedDataTypePurposes</key>
        <array>
            <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
        </array>
    </dict>
    <!-- Phone numbers from voice memos — identity-linked, app function -->
    <dict>
        <key>NSPrivacyCollectedDataType</key>
        <string>NSPrivacyCollectedDataTypePhoneNumber</string>
        <key>NSPrivacyCollectedDataTypeLinked</key>
        <true/>
        <key>NSPrivacyCollectedDataTypeTracking</key>
        <false/>
        <key>NSPrivacyCollectedDataTypePurposes</key>
        <array>
            <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
        </array>
    </dict>
    <!-- PostHog analytics — product interaction events, not identity-linked -->
    <dict>
        <key>NSPrivacyCollectedDataType</key>
        <string>NSPrivacyCollectedDataTypeProductInteraction</string>
        <key>NSPrivacyCollectedDataTypeLinked</key>
        <false/>
        <key>NSPrivacyCollectedDataTypeTracking</key>
        <false/>
        <key>NSPrivacyCollectedDataTypePurposes</key>
        <array>
            <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
        </array>
    </dict>
    <!-- Sentry crash reports — diagnostics, not identity-linked -->
    <dict>
        <key>NSPrivacyCollectedDataType</key>
        <string>NSPrivacyCollectedDataTypeCrashData</string>
        <key>NSPrivacyCollectedDataTypeLinked</key>
        <false/>
        <key>NSPrivacyCollectedDataTypeTracking</key>
        <false/>
        <key>NSPrivacyCollectedDataTypePurposes</key>
        <array>
            <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
        </array>
    </dict>
</array>
```

**Do NOT** add or remove any `NSPrivacyAccessedAPITypes` entries — those 3 entries were generated by Expo's prebuild and are correct for the libraries used.

**Do NOT** change `NSPrivacyTracking` — it remains `<false/>`.

---

### Task 4 Details: i18n Keys

**`en.json`** — add under `"legal"` key:
```json
"legal": {
  "title": "legal",
  "grievanceOfficer": "grievance officer",
  "privacyPolicy": "privacy policy",
  "privacyPolicyLink": "godsplan.app/privacy",
  "version": "version"
}
```

**`hi.json`**:
```json
"legal": {
  "title": "कानूनी",
  "grievanceOfficer": "शिकायत अधिकारी",
  "privacyPolicy": "गोपनीयता नीति",
  "privacyPolicyLink": "godsplan.app/privacy",
  "version": "संस्करण"
}
```

**`gu.json`**:
```json
"legal": {
  "title": "કાનૂની",
  "grievanceOfficer": "ફરિયાદ અધિકારી",
  "privacyPolicy": "ગોપનીયતા નીતિ",
  "privacyPolicyLink": "godsplan.app/privacy",
  "version": "આવૃત્તિ"
}
```

Note: `privacyPolicyLink` is a display string (the short domain), not the actual URL. The actual URL (`https://godsplan.app/privacy`) is a hardcoded constant in `LegalSettings.tsx`.

---

### Critical Patterns to Preserve

**`expo-web-browser`** — already installed, used in `BackupSettings.tsx`. Import as `import * as WebBrowser from 'expo-web-browser'`. Call `WebBrowser.openBrowserAsync(url)` — this returns a Promise; use `void` to suppress the floating promise since we don't need the result.

**`expo-constants`** — already installed. Import as `import Constants from 'expo-constants'`. `Constants.expoConfig` is typed as `ExpoConfig | null`. Use optional chaining throughout.

**`Linking` from `react-native`** — built-in, no import install needed. `Linking.openURL('mailto:...')` returns a Promise; use `void` to suppress.

**Design system constraints**:
- `FONT_BOLD` / `FONT_REGULAR` — Space Mono
- `textTransform: 'lowercase'` on all text labels
- `borderRadius: 0` — no rounded corners (use `borderWidth: 1` rectangular rows)
- `Spacing.md` (16) for row padding, `Spacing.lg` (24) for section gap
- Row pattern: `borderWidth: 1` container with label + value stacked vertically (same as consent row structure)
- Colors via `useTheme()` — `theme.text`, `theme.cta`, `theme.background`

**No SafeAreaView wrapping** — the settings screen already handles that at the screen level.

**No WebBrowser.maybeCompleteAuthSession()** — that call is only in `BackupSettings.tsx` for OAuth redirects.

---

### Existing Code Not to Break

| File | What to preserve |
|------|-----------------|
| `src/app/(tabs)/settings.tsx` | All existing imports and renders (NotificationSettings, BackupSettings, ConsentSettings) must remain |
| `ios/Godsplan/PrivacyInfo.xcprivacy` | All 3 `NSPrivacyAccessedAPITypes` entries, `NSPrivacyTracking: false` |
| `src/components/settings/BackupSettings.tsx` | `WebBrowser.maybeCompleteAuthSession()` at module level — this must NOT be copied to LegalSettings |

---

### Tests

No automated tests. Validation gate: `npx tsc --noEmit`.

Manual test:
1. Open settings → scroll to bottom → see "legal" section
2. Tap grievance officer email → native mail app opens with `grievance@godsplan.app` pre-filled
3. Tap privacy policy → in-app browser opens `https://godsplan.app/privacy`
4. Version row shows format `1.0.0 (1)` (or `1.0.0 (—)` in dev)
5. All text renders in lowercase

---

### File List

- `src/components/settings/LegalSettings.tsx` (NEW)
- `src/app/(tabs)/settings.tsx` (UPDATED — LegalSettings added)
- `ios/Godsplan/PrivacyInfo.xcprivacy` (UPDATED — NSPrivacyCollectedDataTypes populated)
- `src/constants/i18n/locales/en.json` (UPDATED — legal keys)
- `src/constants/i18n/locales/hi.json` (UPDATED — legal keys)
- `src/constants/i18n/locales/gu.json` (UPDATED — legal keys)

## Senior Developer Review (AI)

**Date:** 2026-06-15  
**Outcome:** Changes Requested  

### Action Items

- [x] [High] Add `NSPrivacyCollectedDataTypeAudioData` to `PrivacyInfo.xcprivacy` — audio transmitted to Sarvam AI must be declared or App Store submission will be rejected
- [x] [Medium] Handle `Linking.openURL` rejection in `handleEmailPress` — show alert if no mail client
- [x] [Low] Handle `WebBrowser.openBrowserAsync` rejection in `handlePrivacyPress` — show alert on failure
- [ ] [Low] Consider declaring `NSPrivacyCollectedDataTypeOtherUserContent` for user memos/notes — Apple review may challenge omission (deferred: data stays on-device/user's own Drive; low confidence in Apple requiring it)
- [x] [Low] Remove `textTransform: 'lowercase'` from version row (or use a separate style) — unnecessary and silently mangles alphanumeric build tags

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Task 1: LegalSettings.tsx created. Grievance officer email opens mailto:, privacy policy opens in-app browser via WebBrowser.openBrowserAsync, version/build from Constants.expoConfig.
- Task 2: settings.tsx updated with LegalSettings import and render below ConsentSettings.
- Task 3: PrivacyInfo.xcprivacy updated with NSPrivacyCollectedDataTypes: name (linked/app), phoneNumber (linked/app), productInteraction (not linked/analytics), crashData (not linked/app). All 3 NSPrivacyAccessedAPITypes preserved. NSPrivacyTracking false.
- Task 4: legal i18n keys added to en.json, hi.json, gu.json.
- Task 5: tsc --noEmit passes cleanly.

### Change Log

- 2026-06-15: Implementation complete. All 5 tasks done, tsc clean. Status → review.
- 2026-06-15: Code review — Changes Requested. 1 High (AudioData missing from PrivacyInfo), 2 Medium/Low (error handling), 2 Low (OtherUserContent, textTransform). Status → in-progress.
- 2026-06-15: Applied all review patches. AudioData added to PrivacyInfo.xcprivacy; email/browser error handling with Alert; versionValue style drops textTransform; OtherUserContent deferred (on-device only data). tsc clean. Status → done.
