# Campaign Detail Fixes — Plan

## Scope

- Design: `docs/agent-work/campaign-detail-fixes/design/design.md`
- Structure: `docs/agent-work/campaign-detail-fixes/structure/structure.md`

Four vertical slices:

1. Scroll fix — unclip the detail page height chain.
2. Body contract — `Campaign` type, payload, autosave, draft init, and preview
   aligned to `bodyHtml`; backend drops `connectionId`, derives it server-side,
   adds sanitizer.
3. Retry lineage — `retryOfCampaignId` on `Campaign`, retry functions return the
   new campaign, navigate to it, update title and retry-button visibility,
   distinguish 409; backend response and retry-of-retry guard.
4. Recipient table — DELIVERED tab count fix, `sentAt` on `CampaignRecipient`,
   mock DELIVERED filter, backend `GET /{id}/recipients` endpoint.

## Plan-wide enforcement rules

- Every step traces to the approved Design or Structure.
- Steps ordered by their dependencies.
- Every step has validation and an objective done condition.
- Do not reopen approved decisions.
- Preserve existing contracts unless an approved change requires otherwise.
- No unrelated refactors or speculative cleanup.
- Mock updates are included in the same step as the frontend behavior they support.
- Do not begin implementation before the Plan is approved.

## Technical constraints

- Reuse existing API clients, schemas, hooks, and UI primitives.
- Preserve type safety; no unnecessary type assertions or silent fallbacks.
- Do not use `useEffect` for data fetches triggered by user actions (repo rule).
- `buildPayload` in `use-campaign-autosave.ts` owns body fields only; it must not grow to carry audience or other concerns.
- Mock handler changes in `mocks/handlers/campaigns.ts` and `mocks/fixtures/index.ts` take effect only after a dev-server restart (`instrumentation.ts` runs once at startup).
- Run only existing targeted validation commands: `npx tsc --noEmit`, dev server, browser smoke test.
- Backend steps are in `../broadcastmail-api`; file paths for that repo are not invented.

## Implementation steps

### Step 1 — Scroll fix

- **Scope:** The page wrapper adds `overflow-hidden` without establishing a flex context, so `CampaignDetail`'s `flex-1 overflow-y-auto` has no effect and content is clipped. Change the wrapper to a flex column.
- **Files:** `app/dashboard/campaigns/[id]/page.tsx`
- **Change:** wrapper class from `h-full min-h-0 overflow-hidden` → `h-full min-h-0 flex flex-col`
- **Depends on:** None
- **Validation:** browser — scroll the detail page past the stat cards to the recipient table; confirm no clipping
- **Done when:** detail page scrolls to the recipient table in the browser

---

### Step 2 — Body contract

- **Scope:** Align the frontend `Campaign` type, create/update payloads, autosave builder, draft initializer, and detail preview to `bodyHtml`. Remove `source`, `bodyJson`, and `bodyHtmlImported` everywhere. Update mock fixtures and POST handler. Backend removes `connectionId` from the create request, derives it from the account's connection, and adds a Jsoup sanitizer on create and update.
- **Files:**
  - `lib/types/campaigns.ts` — add `bodyHtml: string | null`; remove `source`, `bodyJson`, `bodyHtmlImported`
  - `features/campaigns/api/campaigns.ts` — `CreateCampaignPayload` → `{ name, subject, bodyHtml, filters? }`; remove `source`/`bodyJson`/`bodyHtmlImported` union
  - `features/campaigns/new/compose/hooks/use-campaign-draft.ts` — init `visualBody.html` from `campaign.bodyHtml ?? ""`; remove reads of removed fields; default source to `"visual"`
  - `features/campaigns/new/compose/hooks/use-campaign-autosave.ts` — `buildPayload` produces `{ name, subject, bodyHtml }` (visual path: `visualBody.html`; import path: `sanitizeHtmlSource(importedHtml)`)
  - `features/campaigns/detail/campaign-detail.tsx` — `previewDoc` uses `wrapEmailShell(campaign.bodyHtml ?? "")`; remove `jsonToHtml`/`sanitizeHtmlSource` calls from preview derivation
  - `mocks/fixtures/index.ts` — replace `source`/`bodyJson`/`bodyHtmlImported` with `bodyHtml: ""`; add `retryOfCampaignId: null` placeholder
  - `mocks/handlers/campaigns.ts` — POST create handler accepts and stores `bodyHtml`; no longer spreads removed body fields
- **Backend service boundary:** `CreateCampaignRequest` removes `connectionId` and its `@NotNull`; `CampaignService.createCampaign` calls `connectionRepository.findByAccountId(accountId)` and throws `ConnectionNotFoundException` if none exists; both `createCampaign` and `updateCampaign` run Jsoup sanitizer on `bodyHtml` before persisting
- **Depends on:** Step 1 (independent; ordered after to keep type file changes sequential)
- **Validation:** `npx tsc --noEmit` passes; in the compose step, inspect the network tab — autosave PATCH body contains `bodyHtml` and no `source`/`bodyJson`; open the detail page — preview renders the stored HTML body
- **Done when:** tsc clean; `Campaign` type has no `source`/`bodyJson`/`bodyHtmlImported`; compose autosave sends `bodyHtml`; detail preview renders from `campaign.bodyHtml`

---

### Step 3 — Retry lineage

- **Scope:** Add `retryOfCampaignId` to `Campaign`. Change retry API functions to return the new campaign. After a retry, navigate to the returned campaign. Show `"Retry of: <name>"` in the header and hide the retry button when `retryOfCampaignId` is non-null. Distinguish 409 with a specific error message. Update mock retry handlers to create a new campaign with `retryOfCampaignId` and return 409 on duplicate or wrong-state retry.
- **Files:**
  - `lib/types/campaigns.ts` — add `retryOfCampaignId: string | null`
  - `features/campaigns/api/campaigns.ts` — `retryCampaign` and `retryFailedRecipients` return `Promise<Campaign>`
  - `features/campaigns/detail/campaign-detail.tsx` — import `useRouter`; retry handlers read returned campaign and call `router.push(`/dashboard/campaigns/${result.id}`)`; `showRetryStrip` adds `!campaign.retryOfCampaignId` guard; `DeadEnd` retry button hidden when `retryOfCampaignId` non-null; `catch` checks response status — 409 sets a distinct error message, other errors set the generic one
  - `features/campaigns/detail/detail-header.tsx` — when `campaign.retryOfCampaignId` is non-null, render title as `"Retry of: <campaign.name>"`
  - `mocks/handlers/campaigns.ts` — `POST /:id/retry`: create a new campaign with `retryOfCampaignId = id`, store it, return `202 + CampaignResponse`; return 409 if campaign status is not `FAILED`, or if a retry already exists for this id; `POST /:id/recipients/retry-failed`: create a new campaign with `retryOfCampaignId = id`, return `202 + CampaignResponse`; return 409 on duplicate or wrong-state
- **Backend service boundary:** `CampaignResponse` adds `retryOfCampaignId: UUID | null`; `CampaignConfirmService.createRetryCampaign` adds guard before `hasRetryCampaign` check — if `original.getRetryOfCampaignId() != null` throw `CampaignNotRetryableException` (→ 409)
- **Depends on:** Step 2 (`lib/types/campaigns.ts` modification must be sequential)
- **Validation:** `npx tsc --noEmit` passes; retry a `PARTIALLY_FAILED` campaign in the browser — page navigates to the new retry campaign with `"Retry of: X"` title and no retry button; clicking retry on the original a second time shows the distinct 409 error message
- **Done when:** tsc clean; retry navigates to new campaign; retry campaign shows lineage title; second retry shows 409-specific message; retry button absent on retry campaigns

---

### Step 4 — Recipient table

- **Scope:** Fix the DELIVERED tab count to match `deliveredCount` (not `deliveredCount - openedCount`). Add `sentAt` to `CampaignRecipient`. Update the mock DELIVERED filter to include OPENED recipients. Backend adds the missing `GET /{id}/recipients` endpoint with DELIVERED-includes-OPENED semantics and a 404 guard.
- **Files:**
  - `lib/types/campaigns.ts` — add `sentAt: string | null` to `CampaignRecipient`
  - `features/campaigns/detail/recipient-table.tsx` — change `counts.DELIVERED` from `deliveredCount - openedCount` to `deliveredCount`
  - `mocks/handlers/campaigns.ts` — `GET /:id/recipients?status=DELIVERED` filter: `r.status === "DELIVERED" || r.status === "OPENED"` instead of exact match
- **Backend service boundary:** new `GET /api/v1/campaigns/{id}/recipients?status=&page=&size=` in `CampaignController`; new `getCampaignRecipients` method in `CampaignService`; `RecipientResponse` DTO: `{ id, email, status, sentAt, deliveredAt, openedAt }`; `status=DELIVERED` queries `WHERE status IN ('DELIVERED', 'OPENED')`; returns 404 if campaign not found or not owned by caller
- **Depends on:** Step 2 (type file is stable; `sentAt` addition to `CampaignRecipient` is a separate field)
- **Validation:** `npx tsc --noEmit` passes; in the browser, DELIVERED tab count matches the `deliveredCount` stat card value; DELIVERED tab rows include recipients with OPENED status
- **Done when:** tsc clean; DELIVERED tab count = `deliveredCount`; OPENED recipients appear under the DELIVERED tab

---

## Risks and checkpoints

| Risk | Mitigation or checkpoint |
|---|---|
| `lib/types/campaigns.ts` is touched by Steps 2 and 3 | Strict sequential order: Step 3 cannot start until Step 2's tsc is clean |
| Draft reopen after Step 2 defaults to `"visual"` mode — import-mode drafts lose tab selection on refresh | Accepted per design; `bodyHtml` is populated so the editor has content |
| Backend `connectionId` derivation — account with no connection returns 404 on create | Acceptable; same failure mode as before; mock does not surface this |
| Mock handler changes require dev-server restart | Documented in technical constraints; note restart before verifying mock behavior |
| Retry API return type change (`void` → `Campaign`) — if backend hasn't shipped, mock must cover the new shape | Mock updated in Step 3 alongside frontend; backend can follow independently |
| Browser scroll verification (Step 1) must be done in a real browser session | Required before marking Step 1 done; static analysis is not sufficient |

**Checkpoint after Step 2:** `tsc --noEmit` is clean and compose autosave sends `bodyHtml`. Gate on this before Step 3 begins.

**Checkpoint after Step 3:** Retry navigation and 409 distinction work in the browser against the mock. Gate on this before Step 4 begins (keeps type file changes sequential).

## Plan readiness

- [ ] Every step traces to the approved Design or Structure.
- [ ] Dependencies are explicit and correctly ordered.
- [ ] Every step has targeted validation and an objective done condition.
- [ ] No unresolved product or architecture decisions remain.
- [ ] Ownership, compatibility, risks, and scope boundaries are clear.
- [ ] The Plan is approved before implementation begins.

## Plan improvement protocol

- Either party may propose an improvement by stating the issue and recommendation.
- Human approval is required for changes to scope, order, ownership, validation, or reusable planning rules; typo and formatting fixes do not require re-approval.
- Approved changes are recorded in the revision history.

## Out of scope

- Storing `source` or `bodyJson` on the backend (rich-text round-tripping deferred).
- A forward pointer (`retryCampaignId`) from the original campaign to its retry.
- Retrying bounced recipients (backend excludes them by design).
- SSE stream reconnect-on-drop behavior.
- Database schema changes (all required columns already exist).
- Deployment and operations.

## Plan approval

- Approved by: lakiidev 
- Date: 2026-10-13
- Changes requested: —

## Plan revision history

| Version | Date | Change | Reason | Approval |
|---|---|---|---|---|
| 1.0 | 2026-10-13 | Initial Plan | First draft | Pending |
