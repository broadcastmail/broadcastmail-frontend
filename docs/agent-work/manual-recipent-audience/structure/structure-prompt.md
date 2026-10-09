# Manual Recipient Audience — Structure Prompt

Use this prompt in a fresh context after the Design phase has been approved.

```text
We are starting the Structure phase for the Manual Recipient Audience
feature.

Read these approved artifacts first:

- docs/agent-work/manual-recipent-audience/questions/questions.md
- docs/agent-work/manual-recipent-audience/questions/relevance.md
- docs/agent-work/manual-recipent-audience/reseacrh/research.md
- docs/agent-work/manual-recipent-audience/design/design.md

Use this output template:

- docs/agent-work/_templates/structure.md

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
- how existing drafts and contracts remain compatible.

Do not repeat the full Research report or redesign decisions that were already
approved.

## Approved audience behavior

- With no filters, manual mode sends only explicitly selected recipients.
- With filters, filters define the base audience.
- Included IDs add recipients outside the filters.
- Excluded IDs remove recipients from the filtered or account audience.
- Select-all with filters means all matching recipients, including unloaded
  pages.
- Select-all without filters is represented as explicit IDs for v1 and is
  limited to 5,000 recipients.
- Filter changes preserve additions and exclusions until the user chooses
  reapply or clear.
- Selection persists across refresh, navigation, and draft reopening.
- Audience state is saved on Continue and after filter-change resolution, not
  on every compose-content autosave.
- The backend resolves and snapshots recipients only at confirmation.
- Invalid or deleted recipients are omitted and the final valid count is
  reported.
- Failed audience persistence blocks Continue and Send and can be retried.
- The 5,000-recipient limit is enforced in the frontend and authoritatively in
  the backend.
- Confirmation remains a 202 response; the existing status stream reports
  asynchronous final status and recipient count.

## Approved design boundaries

The design extends the existing campaign PATCH contract with optional:

```ts
type AudienceMode = "manual" | "filter" | "all";

interface AudienceSelectionPayload {
  audienceMode?: AudienceMode;
  includedIds?: string[];
  excludedIds?: string[];
}
```

The audience definition must not become the frontend's final delivery list.
The backend owns account authorization, eligibility, quotas, final resolution,
and immutable recipient snapshots.

The frontend repository contains these relevant areas:

- `features/campaigns/api/`
- `features/campaigns/new/audience/`
- `features/campaigns/new/compose/`
- `features/campaigns/new/new-campaign-form.tsx`
- `features/campaigns/shared/`
- `features/campaigns/detail/`
- `lib/types/`
- `lib/schemas/`
- `mocks/`

The production backend and database are not in this repository. Do not invent
backend file paths. Describe backend work as service-level boundaries unless
the approved Research or Design provides an exact external path.

## Required Structure analysis

1. Inspect only the relevant files identified by Research and Design.
2. Map each affected file to one cohesive responsibility.
3. Identify additions, modifications, moves, and removals.
4. Define the shared campaign and audience types without writing full
   implementation code.
5. Define the PATCH, audience-list, audience-filter, confirmation, and SSE
   boundaries.
6. State which module owns:
   - local audience selection state;
   - persisted audience-definition state;
   - recipient listing;
   - recipient authorization and eligibility;
   - plan and quota enforcement;
   - final audience resolution;
   - recipient snapshots;
   - delivery status and final count.
7. State allowed imports and dependencies that must not be introduced.
8. Divide the implementation into vertical slices. Each slice must include:
   - Frontend
   - API
   - Backend
   - Database
   - Verification
9. Explain migration and compatibility behavior for:
   - existing drafts;
   - content-only autosave;
   - existing filter campaigns;
   - the unchanged 202 confirmation response;
   - the existing recipient snapshot pipeline;
   - mock behavior versus production behavior.

## Important constraints

- Do not add a dedicated audience endpoint unless the approved Design changes.
- Do not send audience IDs during continuous compose autosave.
- Do not trust frontend counts, plan checks, ownership, or eligibility.
- Do not treat mocks as evidence of production backend behavior.
- Do not place feature behavior in `lib` if it belongs in the campaign feature.
- Do not create horizontal phases such as “frontend first, backend second.”
- Prefer the smallest complete vertical slices that can be verified end to end.
- Keep true uncapped server-side select-all without filters out of v1.
- Keep the unrelated unsubscribe-filtering gap out of scope.

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

docs/agent-work/manual-recipent-audience/structure/structure.md

Use the structure:

- Approved design
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
