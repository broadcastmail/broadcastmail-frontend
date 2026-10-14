# Campaign Detail Fixes — Structure

## Approved design

Reference:

```text
docs/agent-work/campaign-detail-fixes/design/design.md
```

## Files and modules

### Frontend (this repo)

| Path | Responsibility | Change |
|---|---|---|
| `lib/types/campaigns.ts` | Campaign, CampaignRecipient types | Modify: add `bodyHtml`, `retryOfCampaignId` to `Campaign`; remove `source`, `bodyJson`, `bodyHtmlImported`; add `sentAt` to `CampaignRecipient` |
| `features/campaigns/api/campaigns.ts` | API call functions and payload types | Modify: `CreateCampaignPayload` → `{ name, subject, bodyHtml, filters? }`; `retryCampaign`/`retryFailedRecipients` return `Campaign` |
| `features/campaigns/new/compose/hooks/use-campaign-draft.ts` | Draft local state initialization | Modify: init `visualBody.html` from `campaign.bodyHtml`; remove reads of `source`/`bodyJson`/`bodyHtmlImported`; default editor tab to `"visual"` |
| `features/campaigns/new/compose/hooks/use-campaign-autosave.ts` | Debounced save payload builder | Modify: `buildPayload` always produces `{ bodyHtml: string }` |
| `features/campaigns/detail/campaign-detail.tsx` | Detail page, preview, retry actions | Modify: preview from `campaign.bodyHtml`; retry handlers navigate to returned retry campaign; `showRetryStrip` hides when `retryOfCampaignId` non-null; distinguish 409 in retry catch |
| `features/campaigns/detail/detail-header.tsx` | Campaign title and meta | Modify: render `"Retry of: <name>"` when `retryOfCampaignId` is non-null |
| `features/campaigns/detail/recipient-table.tsx` | Paginated recipients, tab counts | Modify: DELIVERED tab count = `deliveredCount` (remove `- openedCount`) |
| `app/dashboard/campaigns/[id]/page.tsx` | Page layout wrapper | Modify: fix height chain to unclip `CampaignDetail`'s scroll |
| `mocks/handlers/campaigns.ts` | MSW route handlers | Modify: POST create accepts `bodyHtml`; retry handlers create new campaign with `retryOfCampaignId`; DELIVERED filter includes OPENED |
| `mocks/fixtures/index.ts` | `fakeCampaign` factory | Modify: replace `source`/`bodyJson`/`bodyHtmlImported` with `bodyHtml`; add `retryOfCampaignId: null` |

### Backend (external — `../broadcastmail-api`)

| Boundary | Change |
|---|---|
| `CreateCampaignRequest` | Remove `connectionId` field and `@NotNull` |
| `CampaignService.createCampaign` | Derive `connectionId` via `connectionRepository.findByAccountId`; apply Jsoup sanitizer |
| `CampaignService.updateCampaign` | Apply Jsoup sanitizer to `bodyHtml` |
| `CampaignResponse` | Add `retryOfCampaignId: UUID \| null` |
| `CampaignConfirmService.createRetryCampaign` | Add retry-of-retry guard (→ 409) before `hasRetryCampaign` check |
| `CampaignController` | Add `GET /{id}/recipients` mapping |
| New `CampaignService.getCampaignRecipients` | Paginated query; `DELIVERED` filter returns `DELIVERED OR OPENED`; `404` if campaign not owned |

## Types and interfaces

```ts
// lib/types/campaigns.ts

interface Campaign {
  // removed: source, bodyJson, bodyHtmlImported
  bodyHtml: string | null;           // add
  retryOfCampaignId: string | null;  // add
  // all other fields unchanged
}

interface CampaignRecipient {
  sentAt: string | null;  // add (aligns with RecipientResponse contract)
  // all other fields unchanged
}

// features/campaigns/api/campaigns.ts

type CreateCampaignPayload = {
  name: string;
  subject: string;
  bodyHtml: string;
  filters?: AudienceFilterPayload[];
};

async function retryCampaign(id: string): Promise<Campaign>
async function retryFailedRecipients(id: string): Promise<Campaign>
```

`ContentSource = "visual" | "import"` stays in `use-campaign-draft.ts` as a local UI type; it is not on `Campaign`. Drafts reopen in `"visual"` mode by default (formatting may change slightly; accepted per design).

## Dependency direction

```
features/campaigns/detail/* → features/campaigns/api/campaigns.ts → lib/types/campaigns.ts
features/campaigns/new/compose/* → features/campaigns/api/campaigns.ts → lib/types/campaigns.ts
mocks/fixtures/index.ts → lib/types/campaigns.ts
mocks/handlers/campaigns.ts → mocks/fixtures/index.ts, lib/types/campaigns.ts
```

`campaign-detail.tsx` adds `useRouter` to navigate to the retry campaign after a retry action. No new cross-feature imports.

## API structure

```
POST /api/v1/campaigns
  Request:  { name, subject, bodyHtml, filters? }
            removed: source, bodyJson, bodyHtmlImported, connectionId
  Response: CampaignResponse (+ retryOfCampaignId)

PATCH /api/v1/campaigns/:id
  Request:  { name?, subject?, bodyHtml?, audienceMode?, includedIds?, excludedIds? }
  Response: CampaignResponse

GET /api/v1/campaigns/:id
GET /api/v1/campaigns
  Response: CampaignResponse now includes retryOfCampaignId: UUID | null

POST /api/v1/campaigns/:id/retry
POST /api/v1/campaigns/:id/recipients/retry-failed
  Response: 202 + CampaignResponse of the new retry campaign
            409 if campaign not in retryable state, already retried, or retry-of-retry

GET /api/v1/campaigns/:id/recipients?status=&page=&size=
  Response: 200 PageResponse<RecipientResponse>
            status=DELIVERED → returns recipients with status DELIVERED or OPENED
            All other status values are exact matches
            404 if campaign not found or not owned by caller
  RecipientResponse: { id, email, status, sentAt, deliveredAt, openedAt }
```

## Vertical slices

### Slice 1 — Scroll fix (G)

- **Frontend:** `app/dashboard/campaigns/[id]/page.tsx` — change wrapper from `h-full min-h-0 overflow-hidden` to `h-full min-h-0 flex flex-col`. This makes the wrapper a flex container so `CampaignDetail`'s `flex-1 overflow-y-auto` gets a bounded height and scrolls correctly.
- **API:** none
- **Backend:** none
- **Database:** none
- **Verification:** browser — scroll the detail page past the stat cards to the recipient table; confirm no clipping

### Slice 2 — Body contract (B + F)

- **Frontend:** `Campaign` type: add `bodyHtml`, remove `source`/`bodyJson`/`bodyHtmlImported`. `CreateCampaignPayload` simplified to `{ name, subject, bodyHtml, filters? }`. `use-campaign-draft` inits `visualBody.html` from `campaign.bodyHtml`, defaults source to `"visual"`. `use-campaign-autosave` `buildPayload` produces `{ bodyHtml }` (visual path: `visualBody.html`; import path: `sanitizeHtmlSource(importedHtml)`). `campaign-detail` `previewDoc` uses `wrapEmailShell(campaign.bodyHtml ?? "")`. `fakeCampaign` and mock POST handler updated.
- **API:** `CreateCampaignPayload` type change described above.
- **Backend:** `CreateCampaignRequest` drops `connectionId`; `CampaignService.createCampaign` derives `connectionId` via `findByAccountId` and applies Jsoup sanitizer; `CampaignService.updateCampaign` applies Jsoup sanitizer.
- **Database:** none (columns already correct).
- **Verification:** `npx tsc --noEmit` passes. In compose: autosave PATCH body contains `bodyHtml`. On detail page: preview renders the stored HTML body.

### Slice 3 — Retry lineage (E)

- **Frontend:** `Campaign` type: add `retryOfCampaignId`. `retryCampaign`/`retryFailedRecipients` return `Campaign`. `campaign-detail` retry handlers call `router.push(`/dashboard/campaigns/${result.id}`)` on success. `detail-header` renders `"Retry of: <name>"` when `retryOfCampaignId` non-null. `showRetryStrip` guard adds `!campaign.retryOfCampaignId` check. `DeadEnd` retry button hidden when `retryOfCampaignId` non-null. Retry `catch` distinguishes 409 (distinct message: "This campaign has already been retried") from transient errors. Mock retry handlers create a new campaign entry with `retryOfCampaignId` set, return 409 on duplicate or wrong-state retry.
- **API:** `retryCampaign`/`retryFailedRecipients` return type change.
- **Backend:** `CampaignResponse` adds `retryOfCampaignId`. `CampaignConfirmService.createRetryCampaign` adds guard: if `original.retryOfCampaignId != null` → throw `CampaignNotRetryableException` (→ 409).
- **Database:** none (V8 migration already adds `retry_of_campaign_id` with unique index).
- **Verification:** `npx tsc --noEmit` passes. Retry a `PARTIALLY_FAILED` campaign — browser navigates to retry campaign showing `"Retry of: X"` title with no retry button. On original, second retry click shows distinct 409 message.

### Slice 4 — Recipient table (C + D)

- **Frontend:** `CampaignRecipient` adds `sentAt`. `recipient-table.tsx` DELIVERED tab count changes from `deliveredCount - openedCount` to `deliveredCount`.
- **API:** `getCampaignRecipients` param and response types unchanged (already correct).
- **Backend:** New `GET /{id}/recipients` endpoint in `CampaignController` and `CampaignService`. `RecipientResponse` DTO: `{ id, email, status, sentAt, deliveredAt, openedAt }`. `status=DELIVERED` filter returns `WHERE status IN ('DELIVERED', 'OPENED')`. `404` if campaign not found or not owned by caller.
- **Mock:** `GET /:id/recipients?status=DELIVERED` filter includes `OPENED` recipients (change `all.filter(r => r.status === status)` to also include `OPENED` when `status === "DELIVERED"`).
- **Database:** none (`campaign_recipients` table exists).
- **Verification:** `npx tsc --noEmit` passes. Delivered tab count matches `deliveredCount` from stat card. Rows include OPENED recipients. Pagination works.

## Slice ordering

Slices 1 and 4 are independent and can be implemented in any order. Slice 3 depends on Slice 2 because both modify `lib/types/campaigns.ts` (`retryOfCampaignId` is added after `bodyHtml` lands). Recommended order: 1 → 2 → 3 → 4.

Backend slices (B, C, E sanitizer/connectionId/recipients/retryLineage) can be worked in parallel with frontend slices. The mock covers frontend development until backend slices land.

## Migration and compatibility

- **Existing drafts:** `bodyHtml` may be null on campaigns created before this change. `use-campaign-draft` defaults to an empty editor. Compose `ready` check gates Send until the user adds content.
- **Editor source on reopen:** `source` removed from `Campaign`. Drafts always reopen in `"visual"` mode. Slight HTML reformatting accepted per design.
- **`UpdateCampaignPayload`:** remains `Partial<CreateCampaignPayload> & AudienceSelectionPayload`. Audience fields are unaffected.
- **Mock handler restart:** edits to `mocks/handlers/campaigns.ts` and `mocks/fixtures/index.ts` require a dev-server restart — `instrumentation.ts` runs once at startup.
- **`connectionId` in mock POST:** mock handler spreads request body; not receiving `connectionId` is harmless.

## Structure approval

- Approved by: lakiidev
- Date: 2026-10-13
