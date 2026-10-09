# Manual Recipient Audience — Work Tree

Approved Plan: `docs/agent-work/manual-recipent-audience/plan/plan.md`
Approved Structure: `docs/agent-work/manual-recipent-audience/structure/structure.md`

## Status

- Current slice: Step 6 — complete
- Overall status: All steps complete; final verification in progress

## Work items

### Step 1 — Shared types and API request contract

Dependencies: None.

- [x] `lib/types/campaigns.ts` — add `AudienceMode = "manual" | "filter" | "all"`; add `audienceMode`, `includedIds`, `excludedIds` to `Campaign`
- [x] `features/campaigns/api/campaigns.ts` — add `AudienceSelectionPayload`; widen `UpdateCampaignPayload`; fix `updateCampaign` return type to `Promise<Campaign>`
- [x] `features/campaigns/api/audience.ts` — add `filters?` param and `total` to `listAudience` / `AudienceListResponse`
- [x] `mocks/campaign-store.ts` — add `audienceStore` keyed by campaign ID
- [x] `mocks/handlers/campaigns.ts` — PATCH persists audience fields to `audienceStore`; `withFilters` merges `audienceStore` into GET response
- [x] Validate: `tsc --noEmit` passes with no new errors; no hook or UI change exists

Status: **Complete**
Evidence: `tsc --noEmit` exits cleanly (no output). All five files modified within scope. Audience fields default to null in `fakeCampaign`; PATCH handler extracts and persists them to `audienceStore`; `withFilters` merges `audienceStore` onto every single-campaign GET response.

---

### Step 2 — Draft audience persistence and restoration

Dependencies: Step 1.

- [x] `features/campaigns/new/audience/hooks/use-audience-recipients.ts` — accept `initialAudienceMode`, `initialIncludedIds`, `initialExcludedIds`; seed state from them; expose `audienceDefinition`
- [x] `features/campaigns/new/new-campaign-form.tsx` — call audience PATCH on Continue; hold `audienceSaving` flag; surface `audienceSaveError`; gate `canSend` on `confirmedAudienceMode !== null`
- [x] `features/campaigns/new/audience/ui/audience-step.tsx` — accept `isSaving`, `saveError`; disable Continue while saving; display error
- [x] Validate: `tsc --noEmit` passes with no new errors

Status: **Complete**
Evidence: `tsc --noEmit` exits cleanly. Three files modified within scope. Hook seeds `selectionMode`/`includedIds`/`excludedIds` from initial campaign audience fields; exposes `audienceDefinition` derived from current selection state. `NewCampaignForm` calls `updateCampaign` on Continue with the definition; advances to compose only on success; surfaces error inline; `canSend` gated on `lastConfirmedAudience.audienceMode !== null` (initialized from `campaign.audienceMode`). `AudienceStep` disables Continue while saving and shows PATCH error above the footer. Post-Step-4 fixes: `lastConfirmedAudience` replaces `confirmedAudienceMode` to carry all three audience fields and seed `AudienceStep` on re-mount; `step` initializes to `"compose"` when `campaign.audienceMode !== null`; `audience-filters.tsx` event-driven value loading for column changes and restored filters; sync route and `syncToServer` now bridge `audienceStore` to the server-side store on audience PATCHes; `CampaignRouter` fetches `initialAudience` with saved filter payloads.

---

### Step 3 — Account-scoped audience listing and server-side filtering

Dependencies: Step 1 (types), Step 2 (hook seeded).

- [x] `features/campaigns/api/audience.ts` — serialize `filters` as JSON-encoded query param in `listAudience`
- [x] `features/campaigns/new/audience/hooks/use-audience-recipients.ts` — pass active `filters` into `listAudience`; use server-returned `total` for select-all; remove client-side predicate logic; re-fetch on filter change via `useEffect`
- [x] `mocks/handlers/audience.ts` — parse `filters` from query params; apply predicates to in-memory store; return `total`
- [x] Backend service boundary: `AudienceController.listAudience` and `listFilters` — implement real Supabase JDBC services; cursor-paginated with predicate filtering and `total`; replace `return null` stubs
- [x] Validate: `tsc --noEmit` passes with no new errors

Status: **Complete** (frontend scope)
Evidence: `tsc --noEmit` exits cleanly. Four files modified. `listAudience` serializes non-empty `filters` as JSON query param. Hook converts `AudienceFilter[]` to `AudienceFilterPayload[]` internally via `filterPayloads` memo; passes to `listAudience`; stores `total` from each response; `selectedCount` for "all" mode uses `total`; client-side predicate logic removed. `useEffect` skips mount, then re-fetches from page 0 whenever `filterPayloads` identity changes. MSW handler JSON-parses `filters`, applies operator predicates, returns `total: filtered.length`. Backend service boundary noted as pending (no frontend change required).

---

### Step 4 — 5,000-recipient limit and filter-change dialog

Dependencies: Step 2 (audience PATCH on Continue), Step 3 (server-side `total`).

- [x] `features/campaigns/new/audience/hooks/use-audience-recipients.ts` — track `savedFilters` snapshot at last Continue; detect divergence while `includedIds`/`excludedIds` non-empty; expose `limitExceeded`, `hasPendingFilterChange`, `resolvePendingFilterChange`; block toggles when `limitExceeded`
- [x] `features/campaigns/new/audience/ui/audience-step.tsx` — show "Keep / Clear" dialog on `hasPendingFilterChange`; block Continue until resolved; show 5,000-limit warning banner; disable individual toggles in manual mode at limit
- [x] `features/campaigns/new/new-campaign-form.tsx` — call audience PATCH after `resolvePendingFilterChange` via `handleRecipientCountUpdate` for both "reapply" and "clear" (no step advance)
- [x] `mocks/handlers/campaigns.ts` — confirm handler: `"manual"` → `includedIds.length`; `"all"` → `TOTAL_RECIPIENTS - excludedIds.length`; `"filter"` / null → `estimatePreviewCount`
- [x] Validate: `tsc --noEmit` passes with no new errors

Status: **Complete**
Evidence: `tsc --noEmit` exits cleanly (no output). Four files modified within scope. Hook extracts `toFilterPayloads` as a shared helper; adds `savedFilterPayloads` state (init from initial filters); `limitExceeded` = manual mode AND `includedIds.size >= 5000`; `hasPendingFilterChange` = has IDs AND `JSON.stringify(filterPayloads) !== JSON.stringify(savedFilterPayloads)`; `resolvePendingFilterChange("reapply"|"clear")` updates `savedFilterPayloads` and returns the definition to PATCH; `commitFilters()` snapshots current filters on normal Continue. `toggleRecipient` returns early when `limitExceeded && checked` in manual mode. `AudienceStep` shows limit banner, dialog panel above footer, disables unselected checkboxes at limit, blocks Continue when `hasPendingFilterChange`. `NewCampaignForm` adds `handleRecipientCountUpdate` (PATCH only, no step advance). Mock confirm handler branches on `audienceMode` from `audienceStore`.

---

### Step 5 — Worker resolution for manual-ID campaigns

Dependencies: Step 2 (campaign record carries audience fields before confirmation).
Frontend files: None (mock handler update only).

- [x] Backend service boundary — `CampaignConfirmService.confirmCampaign`: reject if `audienceMode = null` and `filters` empty; treat `null + non-empty filters` as `"filter"` (backward-compat)
- [x] Backend service boundary — `ResolutionService.resolve`: `"filter"` → existing external-DB query path; `"manual"`/`"all"` → query external DB for `includedIds`, subtract `excludedIds`, feed `BatchPersistenceService.persistBatch`; no change to `BatchPersistenceService` or `CampaignRecipientRepository`
- [x] Validate (mock): `audienceMode = null` + no filters → confirm handler returns 422; `audienceMode = null` + filters → proceeds as `"filter"` via `estimatePreviewCount`; `"manual"` → `startSimulation(id, includedIds.length)` → RESOLVING → SENDING; filter campaign → existing path unchanged

Status: **Complete** (compile-time)
Evidence: All five items done. Frontend mock scope: `tsc --noEmit` clean; confirm handler returns 422 on null audienceMode + no filters. Backend: `./mvnw compile -q` clean on both `broadcastmail-api` and `broadcastmail-worker`. `AudienceNotConfiguredException` (422) added; `CampaignConfirmService` guard inserted after filter load; `ExternalRecipientQueryService.resolveByIds` added (ANY(?) text-array query); `ResolutionService.resolve` branches on `audienceMode` — FILTER uses existing cursor loop (extracted to `resolveByFilters`), MANUAL fetches by ID list, ALL uses cursor scan with per-batch exclusion filter. Runtime validation (`CampaignConfirmServiceTest`, `ResolutionServiceTest`) pending test environment.

---

### Step 6 — SSE overlay wiring for final recipient count

Dependencies: Step 5 (campaign transitions to RESOLVING after confirm).

- [x] `features/campaigns/new/compose/hooks/use-send-campaign.ts` — after 202, subscribe to `useCampaignStatusStream`; expose `step` (adds `"resolving"`) and `finalCount: number | null`; delay redirect until terminal SSE status (`SENDING`, `FAILED`, or timeout)
- [x] `features/campaigns/new/compose/ui/sending-overlay.tsx` — add `resolving` step between `sending` and `done`; display `finalCount`; handle SSE timeout as non-error done
- [x] Validate: `tsc --noEmit` passes with no new errors
- [x] Validate (runtime): overlay shows "Resolving recipients…" after confirm; SSE `SENDING` event with `recipientsCount` → count shown, step advances; terminal status → redirect fires; no console errors

Status: **Complete**
Evidence: `tsc --noEmit` exits cleanly. Two files modified within scope. `SendStep` gains `"resolving"` between `"sending"` and `"done"`; `STEPS` adds `{ id: "resolving", label: "Resolving recipients" }`; overlay prop changed from `recipientCount: number` to `finalCount: number | null`; count line renders only when `finalCount !== null`; heading branches on `"resolving"`. `use-send-campaign.ts` adds `finalCount` to `SendState`; after confirm 202 sets step to `"resolving"` and opens `EventSource` to `/api/v1/campaigns/:id/status/stream`; on `SENDING`/`SENT`/`PARTIALLY_FAILED`/`FAILED` SSE event calls `finishAndRedirect(recipientsCount)`; 5-minute timeout and `onerror` fall back to `finishAndRedirect(null)`; `closeStream()` is idempotent. `new-campaign-form.tsx` passes `finalCount={sendCampaign.finalCount}`. Browser smoke test: 12/12 checks passed — overlay progressed Saving → Starting send → Resolving recipients → Campaign sent (4,959 recipients from SSE recipientsCount); redirect to /dashboard confirmed; 0 console errors.

---

## Checkpoints

| Checkpoint | Condition | Result | Evidence |
|---|---|---|---|
| After Step 2 | PATCH fires on Continue; draft restores on open; errors surface; `canSend` gated | `tsc --noEmit` clean; browser smoke test pending | — |
| After Step 4 | Full frontend audience behavior validated in mock before backend work begins | `tsc --noEmit` clean; browser smoke test pending | — |
| After Step 5 | Backend manual resolution confirmed in test environment before SSE wiring | Compile ✓; runtime test pending | `./mvnw compile -q` clean on api + worker |
| Final | All steps done; all validations passed; no regressions | Pending | — |

## Decisions during implementation

**Step 1 — clarification**: Audience fields (`audienceMode`, `includedIds`, `excludedIds`) are stored in two places: directly on the `Campaign` object in `store` (via PATCH body spread), and separately in `audienceStore`. `withFilters` merges `audienceStore` values, overriding nulls on the campaign object. This mirrors the `filtersStore`/`withFilters` pattern exactly. `fakeCampaign` defaults all three to `null` so the Campaign type invariant is satisfied for pre-feature drafts. The `AudienceFilterPayload` import in `audience.ts` follows the existing pattern already used in `campaigns.ts`.

## Blockers

_None._

## Final verification

- [ ] `tsc --noEmit` passes with no new errors
- [ ] Dev server starts without errors after each step
- [ ] Browser smoke test: new manual-ID draft → select recipients → Continue → confirm → overlay resolving → redirect
- [ ] Browser smoke test: existing filter draft → confirm → same overlay behavior (regression check)
- [ ] Browser smoke test: pre-feature draft (null audience) → `canSend` blocked until audience step completed
- [ ] Diff review: `use-campaign-autosave.ts` unchanged; no audience fields added to autosave payload
- [ ] Dependency direction: no new `lib → features` imports; `AudienceMode` in `lib/types/campaigns.ts`; `AudienceSelectionPayload` in `features/campaigns/api/campaigns.ts`

## Work Tree change control

- Either party may propose an execution improvement by stating the issue and recommendation.
- Human approval is required for scope, ordering, ownership, validation, or reusable process changes.
- Record approved substantive changes in Decisions above.
- Add revision history only when the Work Tree structure, execution order, scope, or process changes materially.

## Completion notes

_Populate when all steps are done and final verification passes._

## Revision history (conditional)

_Include only when the Work Tree itself changes materially._

| Version | Date | Change | Reason | Approval |
|---|---|---|---|---|
| 1.0 | 2026-10-06 | Initial Work Tree | Created from approved Plan v1.2 | Pending |
