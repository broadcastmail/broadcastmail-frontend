# Campaign Detail Fixes — Research

## Scope

Traced the campaign detail page (`CampaignRouter` → `CampaignDetail`), its
preview, retry, and recipient table, and the create/update body path in the
frontend. Checked the mock handlers (`mocks/handlers/campaigns.ts`) against the
production backend in `../broadcastmail-api` (controller, DTOs, retry service,
retry repository, Flyway migrations). Not available: a running backend, a
browser session, and the production database. Browser verification of scroll
and stat refresh is therefore **not** done here and stays open.

## Current flow

1. `app/dashboard/campaigns/[id]/page.tsx` wraps `CampaignRouter` in
   `h-full min-h-0 overflow-hidden`.
2. `CampaignRouter` loads the campaign with `getCampaign` (server). Non-`DRAFT`
   campaigns render `CampaignDetail`.
3. `CampaignDetail` fetches the campaign client-side, subscribes to the status
   SSE stream (`useCampaignStatusStream`), and merges live counters over the
   fetched campaign.
4. The preview builds `previewDoc` from `source`: `jsonToHtml(bodyJson)` for
   `visual`, `sanitizeHtmlSource(bodyHtmlImported)` for `import`, then
   `wrapEmailShell` (adds the generic unsubscribe footer). It is rendered in an
   `<iframe sandbox="">`.
5. Retry: `RetryStrip` / `DeadEnd` call `retryFailedRecipients` /
   `retryCampaign`, ignore the response body, call `load()` on the original
   campaign, and bump `reconnectKey` to reopen the SSE stream.
6. `RecipientTable` calls `GET /api/v1/campaigns/{id}/recipients`, which the
   production backend does not define (see below).

## Relevant findings

### Body contract differs between frontend and backend

- **Location:** `features/campaigns/api/campaigns.ts:CreateCampaignPayload`,
  `lib/types/campaigns.ts:Campaign`; backend
  `CreateCampaignRequest`, `UpdateCampaignRequest`, `CampaignResponse`.
- **Fact:** Frontend create/update sends `source` + `bodyJson` (visual) or
  `source` + `bodyHtmlImported` (import). Frontend `Campaign` reads
  `source`, `bodyJson`, `bodyHtmlImported`. The backend request and response
  records carry only `bodyHtml` (`CreateCampaignRequest.bodyHtml` is
  `@NotBlank`). The backend has no `source`, `bodyJson`, or
  `bodyHtmlImported` fields.
- **Status:** Confirmed
- **Evidence or limitation:** Migration `V1__init.sql` defines `body_html TEXT NOT
  NULL`. Against the real API, a frontend create without `bodyHtml` would fail
  validation. The mock `POST /api/v1/campaigns` accepts any body via
  `Partial<Campaign>`, which hides the mismatch.
- **Impact:** Frontend body fields, preview derivation, autosave payload, and
  the mock all depend on the field set that the backend does not accept.

### `connectionId` is never sent by the frontend

- **Location:** `features/campaigns/api/campaigns.ts:createCampaign`;
  backend `CreateCampaignRequest.connectionId`, `CampaignService.mapToEntity`.
- **Fact:** A grep for `connectionId` across `features`, `lib`, `components`,
  `mocks`, and `app` returns no hits. The backend requires it (`@NotNull`) and
  stores it without checking that the connection belongs to the caller
  (`mapToEntity` copies it; no connection lookup appears in `CampaignService`).
- **Status:** Confirmed (frontend omission and backend lack of ownership check
  within `CampaignService`). Whether `ConnectionRepository` is enforced elsewhere
  in the create path is **Unknown**; no such check was found in the files read.
- **Evidence or limitation:** `CampaignService.createCampaign` → `mapToEntity`.
- **Impact:** The question "where does `connectionId` come from on create" has
  no frontend source today. It is also a permissions gap to decide on.

### Retry response does not carry retry lineage; frontend ignores the new campaign

- **Location:** backend `CampaignController.retryCampaign`,
  `retryFailed`, `CampaignConfirmService.createRetryCampaign`,
  `CampaignResponse`; frontend `campaigns.ts:retryCampaign`,
  `retryFailedRecipients`, `campaign-detail.tsx:handleRetry`,
  `handleRetryFailed`.
- **Fact:** `POST /retry` returns `202` with a `CampaignResponse` of the new
  retry campaign when failed recipients exist. It returns `202` with an empty
  body when there are zero failed recipients (it then restarts resolution on the
  same campaign). `POST /recipients/retry-failed` always returns `202` with the
  retry campaign. The retry campaign is created with status `SENDING`, name
  `"<name> (retry)"`, and `retry_of_campaign_id` set. Frontend functions return
  `void` and discard the body. `CampaignResponse` has no `retryOfCampaignId` or
  retry-campaign reference, so neither the original nor the retry can link to
  the other from the response. Migration `V8__add_campaign_retry_lineage.sql`
  adds `retry_of_campaign_id` with a unique index.
- **Status:** Confirmed
- **Evidence or limitation:** Mock `POST /:id/retry` returns `202` with no body
  and restarts the original simulation. Mock `retry-failed` mutates the original
  campaign's recipients in place and never creates a retry campaign. The mock
  therefore does not model the backend's contract.
- **Impact:** "Link to the new retry campaign" cannot be implemented from the
  current response. Stats on the original stay at their pre-retry values in the
  backend, which matches the decided behavior.

### Retry cardinality and failure cases

- **Location:** `CampaignConfirmService.createRetryCampaign`,
  `getCampaignInStatus`, `CampaignRetryRepository.hasRetryCampaign`;
  `GlobalExceptionHandler` (`CampaignNotRetryableException` → `409 CONFLICT`).
- **Fact:** Only one retry campaign can exist per original (checked with
  `hasRetryCampaign` and a unique index). Retry requires `FAILED` (for `/retry`)
  or `PARTIALLY_FAILED` (for `/recipients/retry-failed`); other states return
  `409`. Retry copies only recipients with status `failed`, so `bounced` is
  excluded, matching the decided behavior.
- **Status:** Confirmed
- **Evidence or limitation:** `CampaignRetryRepository.copyFailedRecipients`
  (`AND status = 'failed'`); `countFailedRecipients` (`status = 'failed'`).
- **Impact:** A second retry attempt returns `409`. The frontend's `catch` sets a
  generic "Couldn't retry" error and does not distinguish `409` from a
  transient failure. `RetryStrip` stays visible after a successful retry because
  the original's `failedCount` is unchanged, so a second click hits `409`.
  Whether the strip should hide after a retry is a product question.

### Recipients endpoint does not exist in the backend

- **Location:** `features/campaigns/api/campaigns.ts:getCampaignRecipients`;
  `features/campaigns/detail/recipient-table.tsx:RecipientTable`; backend
  `CampaignController`.
- **Fact:** The frontend calls `GET /api/v1/campaigns/{id}/recipients` with
  `status`, `page`, `size`. The backend controller has no mapping for it. The
  only `recipients` mapping is `POST /{id}/recipients/retry-failed`. The
  backend `campaign_recipients` table exists (`CampaignRecipient` entity;
  `V1__init.sql`).
- **Status:** Confirmed (absent in the controller); production behavior of a
  non-mapped route is Inferred to be `404`.
- **Evidence or limitation:** The mock implements the endpoint, and its shape
  (`PageResponse`) is an assumption, documented in `campaigns.ts` as "would come
  back the same shape."
- **Impact:** The recipient table has no production data source. This is the
  open Engineering decision (build the endpoint or drop the table).

### Status "Delivered" meanings differ in the UI

- **Location:** `recipient-table.tsx:counts`; `stat-cards.tsx` (`Delivered`,
  `Opens`); `detail-header.tsx`.
- **Fact:** The recipient-table tab counts `DELIVERED` as
  `deliveredCount - openedCount`. The stat card labels `deliveredCount` as
  "Delivered". The tab filter `status=DELIVERED` returns only recipients whose
  status is `DELIVERED` (not `OPENED`).
- **Status:** Confirmed
- **Evidence or limitation:** Recipient status enum includes `DELIVERED` and
  `OPENED` as separate values (`RecipientStatus`).
- **Impact:** The same label gives different numbers in the card and the tab.
  This matches the open product decision.

### Preview: sandbox, unsubscribe footer, and body source

- **Location:** `detail-preview-panel.tsx` (`sandbox=""`);
  `email-html.ts:wrapEmailShell`; `campaign-detail.tsx:previewDoc`.
- **Fact:** `sandbox=""` disables scripts, forms, and navigation, so links in
  the preview cannot be followed. `wrapEmailShell` always appends a generic
  footer with `<a href="#">Unsubscribe</a>`. The sent HTML from compose
  (`compose-step.tsx:77`) is `visualBody.html` or `sanitizeHtmlSource(importedHtml)`.
  The backend stores no unsubscribe footer, and the backend did not show one in
  the files read.
- **Status:** Confirmed (frontend). Whether the footer is added at send time on
  the backend or the worker is **Unknown** (worker not inspected).
- **Evidence or limitation:** `wrapEmailShell` is the only footer source found
  in the frontend.
- **Impact:** The preview may show a footer the recipient does not receive, or
  the reverse. Both open product decisions depend on this.

### Sanitization is client-only

- **Location:** `sanitize-html-source.ts:sanitizeHtmlSource`; backend
  `CampaignService`, `UpdateCampaignRequest`.
- **Fact:** DOMPurify runs on the client on every import edit and before save
  (`use-campaign-autosave.ts:buildPayload`). The backend sanitizer search
  (`sanitiz`, `Jsoup`, `Safelist`, `antisamy`, `owasp`) found nothing in
  `broadcastmail-api/src/main`.
- **Status:** Confirmed (no backend sanitizer in the API code read). Presence in
  `broadcastmail-common` or the worker is **Unknown** (grep not run there).
- **Evidence or limitation:** The `sanitize-html-source.ts` comment says the API
  MUST sanitize on receipt.
- **Impact:** The "sanitize on every save" decision has no server-side
  implementation evident today.

### Detail page scroll container is likely clipped by its parent

- **Location:** `app/dashboard/campaigns/[id]/page.tsx` (wrapper
  `h-full min-h-0 overflow-hidden`); `campaign-detail.tsx` root
  (`flex-1 overflow-y-auto`).
- **Fact:** The scroll container is a child `flex-1 overflow-y-auto` inside a
  wrapper that is not a flex container, and the wrapper has
  `overflow-hidden`. `flex-1` has no effect outside a flex parent, so the root
  div may not get a bounded height and the content is clipped instead of
  scrolled.
- **Status:** Inferred. Not verified in a browser.
- **Evidence or limitation:** Static class analysis only. The parent layout
  (`app/dashboard/layout.tsx`) was not read for height chain.
- **Impact:** The scroll fix depends on the height chain from the dashboard
  layout down to `CampaignDetail`. A browser check is required.

### Stat refresh after retry depends on the SSE stream

- **Location:** `features/campaigns/shared/use-campaign-status-stream.ts`;
  `campaign-detail.tsx:handleRetry`, `handleRetryFailed`.
- **Fact:** `source.onerror` closes the EventSource and sets it to `null`, with
  no reconnect. A reconnect happens only when `generation` changes
  (`reconnectKey`). Terminal statuses (`SENT`, `FAILED`, `PARTIALLY_FAILED`)
  close the stream. After a retry, `load()` refetches the original campaign,
  and `reconnectKey` reopens the stream.
- **Status:** Confirmed (code). Behavior under a real dropped connection is
  **Unknown** until tested.
- **Evidence or limitation:** Backend `streamStatus` times out after 5 minutes
  (`SseEmitter(300_000L)`) and sends a status event per loop.
- **Impact:** A stream that drops after `onerror` leaves stats stale until a
  reload or retry. The original's counters after retry come from `load()`, so
  they show the original's pre-retry values, which is expected.

### Mock divergence from the backend

- **Location:** `mocks/handlers/campaigns.ts` (`POST /api/v1/campaigns`,
  `POST /:id/retry`, `POST /:id/recipients/retry-failed`,
  `GET /:id/recipients`, `GET /:id/status/stream`).
- **Fact:** The mock accepts any create body (`Partial<Campaign>`), so it does
  not reject missing `bodyHtml` or `connectionId`. Retry handlers return `202`
  with no body and mutate the original. The recipients endpoint is implemented
  and is the only source of recipient rows in the UI.
- **Status:** Confirmed
- **Evidence or limitation:** Mock behavior is not production evidence.
- **Impact:** Any frontend change verified only against the mock could still fail
  against the real API. The mock must change with the frontend contract.

## Layer impact evidence

| Layer | Status | Evidence |
|---|---|---|
| Frontend | Affected | Body fields (`source`, `bodyJson`, `bodyHtmlImported`), retry handling, recipient table, preview footer, and scroll wrapper. |
| API | Affected | Body contract mismatch; missing `GET /recipients`; retry response lacks lineage; no `connectionId` from frontend. |
| Backend | Affected | No sanitizer in `broadcastmail-api`; no connection ownership check in `CampaignService.createCampaign` (as read); no recipients GET. |
| Database | Not affected | `body_html`, `retry_of_campaign_id` (V8), and unique index already exist. No schema change was found necessary for the body contract. |
| Operations | Unknown | Not inspected. Out of scope per `questions.md`. |
| Testing | Affected | Mock must match backend. `CampaignControllerTest` exists in the backend; not read for retry or body cases. Browser verification not run. |

## Questions answered

- **Question:** Which backend changes are required before the frontend body change can ship?
  **Answer:** The backend already accepts and returns `bodyHtml` only. The
  frontend must move to `bodyHtml` (create, PATCH, and detail read). Backend
  changes are not required for the body field itself. The backend does need
  server-side sanitization on save (none found), and the create path needs a
  decision about connection ownership.
  **Evidence:** `CreateCampaignRequest`, `UpdateCampaignRequest`,
  `CampaignResponse`, `V1__init.sql`; absence of sanitizer in `broadcastmail-api/src/main`.

- **Question:** Does the frontend need to send `connectionId` on create, and where should it come from?
  **Answer:** Yes. The backend requires it (`@NotNull`) and the frontend never sends it. No frontend source for it exists today. The composer and the create-campaign flow do not read a connection from state or session in the files searched.
  **Evidence:** `CreateCampaignRequest.connectionId`; grep for `connectionId` in frontend returns no hits.
  **Status:** Source of the value (account's connection) is **Unknown** from the frontend side; not searched beyond the campaign features.

- **Question:** How should the UI handle a retry that returns an error or no new campaign?
  **Answer:** The backend returns `202` with an empty body when `/retry` restarts resolution on the same campaign (zero failed recipients). It returns `202` with a retry `CampaignResponse` when a retry campaign was created. Errors: `409` (`CampaignNotRetryableException`) for wrong state or second retry, `404` for missing campaign. The frontend currently treats every error the same way.
  **Evidence:** `CampaignController.retryCampaign`, `retryFailed`; `CampaignConfirmService`; `GlobalExceptionHandler` (`CONFLICT`).

- **Question:** Which mock behaviors must change to match the backend?
  **Answer:** (a) `POST /:id/retry` and `POST /:id/recipients/retry-failed` must return the retry campaign (not `202` empty) and must not mutate the original's recipients. (b) `POST /api/v1/campaigns` must require `bodyHtml` and `connectionId`. (c) `GET /:id/recipients` must be removed or marked as not-existent, pending the Engineering decision. (d) The mock must return `409` for a second retry and wrong-state retry.
  **Evidence:** `mocks/handlers/campaigns.ts` lines for those routes; backend controller and service.

- **Question:** What manual flow proves the detail page scrolls and the stats update?
  **Answer:** Not answered here. Requires a running app and a browser session. Proposed check is at the Verification section of `relevance.md`.
  **Status:** Unknown (not executed).

## Questions still open

- **Question:** Keep the generic unsubscribe footer in the preview?
  **Reason:** Product decision. Also depends on whether a footer is added at send time (worker not inspected).
  **Owner:** Product

- **Question:** Allow links in the preview iframe?
  **Reason:** Product / Engineering decision. The iframe is `sandbox=""` today, so links are inert.
  **Owner:** Product / Engineering

- **Question:** One meaning for "Delivered" across stat card, recipient tab, and header?
  **Reason:** Product decision. Current card and tab disagree (`deliveredCount` vs `deliveredCount - openedCount`).
  **Owner:** Product

- **Question:** Build `GET /api/v1/campaigns/{id}/recipients` or drop the table?
  **Reason:** Endpoint absent in `broadcastmail-api`. Decision needed.
  **Owner:** Engineering

- **Question:** Does the backend enforce connection ownership on create?
  **Reason:** Not found in `CampaignService`. Did not check `ConnectionRepository` usage across the request path or the security layer.
  **Owner:** Backend

- **Question:** Is there a backend sanitizer in `broadcastmail-common` or `broadcastmail-worker`?
  **Reason:** Only `broadcastmail-api/src/main` was searched.
  **Owner:** Backend

- **Question:** Does the scroll fail in the browser?
  **Reason:** Static analysis only. Needs a browser check and the dashboard layout height chain.
  **Owner:** Frontend

- **Question:** Does the SSE stream recover after a dropped connection?
  **Reason:** `onerror` closes without reconnecting; behavior under real disconnects not tested.
  **Owner:** Frontend

## Research conclusion

The body contract is the most consequential finding. The frontend uses three
body fields and a `source` discriminator; the backend uses one (`bodyHtml`),
and its create request requires `connectionId`, which the frontend never sends.
Against the real API, the current frontend create payload would be rejected.
The retry API returns the new retry campaign, but the frontend discards it and
the response carries no lineage, so no link can be built from it today. The
recipient table depends on an endpoint the backend does not define. Retry
semantics (failed-only, one retry per original, `409` on repeat) match the
decided behavior on the backend. Sanitization is client-only in what was read.
Scroll and stat refresh are unverified: the scroll cause is likely a clipped
height chain, and no browser run was done.

## Research status

- Blocked: open product decisions (four items in `questions.md`) and the
  recipients endpoint decision block the design of the table and the footer.
  Technical questions are answered except browser verification and the
  backend ownership/sanitizer checks, which need a wider backend search or
  backend owner confirmation. Browser verification needs a running app.
