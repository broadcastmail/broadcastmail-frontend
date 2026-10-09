# Manual Recipient Audience — Plan

## Scope

Reference the approved design and structure:

- Design: `docs/agent-work/manual-recipent-audience/design/design.md`
- Structure: `docs/agent-work/manual-recipent-audience/structure/structure.md`

This plan covers the complete audience flow:

1. Shared types and API request contracts.
2. Draft audience persistence and restoration.
3. Account-scoped audience listing and server-side filtering.
4. Filter-change dialog and 5,000-recipient limit.
5. Worker resolution for manual-ID campaigns and confirmation gating.
6. SSE overlay wiring for final recipient count display.

## Plan-wide enforcement rules

- Every step must trace to the approved Design or Structure.
- Keep steps ordered by their dependencies.
- Prefer vertical slices over unrelated horizontal layer phases.
- Every step must include validation and an objective done condition.
- Do not reopen approved product, research, design, or structure decisions.
- Preserve existing behavior and contracts unless an approved change requires otherwise.
- Do not add unrelated refactors, speculative abstractions, or cleanup.
- Do not begin implementation until this Plan is approved.
- Include mock updates in the same step as the frontend behavior they support.

## Technical constraints

- Reuse existing architecture, clients, helpers, schemas, and UI primitives.
- Preserve type safety; avoid unnecessary type assertions and silent fallbacks.
- `use-campaign-autosave.ts` must not receive `includedIds`, `excludedIds`, or `audienceMode` — the audience PATCH is a separate explicit call, not part of debounced content autosave.
- `AudienceSelectionPayload` and `UpdateCampaignPayload` belong in `features/campaigns/api/campaigns.ts`; `AudienceMode` belongs in `lib/types/campaigns.ts`. No additional `lib → features` dependency is introduced.
- Do not read from `next/dist/` before writing Next.js code; consult the project guide per AGENTS.md if an API is uncertain.
- Run only existing targeted validation commands (`tsc --noEmit`, the dev server, browser smoke test).

## Implementation steps

### Step 1 — Shared types and API request contract

- **Scope:** Add `AudienceMode`, audience fields, `AudienceSelectionPayload`, and widened `UpdateCampaignPayload`. Add `filters`/`total` to the audience API client. Scaffold `audienceStore`; update MSW PATCH and GET handlers to persist and return audience fields. No hook or UI wiring yet.
- **Frontend files:**
  - `lib/types/campaigns.ts` — add `AudienceMode = "manual" | "filter" | "all"`; add `audienceMode`, `includedIds`, `excludedIds` to `Campaign`
  - `features/campaigns/api/campaigns.ts` — add `AudienceSelectionPayload`; widen `UpdateCampaignPayload`; fix `updateCampaign` return type to `Promise<Campaign>`
  - `features/campaigns/api/audience.ts` — add `filters?` param and `total` field to `listAudience`
  - `mocks/campaign-store.ts` — add `audienceStore` keyed by campaign ID
  - `mocks/handlers/campaigns.ts` — PATCH persists audience fields; GET and `withFilters` return them
- **API contract:** `PATCH /api/v1/campaigns/:id` request body adds optional `audienceMode`, `includedIds`, `excludedIds`; response `Campaign` DTO includes same fields. `GET /api/v1/campaigns/:id` response includes the three new fields (null for existing rows).
- **Backend service boundary:** `UpdateCampaignRequest` gains three optional fields (`audienceMode`, `includedIds`, `excludedIds`). `CampaignService.updateCampaign` persists them. `Campaign` response DTO includes the three fields. PATCH validates `includedIds.length ≤ 5,000`; returns 400 otherwise.
- **Database boundary:** V8 migration adds `audience_mode VARCHAR`, `included_ids JSONB`, `excluded_ids JSONB` columns to `campaigns` — all nullable, no default, existing rows remain null.
- **Dependencies:** None.
- **Validation:**
  - `tsc --noEmit` passes with no new errors.
  - Mock PATCH with `{ audienceMode: "manual", includedIds: ["id1"], excludedIds: [] }` returns 200 Campaign with those fields set.
  - Mock campaign GET for the same campaign returns `audienceMode: "manual"`, `includedIds: ["id1"]`, `excludedIds: []`.
  - Mock campaign GET for a pre-feature draft returns `audienceMode: null`, `includedIds: null`, `excludedIds: null`.
- **Done when:** TypeScript builds; `Campaign` carries the three nullable audience fields; MSW handlers persist and return them; no hook or UI change exists.

---

### Step 2 — Draft audience persistence and restoration

- **Scope:** Seed `useAudienceRecipients` from the campaign record's audience fields; expose `audienceDefinition`. Trigger the audience PATCH on Continue; block during save; surface errors; gate `canSend` on non-null `audienceMode`.
- **Frontend files:**
  - `features/campaigns/new/audience/hooks/use-audience-recipients.ts` — accept `initialAudienceMode`, `initialIncludedIds`, `initialExcludedIds`; seed state; expose `audienceDefinition`
  - `features/campaigns/new/new-campaign-form.tsx` — call audience PATCH on Continue; hold `audienceSaving` flag; surface `audienceSaveError`; gate `canSend` on `campaign.audienceMode !== null`
  - `features/campaigns/new/audience/ui/audience-step.tsx` — accept `isSaving`, `saveError`; disable Continue while saving; display error
- **API contract:** Uses the PATCH contract established in Step 1. No new endpoints.
- **Backend service boundary:** No additional work beyond Step 1.
- **Database boundary:** No additional migration.
- **Dependencies:** Step 1.
- **Validation:**
  - Open a draft with `audienceMode: null` → hook shows no selection; no error.
  - Open a draft with `audienceMode: "manual"`, `includedIds: ["id1"]` → hook initializes with that recipient checked.
  - Click Continue with selections → network tab shows PATCH with `audienceMode/includedIds/excludedIds` → campaign record updated in mock store.
  - Simulate PATCH failure (MSW override) → Continue remains visible; error message shown; retry succeeds.
  - `canSend` returns false when campaign `audienceMode` is null; returns true after a successful audience PATCH (campaign returned from PATCH has `audienceMode` set).
- **Done when:** Drafts restore selection on open; Continue triggers the PATCH; failures surface and are retryable; `canSend` is gated on non-null `audienceMode`.

---

### Step 3 — Account-scoped audience listing and server-side filtering

- **Scope:** Update `listAudience` to send `filters` query params. Update `useAudienceRecipients` to pass active filters to the API instead of filtering client-side; use `total` from the response for select-all count. Update the MSW audience handler to apply filter predicates server-side and return `total`.
- **Frontend files:**
  - `features/campaigns/api/audience.ts` — serialize `filters` as query params in `listAudience`
  - `features/campaigns/new/audience/hooks/use-audience-recipients.ts` — pass `filters` into `listAudience`; replace client-side predicate logic with server-returned `total`
  - `mocks/handlers/audience.ts` — parse `filters` from query params; apply predicates; return `total`
- **API contract:** `GET /api/v1/audience/list` query: `cursor?`, `limit?`, `filters?` (JSON-encoded `AudienceFilterPayload[]`). Response: `{ recipients, nextCursor, hasMore, total }` (already described in Structure).
- **Backend service boundary:** `AudienceController.listAudience` and `listFilters` — implement real services backed by external Supabase JDBC; cursor-paginated with predicate filtering and `total`; both replace current `return null` stubs.
- **Database boundary:** No migration — queries external Supabase via existing JDBC infrastructure.
- **Dependencies:** Step 1 (types), Step 2 (hook exists with initial state).
- **Validation:**
  - `listAudience({ filters: [{ columnName: "plan", operator: "eq", filterValue: "pro", source: "…" }] })` in mock → returns only recipients matching the predicate; `total` matches filtered count.
  - Pagination cursor advances through the filtered set correctly.
  - Selecting "all" while filters are active uses `total` (not hard-coded page count) as the select-all count.
  - Removing filters resets `total` to the unfiltered account total.
- **Done when:** `listAudience` sends predicates server-side; hook uses returned `total` for select-all; client-side predicate logic is removed.

---

### Step 4 — 5,000-recipient limit and filter-change dialog

- **Scope:** Enforce the 5,000-recipient cap; detect filter-change conflicts while manual IDs are set. Expose `limitExceeded`, `hasPendingFilterChange`, `resolvePendingFilterChange`. Wire the inline dialog in `AudienceStep`; trigger PATCH on resolution. Update the mock confirm handler to branch on `audienceMode`.
- **Frontend files:**
  - `features/campaigns/new/audience/hooks/use-audience-recipients.ts` — track `savedFilters` snapshot; detect filter divergence with manual IDs set; expose `limitExceeded`, `hasPendingFilterChange`, `resolvePendingFilterChange`; block toggles at limit
  - `features/campaigns/new/audience/ui/audience-step.tsx` — show "Reapply or Clear" dialog on `hasPendingFilterChange`; block Continue until resolved; show limit warning
  - `features/campaigns/new/new-campaign-form.tsx` — call audience PATCH after `resolvePendingFilterChange`
  - `mocks/handlers/campaigns.ts` — confirm handler branches on `audienceMode` for recipient count
- **API contract:** No new shape — 400 for `includedIds.length > 5,000` established in Step 1.
- **Backend service boundary:** No additional backend work in this step.
- **Database boundary:** No change.
- **Dependencies:** Step 2 (audience PATCH on Continue), Step 3 (server-side `total` for select-all count).
- **Validation:**
  - Select 5,001 recipients → limit warning shown; further individual toggles disabled; Continue blocked (or PATCH would be rejected with 400).
  - Select 5,000 → no warning; Continue allowed.
  - Edit a filter with `includedIds.length > 0` → "Reapply or Clear" dialog appears; Continue blocked.
  - Click "Reapply" → PATCH fires with existing `includedIds/excludedIds` and updated `audienceMode`; dialog dismissed; Continue available.
  - Click "Clear" → PATCH fires with `includedIds: [], excludedIds: []`; dialog dismissed.
  - Filter change with no manual IDs set → no dialog, no block.
- **Done when:** 5,000 cap enforced; filter-change dialog blocks Continue and triggers the correct PATCH per resolution; mock confirm handler branches on `audienceMode`.

---

### Step 5 — Worker resolution for manual-ID campaigns

- **Scope:** Backend-only new code path for manual/all audiences. Null `audienceMode` rejection at confirm time. Backward-compat `null`-with-filters treatment. No frontend changes; mock confirm handler was updated in Step 4.
- **Frontend files:** None.
- **API contract:** `POST /api/v1/campaigns/:id/confirm` — unchanged (202 Accepted). Confirm rejects with a descriptive error (e.g., 409 or 422) when `audienceMode` is null and no filters are present.
- **Backend service boundary:**
  - `CampaignConfirmService.confirmCampaign` — reject with an appropriate error if `audienceMode` is null and `campaign.filters` is empty; backward-compat: treat `audienceMode = null` with non-empty `filters` as `"filter"`.
  - `ResolutionService.resolve` — branch on `audienceMode`: `"filter"` uses existing external-DB query path; `"manual"` and `"all"` query external DB for `includedIds`, subtract `excludedIds`, feed the same `BatchPersistenceService.persistBatch` path and outbox. No change to `BatchPersistenceService` or `CampaignRecipientRepository`.
- **Database boundary:** No migration — `campaign_recipients` idempotency guarantee (`ON CONFLICT DO NOTHING`) is reused as-is.
- **Dependencies:** Step 2 (campaign record carries `audienceMode/includedIds/excludedIds` before confirmation).
- **Validation:**
  - Confirm a `manual` campaign in the mock → status transitions RESOLVING → SENDING; final `recipientCount` equals `includedIds.length` (mock behavior established in Step 4).
  - Confirm a `filter` campaign → existing resolution path runs; no regression in existing filter-campaign confirmation tests.
  - Confirm with `audienceMode = null` and no filters → rejected with error; campaign remains DRAFT.
  - Confirm with `audienceMode = null` with filters → treated as `"filter"`, proceeds normally (backward-compat).
- **Done when:** `ResolutionService` has a working `manual`/`all` branch; null-`audienceMode` without filters is rejected; existing filter path is unaffected.

---

### Step 6 — SSE overlay wiring for final recipient count

- **Scope:** Subscribe to the SSE stream after confirm; expose `resolving` step and `finalCount` from `use-send-campaign.ts`. Update overlay to render the resolving step and final count; delay redirect until a terminal SSE status.
- **Frontend files:**
  - `features/campaigns/new/compose/hooks/use-send-campaign.ts` — after 202, subscribe to SSE stream; expose `step` (adds `"resolving"`) and `finalCount`; delay redirect to terminal status
  - `features/campaigns/new/compose/ui/sending-overlay.tsx` — add `resolving` step; display `finalCount`; handle SSE timeout as non-error done
- **API contract:** `GET /api/v1/campaigns/:id/status/stream` — existing SSE endpoint, unchanged contract. Used read-only.
- **Backend service boundary:** No change.
- **Database boundary:** No change.
- **Dependencies:** Step 5 (stable confirmation semantics; campaign transitions to RESOLVING after confirm).
- **Validation:**
  - After confirm, overlay transitions to "Resolving recipients…" step.
  - When SSE emits a `SENDING` (or equivalent) event with `recipientsCount`, overlay shows that count and advances to next step.
  - On terminal SSE status, redirect to campaign detail page.
  - On SSE timeout (mock: advance time past 5-minute window), overlay transitions to done step without hanging.
  - Confirm a `filter` campaign → same overlay behavior (no regression).
- **Done when:** Overlay renders `resolving` after confirm; `finalCount` populates from SSE; redirect fires on terminal status; timeout does not hang.

---

## Risks and checkpoints

| Risk | Mitigation or checkpoint |
|---|---|
| `AudienceController` has no prior service; external Supabase JDBC is new territory | Isolate Step 3 backend; frontend mock fulfills the same contract so UI can proceed independently |
| `ResolutionService` branching on `audienceMode` touches the hot confirmation path | Backward-compat: `null + filters = "filter"`; `CampaignConfirmServiceTest` and `ResolutionServiceTest` must pass unchanged |
| V8 migration adds nullable columns to `campaigns` | Nullable with no default is backward-safe; verify with integration test before merging |
| SSE hard 5-minute timeout — overlay may advance before `recipientCount` is set | Treat timeout as non-error done; campaign detail shows final count via polling |
| `includedIds` with 5,000 UUIDs ≈ 180 KB — within 2 MB Spring default | No action needed |

**Checkpoint after Step 2:** Audience PATCH fires on Continue, restores on draft open, and errors are surfaced. Gate `canSend` confirmed before Step 3 begins.

**Checkpoint after Step 4:** Full frontend audience behavior (limit, filter-change dialog, PATCH triggers) is validated in the mock environment before any backend resolution work begins.

**Checkpoint after Step 5:** Backend resolution path for manual-ID campaigns is confirmed working in a test environment before SSE wiring is added on top.

## Plan readiness

- [ ] Every step traces to the approved Design or Structure.
- [ ] Dependencies are explicit and correctly ordered.
- [ ] Every step has targeted validation and an objective done condition.
- [ ] No unresolved product or architecture decisions remain.
- [ ] Ownership, compatibility, risks, and scope boundaries are clear.
- [ ] The Plan is approved before implementation begins.

## Addendum review

**Mock-update pairing rule** — A recurring cross-cutting concern: every step that changes frontend behavior requires MSW handler updates. Applied above as a plan-wide enforcement rule. Promoting to a reusable `_templates/` addendum requires separate approval and is out of this feature's scope.

## Plan improvement protocol

- Either party may propose an improvement by stating the issue and recommendation.
- Human approval is required for changes to scope, order, ownership, validation, or reusable planning rules; typo/formatting fixes do not require re-approval.
- Approved changes are recorded in the revision history.

## Out of scope

- True server-side select-all without filters (deferred past v1; the 5,000 cap makes an explicit-ID list feasible).
- Fixing the pre-existing unsubscribe filtering gap in `ExternalRecipientQueryService`.
- Rate limiting or request-size increases beyond the existing 2 MB Spring default.
- Scheduled or recurring campaigns.
- Changing confirmation response shape (202 Accepted, no body).
- Pre-feature drafts that already have `audienceMode = null` are not auto-migrated; they require the user to complete the audience step before sending.

## Plan approval

- Approved by: lakiidev
- Date: 2026-10-06
- Changes requested: None

## Plan revision history

| Version | Date | Change | Reason | Approval |
|---|---|---|---|---|
| 1.0 | 2026-10-06 | Initial Plan | First draft | Pending |
| 1.1 | 2026-10-06 | Compressed repeated planning and design explanations | Reduced Plan to execution-focused content | Pending |
| 1.2 | 2026-10-06 | Trimmed step scopes, file descriptions, done criteria, and risks table to 2 columns | Further reduced to execution-focused content per revision instructions | Accpeted |
