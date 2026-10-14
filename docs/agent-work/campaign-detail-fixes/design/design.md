# Campaign Detail Fixes — Design

## Problem

The campaign detail page fails in three distinct ways against the real backend:

- **Preview is empty.** The frontend sends and reads `source` / `bodyJson` /
  `bodyHtmlImported`; the backend stores only `bodyHtml`. Create payloads sent
  without `bodyHtml` are rejected by `@NotBlank` validation.
- **Retry has no lineage.** The retry endpoint returns a new `CampaignResponse`
  but the frontend discards it. `retryOfCampaignId` is not exposed in the DTO,
  so the retry detail page cannot identify itself as a retry.
- **Recipient table returns 404.** `GET /api/v1/campaigns/{id}/recipients` has
  no mapping in the backend controller. The table only works against the mock.

Secondary problems: the page is unscrollable (layout clip), `connectionId` is
never sent on create (backend requires `@NotNull`), and sanitization is
client-only despite the documented expectation.

---

## Constraints

- No database schema changes. `body_html` and `retry_of_campaign_id` columns
  exist. The unique index on `retry_of_campaign_id` enforces one retry per
  original.
- `bodyHtml` is the only body field — decided and confirmed in
  `CreateCampaignRequest`, `UpdateCampaignRequest`, `CampaignResponse`.
- Retry: failed recipients only (bounced excluded), one retry per original, `409`
  on second attempt. All confirmed in backend.
- The worker appends a real tokenized unsubscribe footer at send time:
  `bodyHtml + "<br><br><a href=\"...\">Unsubscribe</a>"`. The frontend preview
  uses a generic placeholder; that divergence is accepted.
- `ConnectionRepository.findByAccountId` returns one connection per account
  (1:1). No frontend discovery of `connectionId` is needed.
- Affected layers: frontend and backend. Database and operations are out of
  scope.

---

## Decisions

### A. HTML sanitizer

**Decision:** Add a Jsoup-based sanitizer to `CampaignService` in
`broadcastmail-api`, applied on `createCampaign` and `updateCampaign`.

**Ownership:** `CampaignService`. No shared utility in `broadcastmail-common`
(the worker trusts already-stored HTML and does not need it).

**Invariant:** Every `bodyHtml` value stored in the database has been sanitized
server-side. Client-side DOMPurify remains as defense-in-depth.

**Failure rule:** Sanitization strips disallowed elements silently; it does not
reject the request.

---

### B. `connectionId` on create

**Decision (B1):** Remove `connectionId` from `CreateCampaignRequest`.
`CampaignService.createCampaign` calls `connectionRepository.findByAccountId(accountId)`
to derive it. If no connection exists, throw the same exception that
`CampaignFilterValidator` already throws for missing connections
(`ConnectionNotFoundException` → `404`).

**Ownership:** `CampaignService`. `CampaignResponse` keeps `connectionId` as a
read field.

**Breakage to repair:**
- `CreateCampaignRequest` DTO — remove field and `@NotNull`.
- `CampaignService.mapToEntity` — replace `request.connectionId()` with the
  looked-up value.
- `CampaignControllerTest` — remove `connectionId` from create request fixtures.
- Frontend `CreateCampaignPayload` — remove the field; update all call sites and
  mock handler.

**Invariant:** A campaign's `connectionId` always belongs to the creating
account. The ownership check is enforced by derivation, not validation.

---

### C. Recipient table endpoint

**Decision (C1):** Build `GET /api/v1/campaigns/{id}/recipients` in the backend.

**Request:** `?status=&page=&size=` (status is optional; page and size follow
Spring `Pageable` defaults).

**Response shape:** `PageResponse<RecipientResponse>` where `RecipientResponse`
carries: `id`, `email`, `status`, `sentAt`, `deliveredAt`, `openedAt`.

**Status filter semantics (see D):** When `status=DELIVERED`, the endpoint
returns recipients with status `DELIVERED` OR `OPENED` (see D). When
`status=OPENED`, it returns only `OPENED`. When omitted, all statuses are
returned.

**Ownership:** New method in `CampaignController` and `CampaignService` (or a
dedicated `CampaignRecipientService`). Reuses the existing
`CampaignRecipient` entity and repository.

**Failure rule:** `404` if the campaign does not belong to the caller's account.

---

### D. "Delivered" label meaning

**Decision (D2):** "Delivered" means `deliveredCount` everywhere — the stat
card, the detail header, and the recipient tab.

The recipient tab labelled "Delivered" shows recipients with status `DELIVERED`
**or** `OPENED`, with count = `deliveredCount`. The tab filter sends
`status=DELIVERED` but the backend treats it as "delivered or opened" (see C).

**Invariant:** One number for "Delivered" across all surfaces. `openedCount` is a
separate, additive stat (opens within delivered).

---

### E. Retry lineage in `CampaignResponse` (E2 only)

**Decision:** Add `retryOfCampaignId` to `CampaignResponse`. The field is
already on the `Campaign` entity (`retry_of_campaign_id`). No extra query.

**Frontend behavior:** When `retryOfCampaignId` is non-null, the detail page
renders the campaign title as **"Retry of: \<original name\>"** instead of
the stored `"<name> (retry)"`. The original campaign's detail page is unchanged.

**Not in scope:** A forward pointer (`retryCampaignId`) from the original to its
retry is not added in this task.

---

### F. Preview footer and body source

**Decision (F1):** Keep `wrapEmailShell` for the detail preview. The source
switches from `source` / `bodyJson` / `bodyHtmlImported` to `campaign.bodyHtml`
directly.

**Invariant:** The preview always shows the stored `bodyHtml` wrapped in a stable
HTML document with a generic unsubscribe placeholder. The stored value does not
include the worker's tokenized footer; the preview diverges from the sent email
only in that footer URL, which is accepted.

**Sandbox:** `<iframe sandbox="">` stays. Links in the preview are inert.

---

### G. Detail page scroll

**Decision:** Fix the height chain in `app/dashboard/campaigns/[id]/page.tsx`.
The current wrapper (`h-full min-h-0 overflow-hidden`) is not a flex container,
so `flex-1` on `CampaignDetail`'s root has no effect and the element has no
bounded height. Replace the wrapper with a flex-column pattern consistent with
other dashboard pages, or remove `overflow-hidden` and let `CampaignDetail` own
its scroll. Must verify in browser after the change.

---

## API contracts

### Modified: `CreateCampaignRequest`

Remove `connectionId`. All other fields unchanged.

### Modified: `CampaignResponse`

Add `retryOfCampaignId: UUID | null`. All other fields unchanged.

### New: `GET /api/v1/campaigns/{id}/recipients`

```
GET /api/v1/campaigns/{id}/recipients?status=DELIVERED&page=0&size=20

→ 200 PageResponse<RecipientResponse>
→ 404 if campaign not found or not owned by caller
```

`RecipientResponse`: `id`, `email`, `status`, `sentAt`, `deliveredAt`, `openedAt`.

`status=DELIVERED` returns recipients with status `DELIVERED` or `OPENED`.
All other status values are exact matches.

---

## Retry chain depth

**Decision:** Only original campaigns (where `retryOfCampaignId` is null) can
be retried. A retry campaign cannot be retried.

**Rationale:** Retry is for transient send failures. One retry is a reasonable
tolerance for transience. If the retry itself fails, the cause is almost
certainly persistent (bad addresses, provider rejection) and further retries
will not help.

**Backend change:** In `CampaignConfirmService.createRetryCampaign`, add a
guard before the existing `hasRetryCampaign` check:

```java
if (original.getRetryOfCampaignId() != null) {
    throw new CampaignNotRetryableException();
}
```

This returns `409` if the caller tries to retry a retry. The unique index
already prevents duplicate retries of the same original.

**Frontend:** The retry button / strip must be hidden on campaigns where
`retryOfCampaignId` is non-null, in addition to the existing status checks.

---

## Security and failure rules

- **Sanitizer:** strips disallowed HTML elements silently; never rejects.
- **connectionId:** derived from account; `ConnectionNotFoundException` if the
  account has no connection.
- **Recipients endpoint:** `404` on missing or unauthorized campaign; paginated
  to prevent large response bodies.
- **Retry `409`:** the frontend must distinguish `409` (not retryable / already
  retried) from transient errors and show an appropriate message rather than the
  generic "Couldn't retry".

---

## Mock alignment

The mock must change alongside the frontend:

- `POST /api/v1/campaigns` — require `bodyHtml`; remove acceptance of
  `source` / `bodyJson` / `bodyHtmlImported` / `connectionId`.
- `POST /:id/retry` and `POST /:id/recipients/retry-failed` — return `202` with
  a retry `CampaignResponse` (including `retryOfCampaignId`); do not mutate the
  original's recipients.
- `POST /:id/retry` — return `409` on a second retry or wrong status.
- `GET /:id/recipients` — keep; align response shape with `RecipientResponse`.
- `GET /api/v1/campaigns` and `GET /api/v1/campaigns/:id` — include
  `retryOfCampaignId` in returned campaigns.

---

## Assumptions

- `bodyHtml` in the stored campaign does not include the worker's unsubscribe
  footer; the worker appends it at send time. The preview therefore shows the
  email body plus a generic placeholder footer, not the recipient's exact email.
  This divergence is accepted.
- The account has exactly one connection (confirmed by `findByAccountId`
  signature). If the schema ever allows multiple connections, B1 breaks and
  must be revisited.
- `status=DELIVERED` returning `DELIVERED OR OPENED` is a backend interpretation
  rule (not a multi-value query param). The exact implementation — whether the
  endpoint accepts comma-separated statuses or uses a named alias — is left to
  the Structure phase.
- Browser verification of G is required; the layout fix is based on static
  class analysis only.
