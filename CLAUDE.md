# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js version notice

This project uses a version of Next.js (16.2.10) that differs from your training data — APIs, conventions, and file structure may not match what you expect. Before writing routing, middleware, or server/client boundary code, check `node_modules/next/dist/docs/` for the current API. One concrete change already present in this repo: middleware lives in `src/proxy.ts` (exporting a `proxy` function), not `src/middleware.ts`.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint
```

There is no test suite configured in this repo.

**This repo's `supabase/migrations/` is not the live schema history — `sochill-app`'s is.** The CRM, the `sochill-app` member app, and the `sochill-website` marketing site all share one Supabase project. This repo's own migration folder stopped being the source of truth a long time ago (it stalls at `0031_...`, and CRM code already depends on tables/columns — `role_feature_access`, `billing_period_months`, promo-link fields on `products`, the Qashier checkout tables — that only exist in `sochill-app/supabase/migrations/`, now past `0096_...`). In practice: when CRM work needs a schema change, the actual migration file goes in `sochill-app`, not here (see e.g. its `0090_staff_memberships_never_expire.sql`, `0091_promo_checkout_links.sql`) — check there before assuming something is "missing." There is no migration CLI wired up in either repo — Nick applies them by hand against the shared Supabase project's SQL editor, so always get his explicit confirmation that a given migration (in whichever repo it lives) has actually been run before relying on it. The two folders also number independently from `0001`, so the same filename prefix means unrelated things in each repo — don't infer anything from matching numbers.

## Architecture

Sochill CRM is a Next.js App Router app (`src/app`) for a bath-club membership business, backed by Supabase (Postgres + Auth). Data access is done via `@supabase/ssr` clients rather than a REST/GraphQL API layer.

**Supabase client boundaries** (`src/lib/supabase/`):
- `client.ts` — browser client, for use in Client Components.
- `server.ts` — server client (reads cookies via `next/headers`), for use in Server Components and Server Actions.
- `middleware.ts` — `updateSession()`, called from `src/proxy.ts` on every request. Refreshes the auth session, redirects unauthenticated users to `/login`, and redirects logged-in users away from `/login` to their role's home page.

**Auth & roles**: `src/lib/profile.ts` reads the current user's role (`admin | owner | staff | marketing`) from the `profiles` table. Role gates behavior in two places: route-level redirects in the proxy/middleware, and UI/nav gating in `src/app/(app)/layout.tsx` (e.g. `marketing` role only sees the Marketing/Members/Pipeline nav; only `canManageDiscounts` roles see Discounts+Marketing). Server actions that mutate data (e.g. purchases, discounts) should independently check role via `getCurrentRole`/`canManagePurchases`/`canManageDiscounts` rather than trusting the client.

**Route groups**: `src/app/(app)/` holds all authenticated pages (dashboard, contacts, pipeline, import, discounts, follow-ups, marketing) sharing the sidebar layout in `layout.tsx`. `src/app/login/` is outside that group and unauthenticated.

**Domain model** (`src/lib/types.ts`, mirrored by the shared Postgres schema — see the migrations note above for where its actual history lives):
- `Contact` — a member/lead, with `pipeline_stage` (`lead → trial → active → at_risk → lapsed → churned`) and `source` (how they were acquired).
- `Product` — a sellable item (`trial | single_session | session_pack | membership`) with pricing and either `sessions_included` or `billing_period_months` (memberships) depending on type.
- `Purchase` — a contact's instance of a product, tracking `sessions_remaining`, `status`, discount applied, and payment. Membership purchases renew on a **calendar-month cycle** (e.g. sign up Jan 31 → renews Feb 28), matching how Stripe auto-billing actually bills — see `computeExpiry()` in `src/app/(app)/contacts/purchase-actions.ts` (uses `product.billing_period_months` via `addMonthsClamped` in `src/lib/dateMath.ts`) and `memberSegments.ts` before changing renewal or "active member" logic.
- `DiscountCode` — percentage/fixed/full-comp discounts, optionally granting bonus sessions; management gated to admin/owner (`src/app/(app)/discounts/`).
- `Visit` and `Interaction` — logged activity per contact (service usage, staff contact touchpoints).
- Data imported from the Arketa platform carries an `arketa_id` on `Contact`/`Purchase`/`Visit` for de-duplication.

**Business logic modules** (`src/lib/`): `purchases.ts` (purchase lifecycle/session math), `discounts.ts` (discount application), `memberSegments.ts` (deriving pipeline/member segments from purchase history), `followUps.ts` (follow-up task logic, paired with `src/app/(app)/follow-ups/`), `payments.ts`, `whatsapp.ts` (outbound messaging helpers), `import.ts` (CSV import parsing, used by `ImportWizard.tsx` and `src/app/(app)/import/`).

**CSV import**: `ImportWizard.tsx` + `src/lib/import.ts` (using `papaparse`) handle bulk-loading contacts/purchases/visits from Arketa CSV exports — this is the primary data-migration path rather than manual entry.

**Styling**: Tailwind CSS v4 (config via `postcss.config.mjs`, no separate `tailwind.config`), light theme (stone neutrals + teal accent, coral in the logo) hardcoded in components rather than via a theme system. Semantic status colors (pipeline stage / purchase status badges) are centralized in `STAGE_BADGE_CLASSES` / `PURCHASE_STATUS_BADGE_CLASSES` in `src/lib/constants.ts`.
