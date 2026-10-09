# Manual Recipient Audience — Backend Work Tree Prompt

Use this prompt to start the backend implementation context.

```text
We are starting the backend Work Tree phase for the Manual Recipient Audience
feature.

Read these approved artifacts:

- docs/agent-work/manual-recipent-audience/plan/plan.md
- docs/agent-work/manual-recipent-audience/structure/structure.md
- docs/agent-work/manual-recipent-audience/backend/work-tree.md

Do not redesign the feature.
Do not modify frontend code.
Do not reopen approved Plan or Structure decisions.

## Scope

Backend-only work from Plan Steps 1, 3, and 5:

1. V8 migration and Campaign PATCH audience fields.
2. AudienceController real service implementation (replace return null stubs).
3. CampaignConfirmService gating and ResolutionService manual/all branch.

## Execution rules

- Start with the first unblocked Work Tree item.
- Modify only the service boundaries described in the Plan.
- Run each item's validation before moving to the next.
- Update work-tree.md with status, evidence, decisions, and blockers after
  each item.
- Do not mark a step complete until its validation passes and is recorded.
- BatchPersistenceService and CampaignRecipientRepository are out of scope —
  do not modify them.
- audienceMode = null with non-empty filters must proceed as "filter" —
  backward-compat rule, do not break existing filter campaigns.
- CampaignConfirmServiceTest and ResolutionServiceTest must pass unchanged.

## Discovery protocol

- Small clarification → record under Decisions and continue.
- Spec is incomplete or wrong → stop and report before changing scope.
- Existing test breaks → diagnose root cause; do not skip or delete tests.
- Scope or architecture change needed → stop and recommend a Plan revision.
```
