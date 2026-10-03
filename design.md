# Design — Nook admin

Direction: **Triage desk** (partwise frame, fresh, 2026-10-03) for the
dashboard and tables; **Workbench** (fresh, forms only, 2026-10-03) for form
pages. References in `docs/references/frame/` and
`docs/references/frame-forms/` (gitignored).

## Reader and job
The Nook team's superadmins (1–3 people), daily, on a laptop and sometimes a
phone. They open the portal to clear what's waiting on them (claims, reported
reviews, draft and unclaimed listings), then manage the catalog in tables.

## Character
Calm and orderly. A small team should feel the work is countable and
finishable, not watch a wall of numbers.

## Site map and flow
- Land on **Dashboard**: what's waiting, grouped by queue, each with "Review all".
- **Queues** (Claims, Review reports) and **Catalog** (Cafés, Tags,
  Achievements) and **People** (Users) are table pages, reached from the
  sidebar, ⌘K "Jump to", or a dashboard group.
- Detail pages (a café, a claim, a report) open from a row and link back via
  the breadcrumb ("Cafés / Details").
- Crawls are hidden (`lib/features.ts`); community-run for now.

## Page skeletons
- **Dashboard:** title + one-line greeting that says what's waiting →
  one bordered card "Waiting on you" with a group per queue (name, count,
  2–3 newest items, "Review all") → a quiet one-line health strip of real
  totals → secondary row (Recent activity, Quick actions).
- **Table page:** title + one-line summary + one primary button (if the page
  creates things) → status tabs with real counts → toolbar (search, filter
  menus, sort) → active-filter chips → one bordered card holding a ruled
  table → footer with "Showing x–y of n" and pagination. Selecting rows swaps
  the toolbar for a bulk bar.
- **Queue table:** same as a table page; rows carry their own decision actions
  where the decision is safe to make from the list.
- **Form page (Workbench):** header (back link, title, status chip) → two
  columns: a main editing column (max ~760px) of sections divided by space
  and a hairline, never cards; a 300px sticky right rail with Status, Flags,
  Metadata and a section index that marks sections with an error (red dot) or
  unsaved edits (dot). A save bar pinned to the bottom of the viewport is
  always visible: "All changes saved" / "N unsaved changes" / "Saving…", then
  Discard, Save (or Save draft) and, for drafts, Publish. On phones the rail
  becomes a status line under the title; the bar stays. Shared pieces in
  `components/admin/form-kit.tsx`.
- **Small forms** (add/edit tag, achievement): right-side drawer, fields
  stacked, sticky footer with Cancel and the primary action. Confirmations
  and reject-with-reason: a small dialog.
- **Short task form** (manual award): one centred column (max ~640px) of
  numbered steps, the action button at the end, no rail.
- **Auth** (sign in, set/reset password): a small centred form on the
  canvas, logo above, no shell.
- Validation: errors under the field, a red dot in the section index, and a
  count in the save bar ("2 things to fix") that jumps to the first one.
- Below 640px, table rows become two-line stacked items (name + status on
  line one, meta on line two); no sideways scrolling tables.

## Rhythm
Forms: medium-airy, 40px between sections, one hairline above each section
title, 16px between fields; the save bar is the loud moment.

Medium density: 44–52px rows divided by hairlines, no cards inside lists.
Sections separated by space (24px) and one card per list. One loud moment per
page: the "Waiting on you" card on the dashboard, the tab bar on tables.
No reveal animations.

## Emphasis
First look on the dashboard: the greeting sentence and the first queue group.
First look on a table: the tab bar and the first row. Green covers only the
primary button and the active nav item; status colour only in status chips.

## Color
Tokens in `app/globals.css` (shared with the business portal, pinned):
canvas `--background` white; sidebar, table header and hover rows `--sidebar` /
`--muted` (#F7F7F5-ish); text `--foreground` #3B3B3B, secondary
`--muted-foreground`; borders `--border`; accent `--primary` green #344E41.
Status: success emerald-700 on emerald-50 · warning #8A5A00 on #FFF4DC ·
danger red-700 on red-50 · neutral muted on muted. Light only (dark tokens
exist but aren't designed for).

## Type
Poppins 400/500/600 (`app/layout.tsx`); JetBrains Mono for ids and codes.
Scale: page title 24px semibold · section/group title 15px semibold · body
and rows 14px (row name 500) · secondary 12–13px muted · column labels 12px
muted 500, sentence case. Tabular figures for counts and dates.

## Shape and depth
Radius: 10px cards (`rounded-xl`), 8px buttons and inputs (`rounded-lg`),
full for badges and chips. 1px borders only; shadows only on popovers,
dialogs and drawers. Row hover is a muted fill, never an outline. Icons:
Phosphor, 16px in rows and buttons, regular weight (fill for active nav).

## Motion
Only what Radix and the shared components already do (menus, dialogs, sheets
at ~150–200ms ease-out). Nothing animates on scroll or load.

## Voice
Plain and short. Buttons name the action: "Review claims", "Approve claim",
"Add café", "Clear filters". Counts in words where they read better
("3 claims and 2 reports are waiting"). Empty states say what's normal:
"Nothing waiting." Avoid "Superadmin" jargon in body copy, exclamation marks,
and "Successfully …".

## Constraints
- Shell, colour, type and shape match the café-owner business portal; the two
  portals read as one product.
- Green means the primary action or the current page; nothing else.
- Status colours mean the same as in the business portal (live/approved green,
  draft/pending amber, inactive/rejected/danger red).
- Works at 390px wide.

## Exceptions
- Recent activity on the dashboard is placeholder data until a real activity
  log exists (constraint struck by the user, 2026-10-03). It carries a
  "Sample" label so nobody reads it as real.
