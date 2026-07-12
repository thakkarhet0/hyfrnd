# Calendar Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 4th "Calendar" tab with two views — today's (+ overdue) follow-ups, and a swipeable month slider over a day-grouped scrollable list of this month's follow-ups — replacing the standalone `/followups` screen.

**Architecture:** A new tab screen (`src/app/(tabs)/calendar.tsx`) holds a local `view: 'today' | 'month'` toggle and renders one of two sub-views, both built from two new query functions in the existing `db/queries/follow-ups.ts` data layer. The existing bottom tab bar (`FooterDOM.tsx` + `(tabs)/_layout.tsx`) gains a 4th entry. The Contacts tab's existing "see all follow-ups" banner is retargeted to the new tab instead of the screen it replaces.

**Tech Stack:** React Native (Expo Router file-based tabs), Zustand (unrelated to this feature), Drizzle ORM over SQLite (`op-sqlite`), `react-i18next`, `react-native` core `PanResponder` for the month-swipe gesture (no new dependency).

## Global Constraints

- No light mode — the app is permanently dark ("metal") themed. Use `useTheme()` / `theme.text` / `theme.highlight` / `INK` from `@/constants/theme`, never introduce new colors.
- Typography is monospace + lowercase everywhere: use `Typography.*` / `FONT_BOLD` / `FONT_REGULAR` from `@/constants/theme`; RN's `textTransform: 'lowercase'` is applied per-style, matching existing screens.
- `Radius.none` — flat, hard-edged, `borderRadius: 0` (or omitted) on every box; no rounded cards.
- No icon library — icons are hand-drawn inline SVG primitives (see `FooterDOM.tsx`’s `IconShape`).
- This project has **no automated test runner** (no jest/vitest configured, no `*.test.ts` files exist). Every task's verification step is `npx tsc --noEmit` (type safety) plus a manual run-through in the simulator/device — this matches how every other screen in this codebase has been verified.
- Follow-ups are date-granularity only (`due_date` is a UTC-ms integer with no meaningful time-of-day) — do not add time pickers or hour slots.
- `i18n` keys must be added to all three locales: `src/constants/i18n/locales/en.json`, `hi.json`, `gu.json`. There is no typed-resource augmentation for `t()`, so missing keys are a silent runtime miss (render the literal key) — the manual run-through step is what catches this, not the compiler.

---

### Task 1: i18n keys for the calendar tab

**Files:**
- Modify: `src/constants/i18n/locales/en.json`
- Modify: `src/constants/i18n/locales/hi.json`
- Modify: `src/constants/i18n/locales/gu.json`

**Interfaces:**
- Produces: `tabs.calendar`, `followUps.today`, `followUps.month`, `followUps.overdue`, `followUps.emptyMonth` — consumed by Tasks 3, 4, 5.

- [ ] **Step 1: Add `tabs.calendar` and the new `followUps.*` keys to `en.json`**

In `src/constants/i18n/locales/en.json`, change line 1 from:
```json
  "tabs": { "capture": "Capture", "contacts": "Contacts", "settings": "Settings" },
```
to:
```json
  "tabs": { "capture": "Capture", "calendar": "Calendar", "contacts": "Contacts", "settings": "Settings" },
```

Then find the existing `"followUps"` block:
```json
  "followUps": {
    "title": "follow-ups",
    "emptyTitle": "you're all caught up",
    "emptyBody": "no pending follow-ups. keep recording moments with people you care about.",
    "viewAll": "see all follow-ups"
  },
```
and replace it with:
```json
  "followUps": {
    "title": "follow-ups",
    "emptyTitle": "you're all caught up",
    "emptyBody": "no pending follow-ups. keep recording moments with people you care about.",
    "viewAll": "see all follow-ups",
    "today": "today",
    "month": "this month",
    "overdue": "overdue",
    "emptyMonth": "nothing scheduled this month"
  },
```

- [ ] **Step 2: Mirror the same change in `hi.json`**

In `src/constants/i18n/locales/hi.json`, change:
```json
  "tabs": { "capture": "रिकॉर्ड", "contacts": "संपर्क", "settings": "सेटिंग्स" },
```
to:
```json
  "tabs": { "capture": "रिकॉर्ड", "calendar": "कैलेंडर", "contacts": "संपर्क", "settings": "सेटिंग्स" },
```

Find the `"followUps"` block:
```json
  "followUps": {
    "title": "फ़ॉलो-अप",
    "emptyTitle": "सब कुछ हो गया",
    "emptyBody": "कोई बाकी फ़ॉलो-अप नहीं है। जिन लोगों की परवाह है, उनके बारे में रिकॉर्ड करते रहें।",
    "viewAll": "सभी फ़ॉलो-अप देखें"
  },
```
replace with:
```json
  "followUps": {
    "title": "फ़ॉलो-अप",
    "emptyTitle": "सब कुछ हो गया",
    "emptyBody": "कोई बाकी फ़ॉलो-अप नहीं है। जिन लोगों की परवाह है, उनके बारे में रिकॉर्ड करते रहें।",
    "viewAll": "सभी फ़ॉलो-अप देखें",
    "today": "आज",
    "month": "इस महीने",
    "overdue": "बाकी रह गया",
    "emptyMonth": "इस महीने कुछ भी तय नहीं है"
  },
```

- [ ] **Step 3: Mirror the same change in `gu.json`**

In `src/constants/i18n/locales/gu.json`, change:
```json
  "tabs": { "capture": "રેકોર્ડ", "contacts": "સંપર્ક", "settings": "સેટિંગ્સ" },
```
to:
```json
  "tabs": { "capture": "રેકોર્ડ", "calendar": "કેલેન્ડર", "contacts": "સંપર્ક", "settings": "સેટિંગ્સ" },
```

Find the `"followUps"` block:
```json
  "followUps": {
    "title": "ફૉલો-અપ",
    "emptyTitle": "બધું થઈ ગયું",
    "emptyBody": "કોઈ બાકી ફૉલો-અપ નથી. જે લોકો ગમે છે તેમના વિશે રેકોર્ડ કરતા રહો.",
    "viewAll": "બધા ફૉલો-અપ જુઓ"
  },
```
replace with:
```json
  "followUps": {
    "title": "ફૉલો-અપ",
    "emptyTitle": "બધું થઈ ગયું",
    "emptyBody": "કોઈ બાકી ફૉલો-અપ નથી. જે લોકો ગમે છે તેમના વિશે રેકોર્ડ કરતા રહો.",
    "viewAll": "બધા ફૉલો-અપ જુઓ",
    "today": "આજે",
    "month": "આ મહિને",
    "overdue": "બાકી",
    "emptyMonth": "આ મહિને કંઈ નક્કી નથી"
  },
```

- [ ] **Step 4: Verify all three files are valid JSON**

Run: `node -e "['en','hi','gu'].forEach(l => JSON.parse(require('fs').readFileSync('src/constants/i18n/locales/'+l+'.json','utf8')))" && echo OK`
Expected: `OK` (throws with a parse error and file name otherwise)

- [ ] **Step 5: Commit**

```bash
git add src/constants/i18n/locales/en.json src/constants/i18n/locales/hi.json src/constants/i18n/locales/gu.json
git commit -m "i18n: add calendar tab strings (en/hi/gu)"
```

---

### Task 2: Data layer — today and month follow-up queries

**Files:**
- Modify: `src/db/queries/follow-ups.ts`

**Interfaces:**
- Consumes: existing `follow_ups` / `contacts` Drizzle tables from `@/db/schema`, existing `getDb()` from `@/db/index`, existing `PendingFollowUp` interface (already defined in this file).
- Produces:
  - `export interface FollowUpsForToday { overdue: PendingFollowUp[]; today: PendingFollowUp[]; }`
  - `export async function getFollowUpsForToday(): Promise<{ data: FollowUpsForToday | null; error: string | null }>`
  - `export async function getFollowUpsForMonth(monthStart: number, monthEndExclusive: number): Promise<{ data: PendingFollowUp[] | null; error: string | null }>`
  - Consumed by Task 4 (today view) and Task 5 (month view).

- [ ] **Step 1: Extend the drizzle-orm import with the extra operators these queries need**

In `src/db/queries/follow-ups.ts`, change line 1 from:
```ts
import { asc, eq } from 'drizzle-orm';
```
to:
```ts
import { and, asc, eq, gte, lt } from 'drizzle-orm';
```

- [ ] **Step 2: Add `getFollowUpsForToday` after the existing `getAllPendingFollowUps` function**

Append this directly after the closing brace of `getAllPendingFollowUps` (after line 82, before `export async function insertFollowUp`):

```ts
export interface FollowUpsForToday {
  overdue: PendingFollowUp[];
  today: PendingFollowUp[];
}

function startOfLocalDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function getFollowUpsForToday(): Promise<{
  data: FollowUpsForToday | null;
  error: string | null;
}> {
  try {
    const db = getDb();
    const startOfToday = startOfLocalDay(new Date());
    const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;
    const rows = await db
      .select({
        id: follow_ups.id,
        contact_id: follow_ups.contact_id,
        contact_name: contacts.name,
        memo_id: follow_ups.memo_id,
        due_date: follow_ups.due_date,
        status: follow_ups.status,
        context_snapshot: follow_ups.context_snapshot,
      })
      .from(follow_ups)
      .innerJoin(contacts, eq(follow_ups.contact_id, contacts.id))
      .where(and(eq(follow_ups.status, 'pending'), lt(follow_ups.due_date, startOfTomorrow)))
      .orderBy(asc(follow_ups.due_date));
    const overdue = rows.filter((r) => r.due_date < startOfToday);
    const today = rows.filter((r) => r.due_date >= startOfToday);
    return { data: { overdue, today }, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

export async function getFollowUpsForMonth(
  monthStart: number,
  monthEndExclusive: number,
): Promise<{ data: PendingFollowUp[] | null; error: string | null }> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: follow_ups.id,
        contact_id: follow_ups.contact_id,
        contact_name: contacts.name,
        memo_id: follow_ups.memo_id,
        due_date: follow_ups.due_date,
        status: follow_ups.status,
        context_snapshot: follow_ups.context_snapshot,
      })
      .from(follow_ups)
      .innerJoin(contacts, eq(follow_ups.contact_id, contacts.id))
      .where(
        and(
          eq(follow_ups.status, 'pending'),
          gte(follow_ups.due_date, monthStart),
          lt(follow_ups.due_date, monthEndExclusive),
        ),
      )
      .orderBy(asc(follow_ups.due_date));
    return { data: rows, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors referencing `src/db/queries/follow-ups.ts`

- [ ] **Step 4: Commit**

```bash
git add src/db/queries/follow-ups.ts
git commit -m "feat: add getFollowUpsForToday and getFollowUpsForMonth queries"
```

---

### Task 3: Tab bar wiring + calendar screen shell

**Files:**
- Modify: `src/components/navigation/FooterDOM.tsx`
- Modify: `src/app/(tabs)/_layout.tsx`
- Create: `src/app/(tabs)/calendar.tsx`

**Interfaces:**
- Consumes: `t('tabs.calendar')`, `t('followUps.today')`, `t('followUps.month')` (Task 1); `useTheme()`, `Screen`, `Typography`, `INK`, `Spacing` from existing theme/component modules.
- Produces: a navigable `/calendar` tab with a working `view` toggle (no data yet — that's Tasks 4/5). Task 4 and 5 both edit this same file to add real content in place of the placeholder body.

- [ ] **Step 1: Add the `calendar` icon variant and reorder `FooterTabKey`/`TABS` in `FooterDOM.tsx`**

Change line 16 from:
```ts
export type FooterTabKey = 'capture' | 'contacts' | 'settings';
```
to:
```ts
export type FooterTabKey = 'capture' | 'calendar' | 'contacts' | 'settings';
```

Change line 26 from:
```ts
const TABS: FooterTabKey[] = ['capture', 'contacts', 'settings'];
```
to:
```ts
const TABS: FooterTabKey[] = ['capture', 'calendar', 'contacts', 'settings'];
```

In the `IconShape` function, insert a new `if` branch for `'calendar'` right after the closing `}` of the `'capture'` branch (i.e. between the `capture` block and the `if (variant === 'contacts')` block):

```tsx
  if (variant === 'calendar') {
    return (
      <>
        <rect x={14} y={16} width={36} height={34} rx={4} />
        <line x1={14} y1={26} x2={50} y2={26} />
        <line x1={24} y1={10} x2={24} y2={20} />
        <line x1={40} y1={10} x2={40} y2={20} />
        <circle cx={24} cy={36} r={2.5} />
        <circle cx={32} cy={36} r={2.5} />
        <circle cx={40} cy={36} r={2.5} />
      </>
    );
  }
```

- [ ] **Step 2: Wire the route + active-tab detection + label in `(tabs)/_layout.tsx`**

Change:
```ts
const ROUTE_BY_TAB = {
  capture: '/capture',
  contacts: '/contacts',
  settings: '/settings',
} as const;
```
to:
```ts
const ROUTE_BY_TAB = {
  capture: '/capture',
  calendar: '/calendar',
  contacts: '/contacts',
  settings: '/settings',
} as const;
```

Change:
```ts
  const activeTab: FooterTabKey = pathname.startsWith('/contacts')
    ? 'contacts'
    : pathname.startsWith('/settings')
      ? 'settings'
      : 'capture';
```
to:
```ts
  const activeTab: FooterTabKey = pathname.startsWith('/calendar')
    ? 'calendar'
    : pathname.startsWith('/contacts')
      ? 'contacts'
      : pathname.startsWith('/settings')
        ? 'settings'
        : 'capture';
```

Change:
```tsx
          <Tabs.Screen name="capture" options={{ title: t('tabs.capture') }} />
          <Tabs.Screen name="contacts" options={{ title: t('tabs.contacts') }} />
          <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
```
to:
```tsx
          <Tabs.Screen name="capture" options={{ title: t('tabs.capture') }} />
          <Tabs.Screen name="calendar" options={{ title: t('tabs.calendar') }} />
          <Tabs.Screen name="contacts" options={{ title: t('tabs.contacts') }} />
          <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
```

Change:
```tsx
          labels={{
            capture: t('tabs.capture'),
            contacts: t('tabs.contacts'),
            settings: t('tabs.settings'),
          }}
```
to:
```tsx
          labels={{
            capture: t('tabs.capture'),
            calendar: t('tabs.calendar'),
            contacts: t('tabs.contacts'),
            settings: t('tabs.settings'),
          }}
```

- [ ] **Step 3: Create the calendar screen shell**

Create `src/app/(tabs)/calendar.tsx`:

```tsx
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Typography, Spacing, INK } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';

type ViewMode = 'today' | 'month';

export default function CalendarScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [view, setView] = useState<ViewMode>('today');

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.toggleRow}>
        <Pressable
          style={[
            styles.toggleButton,
            { borderColor: theme.text + '40' },
            view === 'today' && { backgroundColor: theme.highlight, borderColor: theme.highlight },
          ]}
          onPress={() => setView('today')}
          accessibilityRole="button"
        >
          <Text style={[styles.toggleLabel, { color: view === 'today' ? INK : theme.text }]}>
            {t('followUps.today')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleButton,
            { borderColor: theme.text + '40' },
            view === 'month' && { backgroundColor: theme.highlight, borderColor: theme.highlight },
          ]}
          onPress={() => setView('month')}
          accessibilityRole="button"
        >
          <Text style={[styles.toggleLabel, { color: view === 'month' ? INK : theme.text }]}>
            {t('followUps.month')}
          </Text>
        </Pressable>
      </View>

      {/* Task 4 replaces this with the real today view */}
      {view === 'today' && <View style={styles.placeholder} />}
      {/* Task 5 replaces this with the real month view */}
      {view === 'month' && <View style={styles.placeholder} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  toggleLabel: {
    ...Typography.label,
  },
  placeholder: {
    flex: 1,
  },
});
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Manual verification**

Run: `npx expo start`, open the app (dev client — this project uses native modules like `expo-audio`/`op-sqlite` that Expo Go can't load, so use the existing dev-client build workflow already set up for this project).
Expected: bottom tab bar now shows 4 icons in order capture → calendar → contacts → settings. Tapping "calendar" navigates to a screen with a "today" / "this month" toggle; tapping each pill switches the active/inactive fill styling. No crash, no red-screen.

- [ ] **Step 6: Commit**

```bash
git add src/components/navigation/FooterDOM.tsx "src/app/(tabs)/_layout.tsx" "src/app/(tabs)/calendar.tsx"
git commit -m "feat: add calendar tab shell with today/month toggle"
```

---

### Task 4: Today view (overdue + today follow-ups)

**Files:**
- Modify: `src/app/(tabs)/calendar.tsx`

**Interfaces:**
- Consumes: `getFollowUpsForToday()`, `FollowUpsForToday`, `PendingFollowUp` from `@/db/queries/follow-ups` (Task 2); `t('followUps.overdue')`, `t('followUps.emptyTitle')`, `t('followUps.emptyBody')` (existing + Task 1).
- Produces: a `FollowUpRow` component and `formatDayChip` helper that Task 5 (month view) also reuses in the same file.

- [ ] **Step 1: Replace the whole file with the today-view-wired version**

Replace `src/app/(tabs)/calendar.tsx` in full with:

```tsx
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Typography, FONT_BOLD, FONT_REGULAR, Spacing, INK, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import {
  getFollowUpsForToday,
  type FollowUpsForToday,
  type PendingFollowUp,
} from '@/db/queries/follow-ups';

type ViewMode = 'today' | 'month';

function formatDayChip(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function FollowUpRow({ item, theme }: { item: PendingFollowUp; theme: ThemeColors }) {
  return (
    <Pressable
      style={[styles.row, { borderColor: theme.text + '20', backgroundColor: theme.text + '06' }]}
      onPress={() => router.push(`/contact/${item.contact_id}`)}
      accessibilityRole="button"
    >
      <View style={[styles.accentBar, { backgroundColor: theme.highlight }]} />
      <View style={styles.rowContent}>
        <Text style={[styles.name, { color: theme.text }]}>{item.contact_name}</Text>
        <View style={[styles.dateChip, { backgroundColor: INK }]}>
          <Text style={[styles.dateChipText, { color: theme.highlight }]}>
            {formatDayChip(item.due_date)}
          </Text>
        </View>
        {item.context_snapshot ? (
          <Text style={[styles.snapshot, { color: theme.text + '80' }]} numberOfLines={2}>
            {item.context_snapshot}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

type TodayEntry =
  | { type: 'header'; key: string; label: string; isOverdue: boolean }
  | { type: 'row'; key: string; item: PendingFollowUp };

function buildTodayEntries(data: FollowUpsForToday, overdueLabel: string, todayLabel: string): TodayEntry[] {
  const entries: TodayEntry[] = [];
  if (data.overdue.length > 0) {
    entries.push({ type: 'header', key: 'overdue-header', label: overdueLabel, isOverdue: true });
    for (const item of data.overdue) entries.push({ type: 'row', key: item.id, item });
  }
  if (data.today.length > 0) {
    entries.push({ type: 'header', key: 'today-header', label: todayLabel, isOverdue: false });
    for (const item of data.today) entries.push({ type: 'row', key: item.id, item });
  }
  return entries;
}

export default function CalendarScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [view, setView] = useState<ViewMode>('today');
  const [todayData, setTodayData] = useState<FollowUpsForToday>({ overdue: [], today: [] });

  const loadToday = useCallback(async () => {
    const { data } = await getFollowUpsForToday();
    setTodayData(data ?? { overdue: [], today: [] });
  }, []);

  useFocusEffect(useCallback(() => { void loadToday(); }, [loadToday]));

  const todayEntries = buildTodayEntries(todayData, t('followUps.overdue'), t('followUps.today'));
  const hasTodayData = todayEntries.length > 0;

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.toggleRow}>
        <Pressable
          style={[
            styles.toggleButton,
            { borderColor: theme.text + '40' },
            view === 'today' && { backgroundColor: theme.highlight, borderColor: theme.highlight },
          ]}
          onPress={() => setView('today')}
          accessibilityRole="button"
        >
          <Text style={[styles.toggleLabel, { color: view === 'today' ? INK : theme.text }]}>
            {t('followUps.today')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleButton,
            { borderColor: theme.text + '40' },
            view === 'month' && { backgroundColor: theme.highlight, borderColor: theme.highlight },
          ]}
          onPress={() => setView('month')}
          accessibilityRole="button"
        >
          <Text style={[styles.toggleLabel, { color: view === 'month' ? INK : theme.text }]}>
            {t('followUps.month')}
          </Text>
        </Pressable>
      </View>

      {view === 'today' ? (
        hasTodayData ? (
          <FlatList
            data={todayEntries}
            keyExtractor={(entry) => entry.key}
            contentContainerStyle={styles.list}
            renderItem={({ item: entry }) =>
              entry.type === 'header' ? (
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: entry.isOverdue ? theme.highlight : theme.text },
                  ]}
                >
                  {entry.label}
                </Text>
              ) : (
                <FollowUpRow item={entry.item} theme={theme} />
              )
            }
          />
        ) : (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('followUps.emptyTitle')}</Text>
            <Text style={[styles.emptyBody, { color: theme.text + '80' }]}>{t('followUps.emptyBody')}</Text>
          </View>
        )
      ) : (
        <View style={styles.placeholder} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  toggleLabel: { ...Typography.label },
  placeholder: { flex: 1 },
  list: { paddingBottom: Spacing.xl },
  sectionLabel: {
    ...Typography.label,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: { ...Typography.heading, textAlign: 'center' },
  emptyBody: { ...Typography.body, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  accentBar: { width: 4, alignSelf: 'stretch' },
  rowContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: 6,
  },
  name: { fontFamily: FONT_BOLD, fontSize: 18, textTransform: 'lowercase' },
  dateChip: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  dateChipText: { fontFamily: FONT_BOLD, fontSize: 13, textTransform: 'lowercase' },
  snapshot: { fontFamily: FONT_REGULAR, fontSize: 16, textTransform: 'lowercase' },
});
```

Note: `ThemeColors` must be exported as a type from `@/constants/theme` — it already is (`export type ThemeColors = typeof Colors.light;`), so no theme.ts change is needed here.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Manual verification**

In the running app (from Task 3's dev client session, or a fresh `npx expo start`): use the Capture tab to record a couple of test memos and confirm follow-up dates for today and for a date in the past (you can create a past-due one by editing a contact's follow-up via the reschedule flow on the contact page, or by directly setting the picker — whatever's fastest for seeding). Open the Calendar tab, confirm:
- Overdue section appears above Today section, only when non-empty, with the overdue label tinted with the highlight color.
- Tapping a row navigates to that contact's page.
- With no pending follow-ups, the empty state (`emptyTitle`/`emptyBody`) shows instead of an empty list.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(tabs)/calendar.tsx"
git commit -m "feat: wire today view (overdue + today follow-ups) into calendar tab"
```

---

### Task 5: Month view (slider + day-grouped list)

**Files:**
- Modify: `src/app/(tabs)/calendar.tsx`

**Interfaces:**
- Consumes: `getFollowUpsForMonth(monthStart, monthEndExclusive)` from `@/db/queries/follow-ups` (Task 2); `FollowUpRow`, `formatDayChip`, `PendingFollowUp` (Task 4, same file); `t('followUps.emptyMonth')` (Task 1).
- Produces: the completed calendar screen — no further tasks build on this file.

- [ ] **Step 1: Add month-view state, helpers, and rendering**

In `src/app/(tabs)/calendar.tsx`:

Change the import block from:
```tsx
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Typography, FONT_BOLD, FONT_REGULAR, Spacing, INK, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import {
  getFollowUpsForToday,
  type FollowUpsForToday,
  type PendingFollowUp,
} from '@/db/queries/follow-ups';
```
to:
```tsx
import { useCallback, useMemo, useState } from 'react';
import { FlatList, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Typography, FONT_BOLD, FONT_REGULAR, Spacing, INK, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Screen } from '@/components/Screen';
import {
  getFollowUpsForToday,
  getFollowUpsForMonth,
  type FollowUpsForToday,
  type PendingFollowUp,
} from '@/db/queries/follow-ups';
```

Add these helpers right after the existing `formatDayChip` function:
```tsx
function formatDayHeader(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function formatMonthHeader(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function startOfMonth(year: number, month: number): number {
  return new Date(year, month, 1, 0, 0, 0, 0).getTime();
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

interface DayGroup {
  key: string;
  due_date: number;
  items: PendingFollowUp[];
}

function groupByDay(items: PendingFollowUp[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const item of items) {
    const key = dayKey(item.due_date);
    const existing = map.get(key);
    if (existing) existing.items.push(item);
    else map.set(key, { key, due_date: item.due_date, items: [item] });
  }
  return Array.from(map.values());
}
```

Inside `CalendarScreen`, replace:
```tsx
  const [view, setView] = useState<ViewMode>('today');
  const [todayData, setTodayData] = useState<FollowUpsForToday>({ overdue: [], today: [] });

  const loadToday = useCallback(async () => {
    const { data } = await getFollowUpsForToday();
    setTodayData(data ?? { overdue: [], today: [] });
  }, []);

  useFocusEffect(useCallback(() => { void loadToday(); }, [loadToday]));
```
with:
```tsx
  const [view, setView] = useState<ViewMode>('today');
  const [todayData, setTodayData] = useState<FollowUpsForToday>({ overdue: [], today: [] });

  const now = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [monthItems, setMonthItems] = useState<PendingFollowUp[]>([]);

  const loadToday = useCallback(async () => {
    const { data } = await getFollowUpsForToday();
    setTodayData(data ?? { overdue: [], today: [] });
  }, []);

  const loadMonth = useCallback(async (year: number, month: number) => {
    const monthStart = startOfMonth(year, month);
    const monthEndExclusive = startOfMonth(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
    const { data } = await getFollowUpsForMonth(monthStart, monthEndExclusive);
    setMonthItems(data ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadToday();
      void loadMonth(monthCursor.year, monthCursor.month);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadToday, loadMonth, monthCursor.year, monthCursor.month]),
  );

  const isCurrentMonth = monthCursor.year === now.getFullYear() && monthCursor.month === now.getMonth();

  const goToMonth = useCallback(
    (direction: 1 | -1) => {
      setMonthCursor((prev) => {
        if (direction === -1 && prev.year === now.getFullYear() && prev.month === now.getMonth()) {
          return prev;
        }
        let { year, month } = prev;
        month += direction;
        if (month < 0) {
          month = 11;
          year -= 1;
        } else if (month > 11) {
          month = 0;
          year += 1;
        }
        return { year, month };
      });
    },
    [now],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dx < -40) goToMonth(1);
          else if (gesture.dx > 40) goToMonth(-1);
        },
      }),
    [goToMonth],
  );

  const dayGroups = useMemo(() => groupByDay(monthItems), [monthItems]);
```

Replace the final `{ view === 'today' ? ( ... ) : ( <View style={styles.placeholder} /> ) }` block with:
```tsx
      {view === 'today' ? (
        hasTodayData ? (
          <FlatList
            data={todayEntries}
            keyExtractor={(entry) => entry.key}
            contentContainerStyle={styles.list}
            renderItem={({ item: entry }) =>
              entry.type === 'header' ? (
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: entry.isOverdue ? theme.highlight : theme.text },
                  ]}
                >
                  {entry.label}
                </Text>
              ) : (
                <FollowUpRow item={entry.item} theme={theme} />
              )
            }
          />
        ) : (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('followUps.emptyTitle')}</Text>
            <Text style={[styles.emptyBody, { color: theme.text + '80' }]}>{t('followUps.emptyBody')}</Text>
          </View>
        )
      ) : (
        <>
          <View style={styles.monthHeader} {...panResponder.panHandlers}>
            <Pressable
              onPress={() => goToMonth(-1)}
              disabled={isCurrentMonth}
              accessibilityRole="button"
              accessibilityLabel="previous month"
              hitSlop={12}
            >
              <Text style={[styles.monthArrow, { color: isCurrentMonth ? theme.text + '30' : theme.text }]}>
                ‹
              </Text>
            </Pressable>
            <Text style={[styles.monthLabel, { color: theme.text }]}>
              {formatMonthHeader(monthCursor.year, monthCursor.month)}
            </Text>
            <Pressable
              onPress={() => goToMonth(1)}
              accessibilityRole="button"
              accessibilityLabel="next month"
              hitSlop={12}
            >
              <Text style={[styles.monthArrow, { color: theme.text }]}>›</Text>
            </Pressable>
          </View>

          {dayGroups.length > 0 ? (
            <FlatList
              data={dayGroups}
              keyExtractor={(group) => group.key}
              contentContainerStyle={styles.list}
              renderItem={({ item: group }) => (
                <View>
                  <Text style={[styles.sectionLabel, { color: theme.text }]}>
                    {formatDayHeader(group.due_date)}
                  </Text>
                  {group.items.map((item) => (
                    <FollowUpRow key={item.id} item={item} theme={theme} />
                  ))}
                </View>
              )}
            />
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.emptyBody, { color: theme.text + '80' }]}>
                {t('followUps.emptyMonth')}
              </Text>
            </View>
          )}
        </>
      )}
```

Add these two style entries to the `StyleSheet.create` call (anywhere in the object, e.g. right after `placeholder`):
```ts
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  monthArrow: { fontFamily: FONT_BOLD, fontSize: 24, paddingHorizontal: Spacing.md },
  monthLabel: { ...Typography.subheading },
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Manual verification**

With the same seeded data from Task 4 (plus, if possible, one follow-up dated next month — reschedule an existing one further out via the contact page), in the running app:
- Switch to "this month" — confirm the current month's day groups render, each header showing weekday + date, rows below matching the today-view row style.
- Tap `›` — confirms it advances to next month and loads that month's data (or the empty-month state if nothing's scheduled).
- Tap `‹` back to the current month, confirm the left arrow is disabled/dimmed and does nothing once back at the current month (can't go earlier).
- Swipe left/right over the month header area — confirms it also changes month, same clamping at the current month.
- Confirm the Calendar tab defaults to the "today" view on a fresh mount (revisit from another tab and back).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(tabs)/calendar.tsx"
git commit -m "feat: wire month view (slider + day-grouped list) into calendar tab"
```

---

### Task 6: Retarget Contacts banner and remove the old follow-ups screen

**Files:**
- Modify: `src/app/(tabs)/contacts.tsx`
- Delete: `src/app/followups.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks — this is the last task in the plan.

- [ ] **Step 1: Retarget the "see all follow-ups" banner**

In `src/app/(tabs)/contacts.tsx`, change:
```tsx
          onPress={() => router.push('/followups')}
```
to:
```tsx
          onPress={() => router.push('/(tabs)/calendar')}
```

- [ ] **Step 2: Delete the now-unreferenced old screen**

Run: `git rm src/app/followups.tsx`

- [ ] **Step 3: Confirm nothing else references the deleted route**

Run: `grep -rn "followups'" src/ || echo "no references"`
Expected: `no references` (the only prior reference, in `contacts.tsx`, was just changed in Step 1)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Manual verification**

In the running app: open Contacts tab, tap "see all follow-ups" — confirms it lands on the Calendar tab (today view) instead of a separate screen.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(tabs)/contacts.tsx"
git commit -m "refactor: retarget follow-ups banner to calendar tab, remove old /followups screen"
```

---

## Self-Review Notes

- **Spec coverage:** Navigation (Task 3, 6), screen structure/toggle (Task 3), today view incl. overdue split (Task 4), month view incl. slider clamp + day grouping + skip-empty-days (Task 5), data layer (Task 2), i18n (Task 1), old-screen removal (Task 6) — every spec section maps to a task.
- **Type consistency:** `PendingFollowUp`, `FollowUpsForToday`, `ThemeColors` are defined once (Task 2 / existing `theme.ts`) and referenced with the same names/shapes in every later task.
- **Placeholder scan:** every step has literal code or an exact command + expected output; no "TBD"/"handle edge cases" language.
- **Not in this plan:** the separate capture-screen delete/done button regression — tracked and handled outside this plan, per the design doc's "out of scope" note.
