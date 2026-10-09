# Manual Recipient Audience — Design

## Decision summary

Audience selection (mode, included IDs, excluded IDs) is added to the existing
campaign `PATCH` contract. The frontend saves audience state only on explicit
user actions (Continue, filter-change dialog confirmation). The backend worker
gains a new resolution branch for manual ID lists. `AudienceController` is
implemented as part of this feature. Pure select-all without filters resolves
as an explicit ID list for v1 (5,000-recipient cap). Confirmation semantics and
snapshot creation are unchanged.

## Problem

Audience selection — explicit recipient IDs, exclusions, and select-all mode —
exists only in browser memory. It is not persisted in any draft save, not
carried through the send path, and not resolvable by the worker. Reopening a
draft discards all manual selections. The production `AudienceController`
returns `null`. The worker has no resolution path for manual ID lists.

## Goals

- Persist audience mode (`manual`, `filter`, `all`), `includedIds`, and
  `excludedIds` as part of the campaign draft.
- Restore the full audience definition when a draft is reopened.
- Enforce the 5,000-recipient manual-selection limit in both frontend and backend.
- Resolve manual-ID audiences at confirmation time via a new worker code path.
- Implement `GET /api/v1/audience/list` and `GET /api/v1/audience/filters`.
- Survive filter changes by preserving additions and exclusions until the user
  explicitly clears them.

## Non-goals

- True server-side select-all without filters (deferred past v1; the 5,000 cap
  makes an explicit-ID list feasible for now).
- Fixing the pre-existing unsubscribe filtering gap in `ExternalRecipientQueryService`.
- Changing confirmation response shape or SSE contract.
- Rate limiting or request-size increases beyond the existing 2 MB default.
- Scheduled or recurring campaigns.

> **Scope additions (approved 2026-10-06)**
> - Implement `GET /api/v1/audience/list` and `GET /api/v1/audience/filters`
>   (AudienceController stubs → real implementations).
> - Wire the post-confirmation SSE stream (`/campaigns/:id/status/stream`) on
>   the frontend so the confirmation page displays the final valid recipient
>   count after async resolution.

## Chosen design

### Audience model

```
Final audience = (base audience + includedIds) − excludedIds

audienceMode=manual  → base = ∅;             includedIds required; capped at 5,000
audienceMode=filter  → base = filter results; includedIds add outside the filter;
                                              excludedIds remove from the filter result
audienceMode=all     → base = all account;   stored as explicit includedIds ≤ 5,000 (v1);
                                              pure select-all without cap is deferred
```

### Persistence boundary

Audience state is saved to the backend on two triggers only:

1. **Continue** — the user presses Continue from the audience step.
2. **Filter-change confirmation** — the user resolves the "reapply or clear"
   dialog after editing a filter.

The continuous autosave running during the compose step does not re-send
`includedIds` or `excludedIds`. The audience definition is treated as set once
per step-transition, not re-derived from content edits.

### API contract change

`PATCH /api/v1/campaigns/:id` (`UpdateCampaignRequest`) gains three optional
fields:

```
audienceMode  : "manual" | "filter" | "all"   (nullable; absent means unchanged)
includedIds   : string[]                       (external user IDs; max 5,000)
excludedIds   : string[]                       (external user IDs)
```

These are replace-all on each save, transactionally consistent with filter rows
in the same PATCH. If `audienceMode` is absent the audience definition is not
touched.

### AudienceController implementation

`GET /api/v1/audience/list` returns a cursor-paginated list of external
recipients for the authenticated account, optionally filtered by campaign
filter predicates passed as query parameters.

`GET /api/v1/audience/filters` returns the schema-derived filter column
definitions for the account's external data source.

Both endpoints replace the current `return null` stubs with real service
implementations backed by the external Supabase connection.

### Resolution at confirmation

`ResolutionService` gains a branch based on `audienceMode`:

- `filter` (existing) — queries external DB by filter predicates.
- `manual` — queries external DB for only the `includedIds`, then subtracts
  `excludedIds`.
- `all` — treated identically to `manual` for v1 (explicit IDs are stored).

The worker reads the audience definition from the campaign record at resolution
start. The snapshot behavior (`campaign_recipients`, idempotency key, outbox
entries) is unchanged.

### Filter-change dialog

When the user edits a filter while `includedIds` or `excludedIds` are non-empty:

1. The filter PATCH fires immediately (existing debounce behavior).
2. The UI blocks Continue until the dialog is resolved.
3. **Reapply** — additions and exclusions are preserved; the audience PATCH is
   sent with the existing IDs and the new `audienceMode`.
4. **Clear** — `includedIds` and `excludedIds` are emptied in local state; the
   audience PATCH is sent with empty arrays.

No audience PATCH fires until the user makes a choice.

### Failed audience persistence

If the audience PATCH fails:

- Continue is blocked and the error is shown in the audience step.
- The draft can still be saved for content edits (separate PATCH with no
  audience fields).
- The user can retry Continue.
- Send is blocked if a prior audience save has never succeeded for the current
  draft (no `audienceMode` on the campaign record).

### Confirmation and final count

`POST /api/v1/campaigns/:id/confirm` is unchanged — returns `202 Accepted`.
The final valid `recipientCount` is written to `campaigns.recipient_count` by
the worker after resolution and is observable via:

- `GET /api/v1/campaigns/:id` (polling)
- `GET /api/v1/campaigns/:id/status/stream` (SSE, 5-minute timeout)

Invalid or deleted recipients are excluded automatically (absent from external
DB at resolution time). The final count reflects only resolved recipients.

## Ownership and source of truth

| Concern | Owner | Source of truth |
|---|---|---|
| Audience-definition state (in-session) | Frontend — `useAudienceRecipients` | Hook state until Continue |
| Audience-definition persistence | API — `PATCH /api/v1/campaigns/:id` | `campaigns` table (`audience_mode`, `included_ids`, `excluded_ids`) |
| Recipient list for UI | API — `GET /api/v1/audience/list` | External Supabase connection |
| Filter column definitions | API — `GET /api/v1/audience/filters` | External Supabase schema |
| Preview count | API — `GET /api/v1/campaigns/:id/preview` | Derived from persisted filters (or ID count for manual mode) |
| Recipient authorization/eligibility | API — `accountId` binding on all endpoints | API key → account |
| Plan feature enforcement | API — `CampaignConfirmService` | Account plan record |
| Recipient quota enforcement | Worker — `ResolutionService` per-batch | Account usage in rolling 30-day window |
| 5,000-selection limit | Frontend (UX prevention) + API (PATCH validation) | Frontend state; PATCH contract |
| Final audience resolution | Worker — `ResolutionService` | External Supabase DB |
| Immutable recipient snapshots | Worker — `BatchPersistenceService` | `campaign_recipients` table |
| Delivery records and send status | Worker + Outbox | `campaign_recipients.status`, `outbox` |

## Contracts

### Types and data

```ts
// Audience mode stored on the campaign and carried in PATCH
type AudienceMode = "manual" | "filter" | "all";

// Fields added to UpdateCampaignPayload (all optional)
interface AudienceSelectionPayload {
  audienceMode?: AudienceMode;
  includedIds?: string[];   // external user IDs, max 5,000
  excludedIds?: string[];   // external user IDs
}

// Campaign type gains these fields (nullable for existing drafts)
interface Campaign {
  // ...existing fields...
  audienceMode: AudienceMode | null;
  includedIds: string[] | null;
  excludedIds: string[] | null;
}

// Audience list response
interface AudienceListResponse {
  recipients: AudienceRecipient[];
  nextCursor: string | null;
  total: number;
}

interface AudienceRecipient {
  externalUserId: string;
  email: string;
  // Additional schema columns as key-value pairs
  [key: string]: unknown;
}
```

### API

```
PATCH /api/v1/campaigns/:id
Request (additions only — all fields optional):
  audienceMode  : "manual" | "filter" | "all"
  includedIds   : string[]   // max 5,000; 400 if exceeded
  excludedIds   : string[]
Response: 200 with updated Campaign; 400 if includedIds.length > 5,000

GET /api/v1/audience/list
Query: cursor?, limit?, filters? (encoded campaign filter predicates)
Response: AudienceListResponse (cursor-paginated)
Auth: accountId from API key principal

GET /api/v1/audience/filters
Response: FilterColumn[] (schema-derived column definitions)
Auth: accountId from API key principal

POST /api/v1/campaigns/:id/confirm
Request/Response: unchanged (202 Accepted, no body)
```

## Invariants and safety rules

- `includedIds` and `excludedIds` are validated against the account's
  `accountId` at PATCH time — no cross-account IDs accepted.
- `includedIds.length > 5,000` is rejected at PATCH with HTTP 400.
- `audienceMode=manual` with empty `includedIds` is a valid draft state
  (zero recipients); it is not rejected at PATCH but blocks confirmation.
- `audienceMode=filter` requires at least one filter at confirmation (existing
  plan-feature check).
- Audience PATCH does not fire during the compose-step autosave; IDs are not
  resent unless the user explicitly returns to the audience step.
- Worker resolution reads `audienceMode` at resolution start; if `null` and no
  filters, the campaign transitions to `FAILED`.
- `campaign_recipients` is written idempotently — `ON CONFLICT DO NOTHING`
  prevents duplicates regardless of resolution retries.
- All audience-list queries are scoped to the authenticated `accountId` —
  cross-account recipient access is not possible.

## Failure and lifecycle behavior

| Situation | Behavior |
|---|---|
| Audience PATCH fails on Continue | Continue is blocked; error shown in audience step; user can retry |
| Campaign reopened with saved `audienceMode + includedIds` | UI restores selection from campaign record |
| Campaign reopened without `audienceMode` (pre-feature draft) | UI treats as no selection (existing behavior) |
| Filter changed with existing manual additions/exclusions | Continue blocked; dialog prompts reapply or clear; PATCH fires only after choice |
| `audienceMode=manual` but a recipient is deleted before confirm | Worker excludes by absence; final count reflects only resolved IDs |
| Worker resolution of manual-ID campaign fails (exception) | Campaign transitions to `FAILED`; user can retry via UI if that path exists |
| Recipient quota exceeded mid-batch | Worker transitions campaign to `FAILED`; count reflects recipients resolved before the limit |
| `audienceMode=null` at confirmation | `CampaignConfirmService` rejects with appropriate error |

## Alternatives considered

| Option | Advantages | Costs or risks | Decision |
|---|---|---|---|
| Dedicated `PUT /campaigns/:id/audience` endpoint | Clean separation of audience from campaign metadata | Two failure surfaces on Continue; filter + audience save must coordinate | Rejected — increases complexity without benefit |
| Include IDs in continuous autosave | Ensures IDs are always in sync with content | 180 KB payload on every content keystroke; no UX benefit | Rejected — targeted save is sufficient |
| True select-all without filters (server-resolved) | No 5,000 cap needed | New worker resolution path; count unknown at save time; scoping risk for v1 | Deferred — explicit-ID list under the cap is simpler for v1 |
| Store IDs as JSON column on `campaigns` | No new table needed | Less queryable; JSON array on a wide table | Acceptable alternative; new columns vs. JSON is an implementation detail |

## Assumptions and unresolved items

- **AudienceController implementation scope**: `GET /api/v1/audience/list` and
  `GET /api/v1/audience/filters` stubs must be implemented by the backend.
  Frontend audience listing is blocked on this.
- **Database schema**: Three new fields (`audience_mode`, `included_ids`,
  `excluded_ids`) must be added to the `campaigns` table, or a new
  `campaign_audience_selection` table created. Implementation decides which;
  this design is neutral on that detail.
- **Preview count for manual mode**: `GET /campaigns/:id/preview` currently
  derives count from persisted filters. For `audienceMode=manual` it should
  return `includedIds.length`. Backend must handle this branch.
- **SSE wiring on confirmation page**: Research confirmed SSE stream exists in
  the backend but the frontend `confirmCampaign` returns `Promise<void>` and
  does not connect to it. **In scope** — the frontend will connect to
  `/campaigns/:id/status/stream` after confirmation to display the final valid
  recipient count.
- **Unsubscribe filtering gap**: `ExternalRecipientQueryService` does not join
  the `unsubscribes` table at resolution time. This affects both filter-based
  and manual campaigns equally and is a pre-existing gap outside this feature's
  scope.
- **Cross-account ID validation at PATCH time**: The design requires that
  submitted `includedIds` are validated as belonging to the authenticated
  account's external connection. The mechanism (lookup against external DB or a
  local cache) is an implementation decision.

## Human approval

- Approved by: lakiidev
- Date: 2026-10-06
- Q1 Persistence contract: extend PATCH (Option A)
- Q2 Persistence timing: targeted save only (Option A)
- Q3 AudienceController: implement (in scope)
- Q4 Select-all v1: explicit IDs under 5,000 cap (Option B)
- Q5 5,000-limit enforcement: frontend + backend (Option C)
- Q6 Filter-change save timing: after dialog resolution (Option A)
- Q7 Confirmation contract: 202 unchanged; SSE/polling for count (Option A)
- Q8 Unsubscribe gap: excluded; noted as pre-existing
- Scope additions approved: AudienceController implementation; SSE wiring on
  confirmation page.
- Remaining risks: AudienceController requires implementing the external
  Supabase query layer which has no prior service implementation to reference.
