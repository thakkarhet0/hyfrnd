# Contacts tab — bold blocks + yellow accent

**Date:** 2026-06-23
**Scope:** `src/app/(tabs)/contacts.tsx`, plus one token in `src/constants/theme.ts`

## Problem

The contacts tab reads as a stack of headings. Three interactive elements look
like inert titles — the `search contacts` field, the `see all follow-ups` link,
and the section labels. The two groups (`your people` / `from phone`) are
separated only by a faint text label with no visual division.

## Constraints

- Design system is intentionally flat and sharp-cornered (`Radius.none`, every
  screen uses `borderRadius: 0`). "Cards" = hard-edged bordered/filled blocks,
  not rounded.
- No icon library installed — signal affordances with color, fills, and a
  typographic arrow (`→`), not icons.
- Monospace, lowercase, SpaceMono typography throughout.

## Design

**Palette.** Add `highlight: '#FFD23F'` to both `light` and `dark` in
`theme.ts`. Yellow carries one meaning app-wide: **follow-up / attention**.
Because `#FFD23F` is low-contrast on the pale-cyan light background, it is only
ever used as a solid fill, as navy text on yellow, or as yellow text on a navy
chip — never as yellow text on the page background. This stays legible in both
themes.

**Search → boxed field.** Wrap the `TextInput` in a hard-edged bordered block
(1px `text+'20'` border, faint `text+'06'` fill). The box reads as an input,
not a heading.

**`see all follow-ups` → solid yellow CTA block.** Full-width filled `#FFD23F`
block with navy (`#0F1035`) bold text and a trailing `→`. Saturated yellow pops
against both the pale-cyan (light) and navy (dark) backgrounds; navy-on-yellow
is high contrast everywhere. Unmistakably tappable.

**Sections → bordered blocks.** Each section is its own hard-edged bordered box,
built so `SectionList` virtualization is preserved (header top+side borders,
rows side borders + thin `text+'10'` separators, footer bottom+side border). A
`Spacing.lg` gap separates the two blocks — the real fix for the partition.
Each header gets a leading yellow vertical accent bar plus a bold label
(label stays `theme.text` for legibility; the bar carries the color).

**Follow-up dates → navy chip.** A row's `next_follow_up` renders as a small
sharp navy chip with `#FFD23F` text, reinforcing yellow = follow-up. `last seen`
stays muted. The permission banner becomes a bordered block for consistency.

## Out of scope

No new dependencies, no native/Expo APIs, no changes to data or navigation —
only existing React Native primitives already imported in the file.
