# Manual Recipient Audience — Plan Prompt

Use this prompt in a fresh context after the Structure phase has been
approved.

```text
We are starting the Plan phase for the Manual Recipient Audience feature.

Read these approved artifacts:

- docs/agent-work/manual-recipent-audience/questions/questions.md
- docs/agent-work/manual-recipent-audience/questions/relevance.md
- docs/agent-work/manual-recipent-audience/reseacrh/research.md
- docs/agent-work/manual-recipent-audience/design/design.md
- docs/agent-work/manual-recipent-audience/structure/structure.md

Use this output template:

- docs/agent-work/_templates/plan.md

Do not modify application code.
Do not start implementation.
Do not redesign or reopen approved product, design, or structure decisions.

## Plan objective

Convert the approved vertical Structure into small, ordered, independently
verifiable implementation steps.

## Plan length and concision

Do not target a rigid word or page count. Produce the shortest Plan that
preserves implementation order, dependencies, validation, compatibility, and
scope boundaries.

- Remove repeated Research findings, Design reasoning, and Structure
  explanations.
- Keep each step focused on scope, files or service boundaries, dependencies,
  validation, and done criteria.
- Compress repeated risks and checkpoints instead of explaining the same risk
  in multiple steps.
- Keep backend details at the approved service-boundary level; do not turn the
  Plan into an implementation specification.
- If a step has multiple independently verifiable outcomes, split it rather
  than expanding its prose.

The plan must cover the complete audience flow:

1. Persist and restore the audience definition.
2. Implement account-scoped audience listing and filter contracts.
3. Persist filter-change decisions and handle audience-save failures.
4. Resolve manual audiences and create the existing recipient snapshot at
   confirmation.
5. Display asynchronous final status and the final valid recipient count.

## Required step details

For every step include:

- Scope
- Exact frontend files
- API contract or client changes
- Backend service boundary, when applicable
- Database boundary, when applicable
- Dependencies
- Targeted validation
- Done criteria

Use exact paths from the approved Structure where available. For the backend
and database, which are not in this repository, name the approved service
boundary without inventing file paths.

## Approved constraints to preserve

- Audience mode is `manual`, `filter`, or `all`.
- With no filters, manual mode sends only selected IDs.
- With filters, filters are the base audience; included IDs add and excluded
  IDs remove.
- Select-all without filters uses explicit IDs for v1 and is capped at 5,000.
- Selection is saved on Continue and after filter-change resolution, not during
  content autosave.
- Failed audience persistence blocks Continue and Send and remains retryable.
- Backend ownership, eligibility, quota, and the 5,000 limit are authoritative.
- Confirmation remains `202 Accepted`.
- Final recipient validity and count are resolved asynchronously.
- Existing recipient snapshot and delivery pipelines are reused.
- The unsubscribe-filtering gap and uncapped server-side select-all are out of
  scope.

## Sequencing requirements

- Establish shared types and request boundaries before wiring UI persistence.
- Implement draft persistence and restoration before send gating.
- Implement backend resolution before relying on final counts in the UI.
- Add SSE/final-count display after confirmation semantics are stable.
- Keep each step small enough to review and validate independently.
- Include mock updates alongside the frontend behavior they support.

## Addendum review

After drafting the implementation steps, review whether any reusable Plan
addendum applies globally or only to a specific step.

- Use `docs/agent-work/_templates/plan-addendum-decision.md`.
- Make an evidence-based recommendation; do not apply an addendum
  automatically.
- Present the recommendation for human approval.
- Apply an approved global addendum to the relevant Plan-wide section.
- Apply an approved step-specific addendum inside the named step.
- Keep feature-specific concerns in this feature's Plan without changing the
  reusable templates.
- Do not create an addendum registry or empty addendum sections.

## Plan improvement protocol

The AI or the human may identify a Plan improvement. The AI must explain the
issue, impact, and recommendation before changing the Plan.

- Human approval is required for changes to scope, order, ownership,
  validation, or reusable templates.
- Typo and formatting corrections do not require re-approval.
- Approved substantive changes must be recorded in the Plan revision history.
- If an improvement changes an approved Design or Structure decision, return to
  that phase before updating the Plan.

## Required output

Write:

docs/agent-work/manual-recipent-audience/plan/plan.md

Use this structure:

- Scope
- Implementation steps
- Risks and checkpoints
- Plan readiness
- Out of scope
- Plan approval
- Plan revision history

If an approved addendum requires additional content, place it in the relevant
Plan-wide section or implementation step. Do not add empty optional sections,
placeholder headings, or an addendum list.

The plan must not contain implementation code. It must not repeat the entire
Research, Design, or Structure documents.

Before writing the final plan, ask only focused questions if an unresolved
issue changes the order, ownership, scope, or validation of the work.
```

## Plan gate

Do not proceed to Work Tree or implementation until the human approves:

- ordered steps and dependencies;
- exact frontend files and external service boundaries;
- validation for every step;
- risks and checkpoints;
- out-of-scope items.
