# Design: Capture FAB, safe-area handling, phone-contacts sync

Date: 2026-06-19
Status: Approved

Three independent fixes reported against the current build.

## 1. Capture FAB renders no icon and does nothing

**Root cause.** The bottom-right control on the capture screen is a
`react-native-paper` `FAB`, which renders its icon via MaterialCommunityIcons.
Neither `@expo/vector-icons` nor `react-native-vector-icons` is installed, so no
glyph appears. In the non-recorded (`plus`) state the `onPress` is a literal
no-op, so it also does nothing.

**Fix.** Replace the Paper `FAB` with a small custom square button built on
`expo-symbols` `SymbolView` — the same SF Symbols mechanism the tab bar already
uses successfully on iOS — with a text fallback for non-iOS. The button only
renders in the **proceed** state (`hasRecorded && !isRecording`), shows a
`checkmark`, and is wired to the existing "start processing" action
(`setIsProcessing(true)` + `tryDrainIfConnected()`). When nothing is recorded
the button is hidden, leaving the record button as the sole affordance.

## 2. Notch / safe-area not respected

**Root cause.** Screens render a bare `View` with `flex: 1` and no safe-area
insets, so top content slides under the notch / Dynamic Island.
`react-native-safe-area-context` is already a dependency and expo-router mounts a
`SafeAreaProvider` at the root.

**Fix.** Add one reusable `src/components/Screen.tsx` that applies
`useSafeAreaInsets`. It exposes an `edges` prop: tab screens use `['top']`
(bottom owned by the tab bar); full-screen stack / modal / onboarding screens use
`['top','bottom']`. Roll it out to the tab screens and the stack/onboarding
screens with top-aligned content. Centralizing prevents per-screen drift.

## 3. Phone contacts shown in the contacts tab

Behaviour confirmed with the user:

- **Display:** two sections — **your people** (existing app contacts, current
  activity ordering: pending follow-up / most recent memo) and **from phone**
  (device contacts, A–Z). The contacts tab switches from `FlatList` to
  `SectionList`. Search filters both sections.
- **Dedup:** a device contact whose normalized name or phone matches an app
  contact is dropped from the "from phone" section.
- **Persistence:** device contacts are read-only / live — re-read on focus plus a
  `Contacts.addContactsChangeListener`. They are NOT written to the app DB in
  this batch. (Tapping a phone contact to "start tracking" — a DB insert into the
  existing `contacts` table, which already has `phone`/`photo_uri` — is a
  deliberate follow-up, out of scope here.)
- **Ordering note:** the v56 Contacts API exposes no created/modified date and
  `ContactsSortOrder` is name-based only, so "most recent" for pure device
  contacts falls back to A–Z; app contacts keep their activity ordering.

### Permission flow

- Add a contacts-permission step to onboarding (`src/app/onboarding/`), alongside
  notifications/battery.
- If onboarding is skipped, the Contacts tab requests permission on first visit.
- Denied state shows a graceful "enable in Settings" CTA (Linking to settings).
- iOS 18 `accessPrivileges: 'limited'` is treated as granted.

### New code

- `src/services/contacts-sync.service.ts` — wraps `expo-contacts`: permission
  get/request, `Contact.getAllDetails([FULL_NAME, PHONES, IMAGE])` normalized to
  `{ id, name, phone, photoUri }[]`, name-sorted, unnamed entries filtered out.
- `app.config.ts` — add the `expo-contacts` config plugin with
  `NSContactsUsageDescription`.

## Out of scope

- Importing device contacts into the DB.
- Two-way contact editing / writing back to the device.
- Android favourites surfacing.
