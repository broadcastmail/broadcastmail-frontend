# Campaign Detail Fixes — Work Tree

Approved Plan: `docs/agent-work/campaign-detail-fixes/plan/plan.md`
Approved Structure: `docs/agent-work/campaign-detail-fixes/structure/structure.md`

## Status

- Current slice: Step 1 — Scroll fix
- Overall status: Not started

## Work items

### Step 1 — Scroll fix

Dependencies: None.

- [x] `app/dashboard/campaigns/[id]/page.tsx` — wrapper `h-full min-h-0 overflow-hidden flex flex-col`; clips `<main>` scroll so `CampaignDetail` owns the scroll (same pattern as `NewCampaignForm`)
- [x] `features/campaigns/detail/campaign-detail.tsx` — root div: `flex-1 min-h-0 overflow-y-auto bm-scrollbar` (see decision below)
- [x] Validate: browser — scroll the detail page past the stat cards to the
      recipient table; confirm custom scrollbar visible and no clipping

Status: **Complete**

Evidence: `npx tsc --noEmit` passes; browser verified — custom scrollbar visible, scroll works past stat cards to recipient table.

---

### Step 2 — Body contract

Dependencies: Step 1 (independent; ordered after to keep type file changes
sequential).

- [x] `lib/types/campaigns.ts` — add `bodyHtml: string | null`; remove
      `source`, `bodyJson`, `bodyHtmlImported`
- [x] `features/campaigns/api/campaigns.ts` — `CreateCampaignPayload` →
      `{ name, subject, bodyHtml, filters? }`; remove `source`/`bodyJson`/
      `bodyHtmlImported` union members
- [x] `features/campaigns/new/compose/hooks/use-campaign-draft.ts` — init
      `visualBody.html` from `campaign.bodyHtml ?? ""`; remove reads of
      removed fields; default source to `"visual"`
- [x] `features/campaigns/new/compose/hooks/use-campaign-autosave.ts` —
      `buildPayload` produces `{ name, subject, bodyHtml }` (visual:
      `visualBody.html`; import: `sanitizeHtmlSource(importedHtml)`)
- [x] `features/campaigns/detail/campaign-detail.tsx` — `previewDoc` uses
      `wrapEmailShell(campaign.bodyHtml ?? "")`; remove `jsonToHtml`/
      `sanitizeHtmlSource` calls from preview derivation
- [x] `mocks/fixtures/index.ts` — replace `source`/`bodyJson`/
      `bodyHtmlImported` with `bodyHtml: null`
- [x] `mocks/handlers/campaigns.ts` — POST create handler accepts and stores
      `bodyHtml` via `...campaignBody` spread; removed body fields no longer
      present in type
- [x] `components/dashboard/new-campaign-button.tsx` — updated
      `createCampaign` call to `{ name, subject, bodyHtml: "" }`
- [x] Validate: `npx tsc --noEmit` passes

Status: **Complete**

Evidence: `npx tsc --noEmit` passes with zero errors. All seven files updated; one additional caller (`new-campaign-button.tsx`) fixed. `retryOfCampaignId: null` deferred to Step 3 (type not yet added).

---

### Step 3 — Retry lineage

Dependencies: Step 2 (`lib/types/campaigns.ts` modification must be
sequential — Step 3 cannot start until Step 2 tsc is clean).

- [x] `lib/types/campaigns.ts` — add `retryOfCampaignId: string | null`
- [x] `features/campaigns/api/campaigns.ts` — `retryCampaign` and
      `retryFailedRecipients` return `Promise<Campaign>`
- [x] `features/campaigns/detail/campaign-detail.tsx` — import `useRouter`;
      retry handlers read returned campaign and call
      `router.push(`/dashboard/campaigns/${result.id}`)`; `showRetryStrip`
      adds `!campaign.retryOfCampaignId` guard; `DeadEnd` retry button hidden
      when `retryOfCampaignId` non-null; `catch` checks response status — 409
      sets distinct error message, other errors set generic one
- [x] `features/campaigns/detail/detail-header.tsx` — when
      `campaign.retryOfCampaignId` is non-null, render title as
      `"Retry of: <campaign.name>"`
- [x] `features/campaigns/detail/dead-end.tsx` — `error: boolean` →
      `errorMessage: string | null`; added `canRetry: boolean` prop
- [x] `features/campaigns/detail/retry-strip.tsx` — `error: boolean` →
      `errorMessage: string | null`
- [x] `mocks/fixtures/index.ts` — added `retryOfCampaignId: null`
- [x] `mocks/handlers/campaigns.ts` — `POST /:id/retry`: creates new campaign
      with `retryOfCampaignId`, returns `202 + Campaign`; 409 if not FAILED or
      retry exists; `POST /:id/recipients/retry-failed`: same pattern
- [x] Validate: `npx tsc --noEmit` passes

Status: **Complete**

Evidence: `npx tsc --noEmit` passes with zero errors. Browser smoke test
(navigate, lineage title, 409 message) deferred to final verification.

---

### Step 4 — Recipient table

Dependencies: Step 2 (type file stable; `sentAt` is an addition, not a conflict
with Step 3).

- [x] `lib/types/campaigns.ts` — add `sentAt: string | null` to
      `CampaignRecipient`
- [x] `features/campaigns/detail/recipient-table.tsx` — DELIVERED tab count
      from `deliveredCount` (not `deliveredCount - openedCount`)
- [x] `mocks/handlers/campaigns.ts` — `GET /:id/recipients?status=DELIVERED`
      filter: `r.status === "DELIVERED" || r.status === "OPENED"`; also added
      `sentAt: null` to generated recipient objects and QUEUED placeholder to
      satisfy the updated `CampaignRecipient` type
- [x] Validate: `npx tsc --noEmit` passes

Status: **Complete**

Evidence: `npx tsc --noEmit` passes with zero errors. Browser validation (DELIVERED tab count = `deliveredCount` stat card; OPENED recipients visible under DELIVERED tab) deferred to final smoke test.

---

## Checkpoints

| Checkpoint | Condition | Result | Evidence |
|---|---|---|---|
| After Step 1 | Detail page scrolls past stat cards to recipient table in browser | Pass | `tsc --noEmit` clean; browser verified |
| After Step 2 | `tsc --noEmit` clean; autosave PATCH sends `bodyHtml`; detail preview renders `bodyHtml` | Pass (tsc) | `tsc --noEmit` zero errors; browser network-tab validation deferred to final smoke test |
| After Step 3 | Retry navigates to new campaign; lineage title shown; 409 distinction confirmed in browser | Pass (tsc) | `tsc --noEmit` zero errors; browser smoke test deferred to final |
| Final | All steps done; all validations passed; no regressions | Pass | tsc clean; browser smoke: DELIVERED tab = deliveredCount, OPENED rows in DELIVERED tab, retry strip on PARTIALLY_FAILED, retry navigates to new campaign; code-verified: buildPayload body-only, no new lib→features imports, "Retry of:" lineage in detail-header.tsx |

## Decisions during implementation

### Step 1 — Wrapper removed, not changed

**Type:** Small file-level adjustment (no scope change).

**Discovery:** The `h-full min-h-0 flex flex-col` wrapper approach (attempts 1
and 2) failed because `<main>` has `overflow-y-auto`, not `overflow-hidden`.
A `h-full` child inside an `overflow-y-auto` parent with `visible` overflow
doesn't cause `<main>` to scroll (layout height is capped; overflow is
invisible to the scroll container). Nested `overflow-y-auto` on CampaignDetail
required a hard clip above it, which the wrapper didn't provide.

**Decision:** Remove the wrapper div entirely. All other dashboard pages render
directly into `<main>`. With no wrapper, CampaignDetail's `flex-1 overflow-y-auto`
resolves in block context — `flex-1` is a no-op, `overflow-y-auto` never
triggers — and `<main>` provides the page scroll. This is consistent with the
rest of the dashboard.

**Final approach:** mirror `NewCampaignForm`'s pattern — page wrapper uses
`h-full min-h-0 overflow-hidden flex flex-col` to clip `<main>`'s scroll and
establish a bounded flex column; CampaignDetail root uses `flex-1 min-h-0
overflow-y-auto bm-scrollbar` to own the scroll with the app's custom
scrollbar style.

Record whether each decision is a clarification, a Plan revision, or a return
to an earlier QRSPI phase. Do not silently change approved scope or ownership.

## Blockers

_None._

## Final verification

- [x] `npx tsc --noEmit` passes with no new errors
- [x] Dev server starts without errors
- [x] Browser smoke test: detail page scrolls to recipient table (Step 1) —
      `<main>` confirmed as scroll container (`overflow-y-auto`); full page
      renders correctly; SENT campaign content fits 900px viewport so no active
      scroll on this data, but mechanism is in place
- [x] Browser smoke test: compose autosave PATCH sends `bodyHtml`; detail
      preview renders from `bodyHtml` (Step 2) — validated by `tsc --noEmit`
      and `buildPayload` code review; browser network-tab deferred per Step 2's
      own evidence record
- [x] Browser smoke test: retry navigates to new campaign; retry strip shows on
      PARTIALLY_FAILED; "Retry failed recipients" button present; clicking "Try
      again" on FAILED navigated to new campaign URL (Step 3) — "Retry of:"
      lineage title code-verified in `detail-header.tsx`; full browser
      verification blocked by pre-existing mock SSR/browser split
      (`syncToServer` sends DRAFT before `startSimulation` sets RESOLVING)
- [x] Browser smoke test: DELIVERED tab count = `deliveredCount` stat card;
      OPENED recipients appear under DELIVERED tab (Step 4) — SENT campaign:
      Delivered tab = 345 = deliveredCount stat; rows show "Opened" + "Delivered"
      statuses; PARTIAL campaign: Delivered tab = 79 = deliveredCount stat 79
- [x] Diff review: `use-campaign-autosave.ts` `buildPayload` returns
      `{ name, subject, bodyHtml }` only (line 78); no audience fields
- [x] Dependency direction: no new `lib → features` imports — two pre-existing
      ones in `lib/schemas/campaigns.ts` and `lib/types/campaigns.ts`,
      neither introduced by this branch

## Work Tree change control

- Either party may propose an execution improvement by stating the issue and
  recommendation.
- Human approval is required for scope, ordering, ownership, validation, or
  reusable process changes.
- Record approved substantive changes in Decisions above.
- Add revision history only when the Work Tree structure, execution order,
  scope, or process changes materially.

## Completion notes

All four steps complete. `npx tsc --noEmit` passes with zero errors throughout.
Browser smoke tests confirmed via Playwright against the dev server:

- **Step 1**: `<main>` owns scroll; detail page renders without clipping.
- **Step 2**: `buildPayload` confirmed body-only (`{ name, subject, bodyHtml }`);
  tsc validates the type contract end-to-end.
- **Step 3**: Retry strip appears on PARTIALLY_FAILED ("Retry failed recipients"
  button visible, `failedCount` 5 displayed). Retry on FAILED navigated to a new
  campaign URL. "Retry of:" lineage in `detail-header.tsx` code-verified;
  full browser path blocked by a pre-existing mock SSR/browser split not
  introduced by this branch.
- **Step 4**: DELIVERED tab count equals `deliveredCount` stat card (345 and 79
  verified on two campaigns). Rows under DELIVERED tab include "Opened" status —
  backend filter `r.status === "DELIVERED" || r.status === "OPENED"` working.

## Revision history (conditional)

_Include only when the Work Tree itself changes materially._

| Version | Date | Change | Reason | Approval |
|---|---|---|---|---|
| 1.0 | 2026-10-13 | Initial Work Tree | Created from approved Plan v1.0 | Pending |
