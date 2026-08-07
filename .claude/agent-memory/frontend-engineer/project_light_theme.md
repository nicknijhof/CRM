---
name: project-light-theme
description: Sochill CRM was re-themed from dark slate/cyan to a light stone/teal palette (2026-08-07) — use this palette for all new UI, not the dark one CLAUDE.md still describes.
metadata:
  type: project
---

As of 2026-08-07, the whole app (`src/app/**`, `src/components/**`) was converted from the
original dark slate-950/cyan theme to a brighter stone/teal theme for staff daytime readability.
This was a pure Tailwind-class swap, no logic/markup changes.

Mapping used (apply to any new UI too):
- Page bg `bg-stone-50`; card/surface bg `bg-white`; table `<thead>`/pipeline-column bg `bg-stone-100`.
- Borders `border-stone-200` (was slate-800), `border-stone-300` (was slate-700, used on inputs).
- Text: headings/primary `text-stone-900`, body `text-stone-700`, muted `text-stone-500`, very muted/empty-state `text-stone-400`.
- Brand accent cyan → teal: `bg-teal-600` (hover `hover:bg-teal-700`) for primary buttons with `text-white` button label; `text-teal-600` (hover `hover:text-teal-700`) for links/accents; `focus:border-teal-500`.
- Status/semantic colors moved from dark-translucent (`*-500/20` + `*-300` text) to light-solid (`*-100` bg + `*-700` text), e.g. `bg-emerald-100 text-emerald-700`, `bg-amber-100 text-amber-800`, `bg-rose-100 text-rose-700`.
- Recharts components (`src/components/charts/*`) use hardcoded hex, not Tailwind classes — also converted: grid/axis stroke `#e7e5e4`/`#78716c`, tooltip bg `#ffffff` w/ `#e7e5e4` border, accent line/bar color `#0d9488` (teal-600 hex).

`STAGE_BADGE_CLASSES` / `PURCHASE_STATUS_BADGE_CLASSES` in `src/lib/constants.ts` already use the
new light palette — always reuse those exported constants for pipeline-stage/purchase-status badges
rather than hand-rolling colors.

**Why:** Requested as a dedicated re-theme task (not tied to a specific feature) — old dark theme was
hard to read for staff during the day.

**How to apply:** CLAUDE.md's "Styling" section still describes the old dark slate/cyan theme — it's
stale as of this change (out of frontend-engineer's scope to edit, but worth flagging to Nick if he
asks about it). Any new page/component should follow the stone/teal palette above, not slate/cyan.
See [[pause_relabel]] for unrelated pipeline-stage label semantics that also apply on these same pages.
