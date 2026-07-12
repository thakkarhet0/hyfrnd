# Calendar tab — today + this-month follow-up views

**Date:** 2026-07-12
**Scope:** new `src/app/(tabs)/calendar.tsx`, `db/queries/follow-ups.ts`,
`FooterDOM.tsx`, `(tabs)/_layout.tsx`, `contacts.tsx` (retarget one button),
delete `src/app/followups.tsx`, i18n locale files.

## Problem

Follow-ups currently live in one flat, unfiltered list (`/followups`, reached
via a banner on the Contacts tab). There's no way to see "what's due today" at
a glance, or to browse a month ahead. Reference: `Desktop/calendar.webp` (a
generic mobile calendar app mockup) — its *structure* (a today/list toggle, a
month slider, day-grouped scrollable cards) is being adopted; its visual style
(pastel color blocks, hourly slots) is not — this app is permanently dark/flat/
monospace (`MetalColors`, `Typography`, `Radius.none`) with no light mode and
no per-time-of-day granularity on follow-ups (`due_date` is a date, not a
timestamp with meaningful time-of-day).

## Navigation changes

- New 4th tab **Calendar**, ordered `capture → calendar → contacts → settings`.
- `FooterDOM.tsx`: extend `FooterTabKey` with `'calendar'`; add a calendar-grid
  icon (rounded-rect body + header bar + grid dots) built the same way as the
  other three — a `.icon-glow` stroke layer + `.icon-fg` stroke layer, so it
  picks up the existing active/inactive sweep animation for free.
- `(tabs)/_layout.tsx`: add `calendar: '/calendar'` to `ROUTE_BY_TAB`, extend
  `activeTab` detection with `pathname.startsWith('/calendar')`, add
  `t('tabs.calendar')` to the `labels` prop.
- `contacts.tsx`: the existing "see all follow-ups" banner stays in place, but
  `onPress` changes from `router.push('/followups')` to
  `router.push('/(tabs)/calendar')` (lands on the today view, the tab's
  default).
- Delete `src/app/followups.tsx` outright — after the retarget above, nothing
  references it. The new calendar screen is a fresh build, not a wrapper
  around the old one.

## Screen structure (`calendar.tsx`)

- Top segmented toggle, two flat bordered buttons: **today** / **this month**.
  Visual language matches other bordered controls in the app: 1px border,
  `Typography.label`, active = filled `theme.highlight` + `INK` text, inactive
  = transparent + `theme.text`. Local state `view: 'today' | 'month'`, default
  `'today'`.
- Data loads through `useFocusEffect`, matching the existing pattern in
  `followups.tsx`/`contacts.tsx`, so returning to the tab refreshes it.
- A shared `FollowUpRow` component (contact name, due-date chip, context
  snapshot) is reused by every section in both sub-views — same visual as
  the current `followups.tsx` row (left accent bar + bordered box). Tapping
  navigates to `/contact/${contact_id}`. No swipe/inline-complete actions;
  completing a follow-up remains a contact-page action.

## Today view

- New query `getFollowUpsForToday()` returns
  `{ overdue: PendingFollowUp[]; today: PendingFollowUp[] }`, split by
  comparing `due_date` against local-midnight boundaries (start of today /
  start of tomorrow).
- Renders **overdue** first (if non-empty, section label styled with
  `theme.highlight` to flag it), then **today**. Both empty → existing
  `followUps.emptyTitle` / `emptyBody` copy.

## Month view

- New query `getFollowUpsForMonth(monthStart, monthEndExclusive)` returns a
  flat `PendingFollowUp[]` for the range; the screen groups it by calendar day
  client-side (dataset is small — no need to push grouping into SQL).
- Header: `‹  DEC 2026  ›`. Arrows call `setMonth` by ±1; the same header
  region also accepts a horizontal swipe via `PanResponder` (no new
  dependency — `react-native-gesture-handler`/`reanimated` are available if
  arrows alone feel unresponsive, but `PanResponder` is simpler and
  sufficient here). Both arrows and swipe are clamped so the user can't
  navigate earlier than the real-world current month.
- Below the header: a scrollable list of day groups, **only for days that
  have follow-ups** (empty days are skipped, matching the reference). Each
  group = a header (`tuesday 13 dec`, `Typography.label`) followed by that
  day's `FollowUpRow`s — same bordered-row treatment as today view, no color
  blocks, no hour slots.
- Empty month → new `followUps.emptyMonth` copy ("nothing scheduled this
  month").

## Data layer (`db/queries/follow-ups.ts`)

```ts
export interface FollowUpsForToday {
  overdue: PendingFollowUp[];
  today: PendingFollowUp[];
}
export async function getFollowUpsForToday(): Promise<{
  data: FollowUpsForToday | null;
  error: string | null;
}>;
export async function getFollowUpsForMonth(
  monthStart: number,
  monthEndExclusive: number,
): Promise<{ data: PendingFollowUp[] | null; error: string | null }>;
```

Both filter `status = 'pending'`, join `contacts` for `contact_name` — same
shape as the existing `getAllPendingFollowUps`.

## i18n (mirror across `en`, `hi`, `gu`)

- `tabs.calendar`
- `followUps.today`, `followUps.month`, `followUps.overdue`,
  `followUps.emptyMonth`
- Reuse existing `followUps.emptyTitle` / `emptyBody` for the today view's
  empty state; `followUps.viewAll` stays (still used by the Contacts banner).

## Testing / verification

No screen-level automated test suite exists in this project; verification is
manual, per existing convention. Plan:

- Seed follow-ups at a few dates (overdue, today, next month) and walk both
  views in the simulator.
- Confirm toggle switch, month arrows, month swipe (both directions, and that
  it clamps at the current month), row tap → correct contact, and both empty
  states render.
- Confirm the Contacts-tab banner still opens the Calendar tab.

## Out of scope

- No manual "add follow-up" affordance in the Calendar tab (follow-ups are
  only created via the capture flow) — no `+` button, unlike the reference.
- No per-time-of-day scheduling — `due_date` stays date-granularity.
- Not fixing the separate capture-screen delete/done button regression
  (tracked and handled independently, not part of this feature).
