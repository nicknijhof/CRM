---
name: project-pause-relabel
description: 'lead' pipeline_stage was repurposed to mean "Paused membership" (2026-08-06 change) — not a fresh lead anymore
metadata:
  type: project
---

As of 2026-08-06, the `lead` value in `PipelineStage` (`src/lib/types.ts`) was repurposed: it no
longer means "brand-new lead." `pauseMembership()` (`src/app/(app)/contacts/purchase-actions.ts`)
sets a contact's `pipeline_stage` to `'lead'` when their membership is paused, and its UI label in
`PIPELINE_STAGES` (`src/lib/constants.ts`) is now "Paused" (was "Lead"). `resumeMembership()` sets
it back to `'active'`. The `contacts.pipeline_stage` column's DB default also changed from `'lead'`
to `'trial'` around the same time, and the manual "Add member" form
(`src/app/(app)/contacts/new/page.tsx`) removed `'lead'` from its stage dropdown entirely (default
now `'trial'`) since staff should never manually set a brand-new contact to "Paused."

Also relabeled in the same change: `lapsed` → "Expired", `churned` → "Cancelled" (enum values
themselves unchanged, only display labels in `PIPELINE_STAGES`).

**Why:** the business wanted a dedicated status for members who paused their membership (with
reason/resume-date tracking added: `purchases.is_paused/pause_reason/pause_started_at/pause_resume_date`),
and reused the otherwise-unused `lead` enum value rather than adding a new DB enum member.

**How to apply:** don't assume `pipeline_stage === 'lead'` means "never contacted yet" anywhere in
new code (dashboard funnels, follow-up logic, reporting) — check whether it should instead be read
as "paused." If asked to add stage-based logic, keep using `PIPELINE_STAGES` labels for display
rather than hardcoding stage names, so relabels don't require hunting through JSX again.
