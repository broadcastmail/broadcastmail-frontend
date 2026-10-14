# Campaign Detail Fixes — Plan Prompt

Use this prompt in a fresh context after the Structure phase has been approved.

```text
We are starting the Plan phase for the Campaign Detail Fixes feature.

Read these approved artifacts:

- docs/agent-work/campaign-detail-fixes/questions/questions.md
- docs/agent-work/campaign-detail-fixes/research/research.md
- docs/agent-work/campaign-detail-fixes/design/design.md
- docs/agent-work/campaign-detail-fixes/structure/structure.md

Use this output template:

- docs/agent-work/_templates/plan/plan.md

Do not modify application code.
Do not start implementation.
Do not redesign or reopen approved product, design, or structure decisions.

## Plan objective

Convert the four approved vertical slices into small, ordered, independently
verifiable implementation steps. The plan must cover:

1. Scroll fix — unclip the detail page height chain.
2. Body contract — align `Campaign` type, payload, autosave, draft init, detail
   preview, and mock to `bodyHtml`; remove `source`/`bodyJson`/`bodyHtmlImported`;
   backend drops `connectionId`, derives it server-side, adds sanitizer.
3. Retry lineage — `retryOfCampaignId` on `Campaign`, retry functions return the
   new campaign, navigate to it, update title and retry-button visibility,
   distinguish 409; backend adds `retryOfCampaignId` to response, retry-of-retry
   guard.
4. Recipient table — DELIVERED tab count fix, `sentAt` on `CampaignRecipient`,
   mock DELIVERED filter, backend `GET /{id}/recipients` endpoint.

## Plan length and concision

Keep each step to one short paragraph plus scope, files, dependencies,
validation, and done condition. Remove repeated Research, Design, and Structure
content. Compress risks into a table. Keep backend steps at service-boundary
level; do not write implementation code.

## Required step details

For every step include:

- **Scope** — what changes and why (one sentence)
- **Files** — exact paths from the approved Structure
- **API contract or client changes** — if any
- **Backend service boundary** — if applicable; name only, no file paths invented
- **Depends on** — prior step numbers, or None
- **Validation** — the smallest targeted command or browser check
- **Done when** — objective completion criterion

## Plan-wide enforcement rules to include

The Plan must state these rules explicitly:

- Every step traces to the approved Design or Structure.
- Steps ordered by their dependencies.
- Every step has validation and an objective done condition.
- Do not reopen approved decisions.
- Preserve existing contracts unless an approved change requires otherwise.
- No unrelated refactors or speculative cleanup.
- Mock updates are included in the same step as the frontend behavior they support.
- Do not begin implementation before the Plan is approved.

## Technical constraints to include

Derive these from the repository and approved artifacts — mark them as
project-specific where confirmed:

- Reuse existing API clients, schemas, hooks, and UI primitives.
- Preserve type safety; no unnecessary type assertions or silent fallbacks.
- Do not use `useEffect` for data fetches triggered by user actions (repo rule).
- `buildPayload` in `use-campaign-autosave.ts` must not grow to accept new
  non-body concerns — its responsibility is body-only.
- Mock handler changes in `mocks/handlers/campaigns.ts` and `mocks/fixtures/index.ts`
  take effect only after a dev-server restart (instrumentation.ts runs once at
  startup).
- Run only existing targeted validation commands: `npx tsc --noEmit`, the dev
  server, browser smoke test.
- Backend steps are in `../broadcastmail-api`; do not invent file paths for it.

## Sequencing requirements

- Slice 1 (scroll) is independent; implement it first.
- Slice 2 (body contract) must precede Slice 3 (retry lineage) because both
  modify `lib/types/campaigns.ts`.
- Slice 4 (recipient table) is independent but follows Slices 2–3 to avoid
  interleaved type file changes.
- Frontend and backend steps within a slice can proceed in parallel; the mock
  covers frontend work until backend ships.
- Browser verification of the scroll fix is required before marking Step 1 done.

## Addendum review

After drafting the implementation steps, review whether any reusable Plan
addendum applies globally or per step using
`docs/agent-work/_templates/plan/addenda/addendum-decision.md`. Make an
evidence-based recommendation; present it for human approval before applying.
Do not create an addendum registry or empty addendum sections.

## Required output

Write:

docs/agent-work/campaign-detail-fixes/plan/plan.md

Use the structure from the output template exactly:

- Scope
- Plan-wide enforcement rules
- Technical constraints
- Implementation steps
- Risks and checkpoints
- Plan readiness checklist
- Plan improvement protocol
- Out of scope
- Plan approval
- Plan revision history

The Plan must not contain implementation code or repeat the full Research,
Design, or Structure content. Before writing the final file, ask only focused
questions if an unresolved issue changes step order, ownership, scope, or
validation.
```

## Plan gate

Do not proceed to Work Tree or implementation until the human approves:

- ordered steps and dependencies;
- exact frontend files and external service boundaries for every step;
- validation for every step;
- risks and checkpoints;
- out-of-scope items.
