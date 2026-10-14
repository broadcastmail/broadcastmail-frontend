# Campaign Detail Fixes — Structure Prompt

Use this prompt in a fresh context after the Design phase has been approved.

```text
We are starting the Structure phase for the Campaign Detail Fixes feature.

Read these approved artifacts first:

- docs/agent-work/campaign-detail-fixes/questions/questions.md
- docs/agent-work/campaign-detail-fixes/research/research.md
- docs/agent-work/campaign-detail-fixes/design/design.md

Use this output template:

- docs/agent-work/_templates/structure/structure.md

Do not modify application code.
Do not create plan.md yet.
Do not start implementation.

## Structure objective

Translate the approved Design into a precise implementation structure for the
frontend repository and the related backend boundaries.

The Structure document must explain:

- which files and modules change;
- what each module owns;
- which types and API contracts cross boundaries;
- how dependencies are allowed to flow;
- how the work is divided into vertical slices;
- how existing campaigns and contracts remain compatible.

Do not repeat the full Research report or redesign decisions that were already
approved.

## Approved design decisions

### A. HTML sanitizer (broadcastmail-api)

- `CampaignService` owns a Jsoup-based sanitizer applied on `createCampaign`
  and `updateCampaign`. Not in `broadcastmail-common`.
- Sanitization strips disallowed elements silently; it does not reject.
- Client-side DOMPurify remains as defense-in-depth.

### B. `connectionId` on create

- `connectionId` is removed from `CreateCampaignRequest`.
- `CampaignService.createCampaign` calls
  `connectionRepository.findByAccountId(accountId)` to derive it.
- Missing connection throws `ConnectionNotFoundException` → `404`.
- Frontend `CreateCampaignPayload` removes the field.

### C. Recipient table endpoint

- `GET /api/v1/campaigns/{id}/recipients?status=&page=&size=` is built in the
  backend.
- Response: `PageResponse<RecipientResponse>` (`id`, `email`, `status`,
  `sentAt`, `deliveredAt`, `openedAt`).
- `status=DELIVERED` returns recipients with `DELIVERED` or `OPENED`.
- All other status values are exact matches.
- `404` when the campaign is not found or not owned by the caller.

### D. "Delivered" label meaning

- "Delivered" means `deliveredCount` everywhere (stat card, header, recipient tab).
- The recipient tab labelled "Delivered" shows recipients with status `DELIVERED`
  or `OPENED`, with count = `deliveredCount`.
- The tab filter sends `status=DELIVERED`; the backend interprets it as
  "delivered or opened".

### E. Retry lineage in `CampaignResponse`

- `retryOfCampaignId: UUID | null` is added to `CampaignResponse`.
- No extra query needed; the field is already on the `Campaign` entity.
- The detail page renders **"Retry of: \<original name\>"** when
  `retryOfCampaignId` is non-null.
- The retry button is hidden when `retryOfCampaignId` is non-null.

### F. Preview body source

- The preview source switches from `source` / `bodyJson` / `bodyHtmlImported`
  to `campaign.bodyHtml` directly.
- `wrapEmailShell` is kept; the generic unsubscribe placeholder is accepted.

### G. Detail page scroll

- Fix the height chain in `app/dashboard/campaigns/[id]/page.tsx`.
- Replace the `h-full min-h-0 overflow-hidden` wrapper with a flex-column
  pattern consistent with other dashboard pages, or remove `overflow-hidden`
  and let `CampaignDetail` own its scroll.
- Must be verified in browser after the change.

### Retry chain depth

- Only original campaigns (`retryOfCampaignId` is null) can be retried.
- Backend guard: `CampaignConfirmService.createRetryCampaign` adds a check
  before `hasRetryCampaign` that throws `CampaignNotRetryableException` (→ `409`)
  if the caller tries to retry a retry.
- The frontend must distinguish `409` (not retryable / already retried) from
  transient errors and show an appropriate message.

## Approved API contracts

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

## Approved mock changes

- `POST /api/v1/campaigns` — require `bodyHtml`; remove `source` / `bodyJson` /
  `bodyHtmlImported` / `connectionId`.
- `POST /:id/retry` and `POST /:id/recipients/retry-failed` — return `202` with
  a retry `CampaignResponse` (including `retryOfCampaignId`); do not mutate the
  original's recipients.
- `POST /:id/retry` — return `409` on a second retry or wrong status.
- `GET /:id/recipients` — align response shape with `RecipientResponse`.
- `GET /api/v1/campaigns` and `GET /api/v1/campaigns/:id` — include
  `retryOfCampaignId` in returned campaigns.

## Relevant frontend areas

- `features/campaigns/api/`
- `features/campaigns/detail/`
- `features/campaigns/new/compose/`
- `lib/types/` (campaign types)
- `lib/campaigns/compose/`
- `app/dashboard/campaigns/[id]/`
- `mocks/handlers/campaigns.ts`

The production backend is in `../broadcastmail-api`. Do not invent backend file
paths beyond what Research has confirmed. Describe backend work as
service-level boundaries.

## Required Structure analysis

1. Inspect only the relevant files identified by Research and Design.
2. Map each affected file to one cohesive responsibility.
3. Identify additions, modifications, moves, and removals.
4. Define the affected frontend types without writing full implementation code.
5. Define the API boundaries for `CreateCampaignRequest`, `CampaignResponse`,
   and `GET /:id/recipients`.
6. State which module owns:
   - campaign body state in the compose step;
   - preview rendering;
   - retry action and error handling;
   - recipient table data fetching;
   - mock implementations.
7. State allowed imports and dependencies that must not be introduced.
8. Divide the implementation into vertical slices. Each slice must include:
   - Frontend
   - API
   - Backend
   - Database
   - Verification
9. Explain compatibility behavior for:
   - existing drafts (body field rename);
   - existing mocks versus production behavior;
   - mock handler changes that require a dev-server restart.

## Important constraints

- Do not send `connectionId` from the frontend; the backend derives it.
- Do not use `useEffect` for initial data loading; the repository forbids it.
- Do not treat mock behavior as production evidence.
- Do not add horizontal phases; prefer vertical slices testable end to end.
- Do not open any product decisions already approved in Design.
- Browser verification is required for the scroll fix (G); do not mark it done
  without it.
- Mock handler changes take effect only after a dev-server restart
  (instrumentation.ts runs once).

## Required output process

First, present the proposed Structure for review. If a boundary decision is
still unresolved, ask only focused questions that affect:

- module ownership;
- API shape;
- persistence boundary;
- dependency direction;
- migration compatibility;
- vertical slice order.

Do not ask again about product behavior or design decisions already approved.

After I approve the Structure, write:

docs/agent-work/campaign-detail-fixes/structure/structure.md

Use the structure:

- Approved design reference
- Files and modules
- Types and interfaces
- Dependency direction
- API structure
- Vertical slices
- Migration and compatibility
- Structure approval

Keep the final Structure document concise and implementation-oriented. Do not
write implementation code, plan tasks, or modify application files.
```

## Structure gate

Do not proceed to the Plan phase until the human approves:

- affected files and module responsibilities;
- ownership and dependency direction;
- API and persistence boundaries;
- vertical slice order;
- migration and compatibility behavior.
