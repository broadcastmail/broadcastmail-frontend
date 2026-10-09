# Manual Recipient Audience — Structure

## Approved design

Reference:

```text
docs/agent-work/manual-recipent-audience/design/design.md
```

## Files and modules

| Path | Responsibility | Change |
|---|---|---|
| `lib/types/campaigns.ts` | `Campaign` type + `AudienceMode` enum | Modify — add `AudienceMode`, `audienceMode`, `includedIds`, `excludedIds` to `Campaign` |
| `features/campaigns/api/campaigns.ts` | Campaign CRUD API boundary | Modify — add `AudienceSelectionPayload`, widen `updateCampaign` signature |
| `features/campaigns/api/audience.ts` | Audience list and filter-values API boundary | Modify — add filter-predicate params to `listAudience`; add `total` to `AudienceListResponse` |
| `features/campaigns/new/audience/audience.ts` | Filter and column domain logic | No change |
| `features/campaigns/new/audience/hooks/use-audience-recipients.ts` | Local audience selection state | Modify — accept initial state from campaign record; expose `audienceDefinition`; enforce 5,000 limit; detect filter changes vs. saved state |
| `features/campaigns/new/audience/hooks/use-audience-filter-editor.ts` | Local filter state and preview recount | No change |
| `features/campaigns/new/audience/ui/audience-step.tsx` | Audience step UI | Modify — show filter-change dialog; show PATCH error; show 5,000-limit warning; disable Continue during save |
| `features/campaigns/new/new-campaign-form.tsx` | Campaign form orchestrator | Modify — pass `campaign.audienceMode/includedIds/excludedIds` into `AudienceStep`; call audience PATCH on Continue and filter-change resolution; gate `canSend` on `audienceMode !== null` |
| `features/campaigns/new/compose/hooks/use-campaign-autosave.ts` | Content autosave | No change — must not receive audience fields |
| `features/campaigns/new/compose/hooks/use-send-campaign.ts` | Send flow | Modify — connect to SSE after confirm; expose resolving step and final count |
| `features/campaigns/new/compose/ui/sending-overlay.tsx` | Send progress overlay | Modify — add `resolving` step; show final `recipientCount` from SSE |
| `features/campaigns/shared/use-campaign-status-stream.ts` | SSE stream hook | No change — already exists; consumed by `use-send-campaign.ts` |
| `mocks/campaign-store.ts` | In-memory mock store | Modify — add `audienceStore` for `audienceMode`/`includedIds`/`excludedIds` |
| `mocks/handlers/campaigns.ts` | MSW campaign handlers | Modify — PATCH handler persists audience fields; `withFilters` returns audience fields; confirm derives count from `includedIds.length` for manual mode |
| `mocks/handlers/audience.ts` | MSW audience handlers | Modify — apply filter predicates server-side; return `total` |

No new files are required. The filter-change dialog is an inline UI state in `audience-step.tsx`, not a separate component file.

## Types and interfaces

```ts
// lib/types/campaigns.ts — additions
export type AudienceMode = "manual" | "filter" | "all";

export interface Campaign {
  // ...existing fields unchanged...
  audienceMode: AudienceMode | null;  // null for pre-feature drafts
  includedIds: string[] | null;
  excludedIds: string[] | null;
}

// features/campaigns/api/campaigns.ts — additions
export interface AudienceSelectionPayload {
  audienceMode?: AudienceMode;
  includedIds?: string[];   // external user IDs; max 5,000; 400 if exceeded
  excludedIds?: string[];
}

export type UpdateCampaignPayload = Partial<CreateCampaignPayload> & AudienceSelectionPayload;

export function updateCampaign(
  id: string,
  payload: UpdateCampaignPayload,
): Promise<Campaign>;

// features/campaigns/api/audience.ts — additions
export interface AudienceListResponse {
  recipients: AudienceRecipient[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;  // added — needed for select-all count with filters
}

export function listAudience(params: {
  cursor?: string | null;
  limit?: number;
  filters?: AudienceFilterPayload[];  // applied server-side
}): Promise<AudienceListResponse>;

// use-audience-recipients.ts — additions to return type
audienceDefinition: {
  audienceMode: AudienceMode;
  includedIds: string[];
  excludedIds: string[];
};
limitExceeded: boolean;                // includedIds.length > 5,000
hasPendingFilterChange: boolean;       // filters changed while IDs are non-empty
resolvePendingFilterChange: (action: "reapply" | "clear") => void;
```

## Dependency direction

```text
features/campaigns/new/new-campaign-form.tsx (orchestrator)
  → features/campaigns/new/audience/ui/audience-step.tsx
    → features/campaigns/new/audience/hooks/use-audience-recipients.ts
      → features/campaigns/api/audience.ts
      → features/campaigns/new/audience/audience.ts
  → features/campaigns/new/audience/hooks/use-audience-filter-editor.ts
    → features/campaigns/api/campaigns.ts (previewRecipients)
  → features/campaigns/new/compose/hooks/use-campaign-autosave.ts
    → features/campaigns/api/campaigns.ts (updateCampaign — content fields only)
  → features/campaigns/new/compose/hooks/use-send-campaign.ts
    → features/campaigns/api/campaigns.ts (confirmCampaign)
    → features/campaigns/shared/use-campaign-status-stream.ts
```

**Allowed:** `features/campaigns/new/audience/` imports from `features/campaigns/api/` and `lib/types/`. `features/campaigns/new/compose/` imports from `features/campaigns/new/audience/audience.ts` for filter types (existing pattern).

**Not allowed:**
- `use-campaign-autosave.ts` must not import or receive `includedIds`, `excludedIds`, or `audienceMode`.
- `AudienceSelectionPayload` and `UpdateCampaignPayload` must not be placed in `lib/` — they belong in `features/campaigns/api/campaigns.ts`.
- `AudienceMode` is placed in `lib/types/campaigns.ts` alongside `Campaign` to avoid adding a new `lib → features` import. No additional `lib → features` dependency is introduced.

## API structure

```text
PATCH /api/v1/campaigns/:id
Request additions (all optional; absent fields leave audience unchanged):
  audienceMode : "manual" | "filter" | "all"
  includedIds  : string[]  (max 5,000; 400 if exceeded)
  excludedIds  : string[]
Response: 200 Campaign (now includes audienceMode, includedIds, excludedIds)
          400 if includedIds.length > 5,000

GET /api/v1/audience/list
Query: cursor?, limit?, filters? (encoded AudienceFilterPayload[])
Response: { recipients: AudienceRecipient[], nextCursor: string|null, hasMore: boolean, total: number }
Auth: accountId from API key principal

GET /api/v1/audience/filters
Query: column, cursor?
Response: { column, values: [{value, count}][], nextCursor, hasMore }
Auth: accountId from API key principal (unchanged contract, stub → real implementation)

POST /api/v1/campaigns/:id/confirm
Request/Response: unchanged — 202 Accepted, no body

GET /api/v1/campaigns/:id/status/stream
SSE: { id, status, recipientsCount, ... }
Used by: use-send-campaign.ts after confirm to surface final recipient count
```

## Vertical slices

### Slice 1: Audience definition persistence and draft restoration

- **Frontend:** Add `AudienceMode` to `lib/types/campaigns.ts`; add `AudienceSelectionPayload` and `UpdateCampaignPayload` to `features/campaigns/api/campaigns.ts`; update `updateCampaign` signature. Initialize `useAudienceRecipients` from `campaign.audienceMode/includedIds/excludedIds`. Expose `audienceDefinition` from the hook return. In `NewCampaignForm`, call `updateCampaign` with audience state on Continue; block Continue while saving; show error on failure; gate `canSend` on `audienceMode !== null`.
- **API:** `PATCH /api/v1/campaigns/:id` accepts and returns `audienceMode`, `includedIds`, `excludedIds`.
- **Backend:** Add fields to `UpdateCampaignRequest`; persist in `CampaignService.updateCampaign`; include in `Campaign` response DTO; validate `includedIds.length <= 5,000`.
- **Database:** V8 migration adds `audience_mode VARCHAR`, `included_ids JSONB`, `excluded_ids JSONB` columns to `campaigns` table — nullable, no default, existing rows remain null.
- **Verification:** PATCH with `{ audienceMode: "manual", includedIds: ["id1"], excludedIds: [] }` → GET returns those fields. Reopening a draft populates selection in the UI. Reopening a pre-feature draft (null fields) shows empty selection without error.

### Slice 2: AudienceController implementation and server-side filtering

- **Frontend:** Update `listAudience` to send filter predicates; update `useAudienceRecipients` to pass active filters to the API instead of filtering client-side; use `total` from response for select-all recipient count.
- **API:** `GET /api/v1/audience/list` accepts `filters` query parameter.
- **Backend:** Implement `AudienceService` and wire `AudienceController`. Connect to external Supabase connection for cursor-paginated filtered listing; return `total` count for the filtered set.
- **Database:** No migration — queries external Supabase via existing JDBC infrastructure.
- **Verification:** Filtering by `plan=pro` returns only pro users; `total` reflects the filtered count; pagination cursor works across filter changes.

### Slice 3: 5,000-recipient limit and filter-change dialog

- **Frontend:** In `useAudienceRecipients`, track when filters change after manual IDs are set; expose `hasPendingFilterChange` and `resolvePendingFilterChange`. In `audience-step.tsx`, show inline "Reapply or Clear" dialog when `hasPendingFilterChange`; block Continue until resolved; show limit warning at 5,000; disable individual toggles at 5,000 in manual mode.
- **API:** No new shape — 400 for oversized payloads already established in Slice 1.
- **Backend:** `includedIds.length <= 5,000` validation already established in Slice 1. No additional backend work in this slice.
- **Database:** No change.
- **Verification:** Selecting 5,001 recipients shows limit warning and blocks further selection. Editing a filter with existing manual IDs shows the dialog. "Reapply" fires PATCH with existing IDs and new filters. "Clear" fires PATCH with empty arrays.

### Slice 4: Worker resolution for manual-ID campaigns

- **Frontend:** No frontend change — audience PATCH established in Slice 1 is sufficient.
- **API:** No change — confirmation is still `POST /confirm → 202`.
- **Backend:** `ResolutionService` branches on `audienceMode`: `filter` uses existing path; `manual` and `all` query external DB for `includedIds`, subtract `excludedIds`, feed same `BatchPersistenceService` path. `CampaignConfirmService` rejects with an error if `audienceMode` is `null`. Backward-compat: `audienceMode = null` with filters present is treated as `filter`.
- **Database:** No migration — `campaign_recipients` is unchanged; `ON CONFLICT DO NOTHING` idempotency guarantee is reused.
- **Verification:** Confirm a manual-ID campaign; SSE transitions RESOLVING → SENDING → SENT; final `recipientCount` equals the number of resolved valid IDs. Confirm with `audienceMode = null` is rejected cleanly.

### Slice 5: SSE wiring on sending overlay

- **Frontend:** In `use-send-campaign.ts`, after `confirmCampaign` resolves subscribe to `useCampaignStatusStream`; expose `resolving` step and `finalCount`; delay redirect until terminal SSE status. In `sending-overlay.tsx`, add a `resolving` step between `sending` and `done`; display final `recipientCount` when available.
- **API:** No change — SSE endpoint unchanged.
- **Backend:** No change — SSE stream already reports `recipientsCount`.
- **Database:** No change.
- **Verification:** After confirm, overlay shows "Resolving recipients…"; transitions to "Sending…" with final count; then redirects to campaign detail on terminal status.

## Migration and compatibility

- **Existing drafts**: `audienceMode`, `includedIds`, `excludedIds` are nullable. A pre-feature draft has all three as `null`. `useAudienceRecipients` treats `null` as no initial selection. `canSend` gates on `audienceMode !== null`, which blocks sending on pre-feature drafts until the audience step is completed — this is intentional.
- **Content-only autosave**: `use-campaign-autosave.ts` and `buildPayload` are unchanged. They never send audience fields. The audience PATCH is a separate explicit call, not part of the debounced autosave chain.
- **Existing filter campaigns**: `audienceMode = null` with filters present is treated as `filter` at confirmation time for backward compat. After Slice 1, newly continued drafts with filters will have `audienceMode = "filter"` set explicitly on Continue.
- **202 confirmation response**: Unchanged. `confirmCampaign` returns `Promise<void>`. SSE is connected after it resolves — the 202 response is not augmented.
- **Existing recipient snapshot pipeline**: `BatchPersistenceService` and `CampaignRecipientRepository.upsertRecipients` are unchanged. The new manual resolution branch feeds the same upsert path with the same idempotency guarantee.
- **Mock behavior vs. production**: Mocks simulate audience persistence as in-memory state in `campaign-store.ts`. The mock confirm handler calls `startSimulation` with a count derived from `includedIds.length` (manual mode) or `estimatePreviewCount` (filter mode) — this simulates UI lifecycle, not recipient resolution accuracy.

## Structure approval

- Approved by: lakiidev
- Date: 2026-10-06