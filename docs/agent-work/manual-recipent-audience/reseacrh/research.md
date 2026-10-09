# Manual Recipient Audience — Research

## Scope

This research traced the draft campaign audience flow from the server-loaded
campaign and audience page through local selection, campaign autosave, preview,
and confirmation. It also inspected the directly consumed MSW handlers and
mock store. The repository contains no production API, backend, database, or
operations implementation, so those behaviors cannot be verified here.

The backend section covers the production API (`broadcastmail-api`), the
background worker (`broadcastmail-worker`), and the shared domain library
(`broadcastmail-common`).

## Current flow

1. `CampaignRouter` loads a campaign, preview count, schema-derived filter
   columns, and the first page of audience recipients for a `DRAFT`.
2. `NewCampaignForm` initializes filter state from `campaign.filters`.
   `AudienceStep` initializes recipient selection locally from the first
   audience page and supports page loading, filtering, and select-all.
3. Filter edits call the debounced campaign `PATCH`; the preview endpoint
   returns a count derived from persisted filters.
4. Continue stores only the displayed selected count in component state and
   moves to compose. The recipient IDs and selection mode are not passed out of
   the audience hook.
5. Send performs another campaign `PATCH`, then posts the displayed
   `recipientCount` to campaign confirmation. The confirmation response has no
   final count or invalid-recipient report in the current client contract.

## Relevant findings

### Audience selection is browser-local

- **Location:** `features/campaigns/new/audience/hooks/use-audience-recipients.ts:useAudienceRecipients`
- **Fact:** Explicit IDs are held in `includedIds`, exclusions in
  `excludedIds`, and select-all is represented by `selectionMode`. `toggleAll`
  changes only this hook state. `AudienceStep` receives only `selectedCount`
  through `onContinue`.
- **Status:** Confirmed
- **Evidence or limitation:** `AudienceStep` passes `onContinue(selectedCount)`;
  no selection IDs or selection mode are included in `Campaign`, autosave, or
  API payload types. State is recreated when the component remounts.

### Current selection does not survive draft lifecycle events

- **Location:** `features/campaigns/new/new-campaign-form.tsx:NewCampaignForm`;
  `features/campaigns/new/compose/hooks/use-campaign-autosave.ts:buildPayload`
- **Fact:** Autosave persists name, subject, body source/content, and filters.
  It never serializes `includedIds`, `excludedIds`, or `selectionMode`.
  Reopening a draft restores `campaign.filters` only.
- **Status:** Confirmed
- **Evidence or limitation:** `Campaign` in
  `lib/types/campaigns.ts:Campaign` has `filters` but no audience-selection
  field. The mock `withFilters` response restores only filters.

### Filter persistence exists through the campaign PATCH contract

- **Location:** `features/campaigns/api/campaigns.ts:updateCampaign`;
  `features/campaigns/new/compose/hooks/use-campaign-autosave.ts:buildPayload`
- **Fact:** Draft updates use `PATCH /api/v1/campaigns/:id`. The request may
  include `filters`, each containing `columnName`, `operator`, `filterValue`,
  and `source`. Filter responses additionally expose `jsonKey`.
- **Status:** Confirmed
- **Evidence or limitation:** `CreateCampaignPayload` and
  `AudienceFilterPayload` define this client-side contract. The mock stores
  filters in `filtersStore` and returns them from campaign GET responses.
  Production validation and persistence are confirmed below.

### Filtering and select-all are not resolved globally by the current client

- **Location:** `features/campaigns/new/audience/hooks/use-audience-recipients.ts:loadRecipients`;
  `features/campaigns/new/audience/ui/audience-step.tsx:AudienceStep`
- **Fact:** `listAudience` sends only cursor and limit. The hook applies filter
  predicates to the recipients already loaded in the browser. Select-all uses
  `totalRecipients` and assumes all matching recipients are represented by the
  count; it does not send a filter definition or an account-wide selection
  operation.
- **Status:** Confirmed
- **Evidence or limitation:** `features/campaigns/api/audience.ts:listAudience`
  has no filter parameter. The MSW audience list returns a cursor-paginated
  static list and does not apply campaign filters.

### Preview count and send count are separate client values

- **Location:** `features/campaigns/api/campaigns.ts:previewRecipients`;
  `features/campaigns/new/compose/hooks/use-send-campaign.ts:send`
- **Fact:** Filter recount saves the draft, then GETs
  `/api/v1/campaigns/:id/preview` and stores `recipientCount`. Send posts that
  number as `{ recipientCount }` to `/confirm`; no audience definition is sent
  in the confirmation request.
- **Status:** Confirmed (client); see backend section for production confirm
  behavior.
- **Evidence or limitation:** `confirmCampaign` returns `Promise<void>`. The
  production `POST /confirm` ignores any submitted `recipientCount`; the real
  count is resolved by the worker.

### Persistence failure blocks the explicit send path, but background failures
### are only logged

- **Location:** `features/campaigns/new/compose/hooks/use-campaign-autosave.ts:saveNow`;
  `features/campaigns/new/compose/hooks/use-send-campaign.ts:send`
- **Fact:** A failed `saveNow` rejects before `confirmCampaign` is called, and
  the send hook exposes the error. Debounced autosave catches failures and
  logs them; the autosave hook has no error state. Continue from the audience
  step does not persist selection state.
- **Status:** Confirmed
- **Evidence or limitation:** The manual save UI displays `saveError`, while
  no equivalent audience-persistence status exists in the audience step.

### The 5,000 manual-selection limit is not enforced in the inspected flow

- **Location:** `features/campaigns/new/audience/hooks/use-audience-recipients.ts: selectedCount`;
  `features/campaigns/new/new-campaign-form.tsx:canSend`
- **Fact:** Selection count is calculated from local sets or
  `totalRecipients`; `canSend` checks content, provider setup, plan/filter
  eligibility, and audience confirmation, but not a 5,000-recipient limit.
- **Status:** Confirmed (frontend); the backend also has no 5,000-recipient
  limit — see backend section.
- **Evidence or limitation:** No `5000` audience-selection validation exists in
  the inspected campaign audience, campaign API, or campaign schema files.
  Account usage limits shown elsewhere are a separate dashboard/billing
  concern and do not validate this selection.

### Ownership, eligibility, deletion handling, snapshot creation, and final
### valid-count reporting are unavailable

- **Location:** `features/campaigns/api/campaigns.ts:confirmCampaign`;
  `mocks/handlers/campaigns.ts:http.post ... /confirm`
- **Fact:** The frontend has no visible contract for ownership validation,
  recipient eligibility checks, omission reporting, immutable recipient
  snapshots, or a final valid count. The mock confirmation creates generated
  simulated recipients from the submitted count.
- **Status:** Confirmed in backend — see backend section.

---

## Backend findings

### Production API for audience definition persistence

- **Location:** `broadcastmail-api/src/main/java/com/broadcastmail/api/campaign/CampaignController.java:updateCampaign` (line 62); `broadcastmail-api/src/main/java/com/broadcastmail/api/campaign/CampaignService.java:updateCampaign` (line 63); `broadcastmail-api/src/main/java/com/broadcastmail/api/campaign/dto/UpdateCampaignRequest.java`
- **Fact:** `PATCH /api/v1/campaigns/:id` is the only endpoint that persists an audience definition. `UpdateCampaignRequest` accepts `name`, `subject`, `bodyHtml`, `scheduledAt`, and `filters` (list). Filters are replace-all: old rows are deleted and new ones saved. The request has no field for manual recipient IDs, excluded IDs, or select-all mode. Manual recipient selection is not representable in the current contract.
- **Status:** Confirmed
- **Evidence:** `UpdateCampaignRequest` record; `CampaignService.updateCampaign` deletes then re-saves `CampaignFilter` rows under `@Transactional`.

### Recipient resolution at campaign confirmation

- **Location:** `broadcastmail-api/src/main/java/com/broadcastmail/api/campaign/confirm/CampaignConfirmService.java:confirmCampaign` (line 43); `broadcastmail-worker/src/main/java/com/broadcastmail/worker/jobs/ResolutionJob.java`; `broadcastmail-worker/src/main/java/com/broadcastmail/worker/resolution/ResolutionService.java`
- **Fact:** `POST /api/v1/campaigns/:id/confirm` validates the campaign is a `DRAFT`, checks connection and plan eligibility, then transitions status to `RESOLVING` and returns `202 Accepted`. A separate scheduled job (`ResolutionJob`, `@Scheduled(fixedDelay = 5000)`) polls for `RESOLVING` campaigns (up to 3 at a time) and calls `ResolutionService.resolve`. Resolution queries the external Supabase connection via JDBC in batches of 100, applying persisted filters. Each batch is persisted to `campaign_recipients` and enqueued in `outbox`. After all batches, the campaign transitions to `SENDING` and `recipientCount` is set.
- **Status:** Confirmed
- **Evidence:** `ResolutionJob.run` with `findAllByStatus(RESOLVING).limit(3)` and `ResolutionService.resolve` iterating batches.

### Immutable recipient snapshot creation

- **Location:** `broadcastmail-worker/src/main/java/com/broadcastmail/worker/resolution/BatchPersistenceService.java:persistBatch`; `broadcastmail-common/src/main/java/com/broadcastmail/common/campaign/recipient/CampaignRecipientRepository.java:upsertRecipients`
- **Fact:** Each resolution batch is persisted under `@Transactional` via a native `INSERT ... ON CONFLICT (campaign_id, external_user_id) DO NOTHING`. The `idempotency_key` (`campaignId:userId`) carries a `UNIQUE` constraint at the DB level. Immediately after insert, new recipient IDs get `OutboxEntry` rows with `status=PENDING`. Once all batches complete, the `campaign_recipients` table is the immutable snapshot for that campaign.
- **Status:** Confirmed
- **Evidence:** `CampaignRecipientRepository.upsertRecipients` native query; V5 migration adds `UNIQUE (campaign_id, external_user_id)` and an index on `(campaign_id, email)`.

### Handling of deleted, ineligible, duplicate, or missing recipient IDs

- **Location:** `broadcastmail-worker/src/main/java/com/broadcastmail/worker/resolution/ExternalRecipientQueryService.java`; `broadcastmail-common/src/main/java/com/broadcastmail/common/campaign/recipient/CampaignRecipientRepository.java:upsertRecipients`
- **Fact:** Recipients are resolved directly from the external Supabase DB — there are no manually submitted IDs to validate. Recipients deleted from the external DB before resolution simply do not appear in query results and are excluded automatically. Duplicates are prevented by `ON CONFLICT (campaign_id, external_user_id) DO NOTHING`. Unsubscribed recipients: the `unsubscribes` table schema comment states they should be checked before snapshot creation, but `ExternalRecipientQueryService.resolve` does not join the `unsubscribes` table — previously unsubscribed recipients are not filtered out at resolution time in the current implementation.
- **Status:** Deleted recipients: Confirmed (excluded by absence from query). Duplicates: Confirmed (DB constraint). Unsubscribes at resolution time: Confirmed gap — not filtered.

### Campaign ownership and recipient account ownership validation

- **Location:** `broadcastmail-api/src/main/java/com/broadcastmail/api/security/ApiKeyAuthFilter.java`; `broadcastmail-api/src/main/java/com/broadcastmail/api/campaign/CampaignService.java:getCampaign` (line 49)
- **Fact:** All API requests authenticate via `ApiKeyAuthFilter`, which resolves the `accountId` from the API key hash and sets it as the `Authentication` principal. Every campaign access uses `findByAccountIdAndId(accountId, campaignId)` — a campaign from another account returns 404. Recipients are resolved from the account's own connection, so ownership is implicit.
- **Status:** Confirmed
- **Evidence:** `CampaignService.getCampaign` and `CampaignController` consistently use `@AuthenticationPrincipal UUID accountId`; no cross-account recipient access is possible.

### Plan limits and recipient quota enforcement

- **Location:** `broadcastmail-api/src/main/java/com/broadcastmail/api/campaign/confirm/CampaignConfirmService.java:confirmCampaign` (line 57); `broadcastmail-worker/src/main/java/com/broadcastmail/worker/resolution/ResolutionService.java:resolve` (line 63); `broadcastmail-common/src/main/java/com/broadcastmail/common/account/plan/FreePlanStrategy.java`; `broadcastmail-common/src/main/java/com/broadcastmail/common/account/plan/ProPlanStrategy.java`
- **Fact:** Two limits are enforced. (1) Filter feature: free accounts calling `confirmCampaign` with filters throw `PlanFeatureException` via `planFacade.enforceFeature(account, PlanFeature.FILTERS)`. (2) Recipient quota: enforced per-batch in the worker — free plan allows 500 unique recipients per rolling 30 days; Pro plan is unlimited. Exceeding the quota transitions the campaign to `FAILED`. No 5,000 manual-selection limit exists anywhere in the backend.
- **Status:** Confirmed
- **Evidence:** `FreePlanStrategy.checkRecipientLimit` (500); `ProPlanStrategy.checkRecipientLimit` (no-op); `ResolutionService` calls `checkRecipientLimit` per batch with historical + current count.

### Request-size and rate limits

- **Location:** `broadcastmail-api/src/main/resources/application.yml`; `broadcastmail-api/src/main/java/com/broadcastmail/api/security/PlanEnforcementFilter.java`
- **Fact:** No explicit request-size limit is configured in `application.yml` (Spring Boot default of 2 MB applies). No rate-limiting middleware is present. `PlanEnforcementFilter` enforces plan features on annotated endpoints but is not a rate limiter. No per-filter or per-audience-update throttle exists.
- **Status:** Confirmed (no limits configured)

### Resolution queue, transactions, timeout, and retry mechanisms

- **Location:** `broadcastmail-worker/src/main/java/com/broadcastmail/worker/jobs/ResolutionJob.java`; `broadcastmail-worker/src/main/java/com/broadcastmail/worker/resolution/BatchPersistenceService.java`; `broadcastmail-worker/src/main/java/com/broadcastmail/worker/outbox/OutboxProcessor.java`
- **Fact:** Resolution is a polling loop (`@Scheduled(fixedDelay=5000)`), not a queue. Up to 3 campaigns resolve concurrently. Each 100-row batch is committed in its own `@Transactional` block. No explicit resolution timeout: an unhandled exception transitions the campaign to `FAILED`. For sending, the outbox pattern provides retries: up to 3 attempts with backoff of 1 min → 5 min → 15 min per `EmailSendException`; a Resend rate-limit exception defers to the start of the next calendar day.
- **Status:** Confirmed
- **Evidence:** `ResolutionJob` with `limit(3)`; `BatchPersistenceService.persistBatch` `@Transactional`; `OutboxProcessor.process` backoff logic.

### Final response reporting the valid recipient count

- **Location:** `broadcastmail-api/src/main/java/com/broadcastmail/api/campaign/CampaignController.java:confirmCampaign` (line 84); `broadcastmail-api/src/main/java/com/broadcastmail/api/campaign/CampaignController.java:streamStatus` (line 103)
- **Fact:** `POST /api/v1/campaigns/:id/confirm` returns `202 Accepted` with no body. The confirmed `recipientCount` is written to `campaigns.recipient_count` by the worker after resolution completes. Clients can observe it via `GET /api/v1/campaigns/:id` (polled) or `GET /api/v1/campaigns/:id/status/stream` (SSE, 5-minute timeout, polls every 2 seconds). No confirmation response reports a final valid count or an invalid-recipient list.
- **Status:** Confirmed
- **Evidence:** `CampaignController.confirmCampaign` returns `ResponseEntity.accepted().build()`; `ResolutionService` sets `campaign.setRecipientCount(totalResolved)` after the batch loop.

### Database entities, constraints, and indexes

- **Location:** `broadcastmail-common/src/main/resources/db/migration/V1__init.sql`; `broadcastmail-common/src/main/resources/db/migration/V5__plan_enforcement_indexes_and_constraints.sql`; `broadcastmail-common/src/main/resources/db/migration/V7__add_filter_source.sql`
- **Fact:**
  - **Audience definition:** `campaign_filters` table — columns: `id`, `campaign_id` (FK → `campaigns`), `column_name`, `operator` (eq/neq/gt/lt/contains), `filter_value`, `filter_order`, `source` (added V7), `json_key`. Index: `idx_campaign_filters_campaign_id`.
  - **Recipient snapshot:** `campaign_recipients` table — columns: `id`, `campaign_id` (FK), `external_user_id`, `email`, `status` (queued/sent/delivered/opened/bounced/failed/unsubscribed), `idempotency_key UNIQUE`, `resend_message_id UNIQUE`, `failed_reason`, lifecycle timestamps. Constraints: `UNIQUE (campaign_id, external_user_id)` (V5). Indexes: `idx_campaign_recipients_campaign_id`, `idx_campaign_recipients_resend_message_id`, `idx_campaign_recipients_status`, `idx_campaign_recipients_campaign_email` (V5).
  - **Outbox:** `outbox` table with partial index `idx_outbox_status_next_attempt WHERE status = 'pending'` — critical for fan-out polling performance.
  - No audience-selection table exists (manual IDs, exclusions, select-all mode have no schema representation).
- **Status:** Confirmed
- **Evidence:** V1 init migration; V5 enforcement migration.

### AudienceController stub — not implemented

- **Location:** `broadcastmail-api/src/main/java/com/broadcastmail/api/audience/AudienceController.java`
- **Fact:** `GET /api/v1/audience/list` and `GET /api/v1/audience/filters` exist as routes but both return `null`. The service layer and implementation are absent. The `AudiencePreviewResponse` DTO was deleted (shown as `AD` in git status). These endpoints are not usable in production.
- **Status:** Confirmed
- **Impact on research:** The audience list endpoint the frontend consumes via `listAudience` has no backend implementation. Any audience listing for the new manual-selection feature will require a full implementation.

---

## Layer impact evidence

| Layer | Status | Evidence |
|---|---|---|
| Frontend | Affected | Selection is local-only in `useAudienceRecipients`; draft and send consumers currently receive only filters/counts. Manual IDs, exclusions, and select-all are not persisted. |
| API | Affected | `UpdateCampaignRequest` has no field for manual IDs, exclusions, or select-all. `AudienceController` endpoints return null. Confirm returns 202 with no body. |
| Backend | Affected | `ResolutionService` resolves only from filter-based SQL queries; no code path handles a manual ID list or exclusion set. No 5,000-recipient limit is implemented. |
| Database | Affected | `campaign_filters` stores filter definitions. `campaign_recipients` is the immutable snapshot. No table for audience selection state (included/excluded IDs, select-all flag) exists. |
| Operations | Affected | Resolution is a 5-second polling loop (limit 3 concurrent); no timeout; failure → FAILED. Outbox fan-out has retries and backoff. No rate limiting exists. |
| Testing | Affected | `CampaignConfirmServiceTest` and `ResolutionServiceTest` cover the existing filter-based confirm and resolve paths using Mockito. No tests for manual ID input or audience selection persistence exist. |

## Questions answered

- **Where does audience selection begin and end in the current flow?** — It
  begins in `AudienceStep`/`useAudienceRecipients` and currently ends at the
  `selectedCount` callback; IDs do not cross into draft persistence or send.
- **Where is audience state currently persisted?** — Filters are persisted as
  campaign PATCH data and restored on campaign GET. Manual additions,
  exclusions, and select-all state are not persisted.
- **What does the campaign draft PATCH accept?** — `name`, `subject`,
  `bodyHtml`, `scheduledAt`, and `filters`. No manual recipient selection
  fields are defined in `UpdateCampaignRequest`.
- **How does current confirmation resolve recipients?** — `POST /confirm`
  transitions the campaign to `RESOLVING`. The worker's `ResolutionJob` picks
  it up, queries the external Supabase DB using persisted filters, and
  snapshots results into `campaign_recipients` with outbox entries.
- **Which frontend components, hooks, API functions, mocks, and fixtures own
  the flow?** — `CampaignRouter`, `campaign-data`, `NewCampaignForm`,
  `AudienceStep`, `useAudienceRecipients`, `useAudienceFilterEditor`,
  `useCampaignAutosave`, `useSendCampaign`, `features/campaigns/api/audience`,
  `features/campaigns/api/campaigns`, and the corresponding MSW audience and
  campaign handlers.
- **Are current limits and ownership checks visible?** — Campaign ownership
  enforced via `findByAccountIdAndId`. Plan feature (filters) enforced at
  confirm time. Recipient quota (free: 500/30 days) enforced per-batch in
  worker. No 5,000-recipient manual-selection limit exists anywhere.
- **What production API accepts and persists the audience definition?** —
  `PATCH /api/v1/campaigns/:id` via `CampaignService.updateCampaign`. Only
  filters are persisted; manual IDs are not representable.
- **How are final recipients resolved and snapshotted at confirmation?** —
  `ResolutionService` queries the external DB in 100-row batches, upserts to
  `campaign_recipients` with duplicate prevention, and enqueues outbox entries.
- **What happens to deleted, ineligible, or duplicate recipient IDs?** —
  Deleted from external DB: excluded automatically by absence. Duplicates:
  `ON CONFLICT DO NOTHING`. Unsubscribes: not filtered at resolution time
  (confirmed gap in implementation).
- **What ownership, quota, and plan constraints apply?** — `accountId`
  principal binding, `findByAccountIdAndId` everywhere, filter-feature check,
  recipient quota per rolling 30 days.
- **What final response reports the valid recipient count?** — None from
  `/confirm`. Count is available on `GET /campaigns/:id` as `recipientCount`
  after the campaign transitions to `SENDING`, or via SSE stream.
- **What database entities store the audience definition and snapshot?** —
  `campaign_filters` for the definition; `campaign_recipients` for the
  snapshot. No manual-selection table exists.

## Questions still open

- **Unsubscribe filtering at resolution time:** `ExternalRecipientQueryService`
  does not join the `unsubscribes` table. The schema comment indicates this
  was intended but is not implemented. Owner: backend team must confirm whether
  this is a known gap or an intentional future item.
- **AudienceController implementation:** `GET /api/v1/audience/list` and
  `GET /api/v1/audience/filters` return `null`. Backend implementation is
  required before the frontend audience page can work in production.

## Research status

- `Complete` — all blocking questions about the production campaign-audience
  flow are answered. The two remaining items above are known gaps in the
  current implementation, not unknowns requiring research.
