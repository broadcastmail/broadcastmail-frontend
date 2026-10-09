# Manual Recipient Audience — Implementation Prompt

Use this prompt after the Work Tree has been created and the Plan has been
approved.

```text
We are implementing the Manual Recipient Audience feature.

Read these artifacts:

- docs/agent-work/manual-recipent-audience/design/design.md
- docs/agent-work/manual-recipent-audience/structure/structure.md
- docs/agent-work/manual-recipent-audience/plan/plan.md
- docs/agent-work/manual-recipent-audience/work-tree/work-tree.md
- <PATH TO IMPLEMENTATION CONTEXT>

The Implementation Context must be created first using:

- docs/agent-work/_templates/implementation-context-prompt.md

Read the approved Implementation Context before editing. Implement only the
item it defines. Do not implement later steps, redesign approved decisions, or
add unrelated refactors. If the context plan conflicts with the approved Plan
or Work Tree, stop and report the conflict.

## Current execution rules

- Confirm the current Work Tree item, dependencies, files, validation, and done
  condition before editing.
- Confirm the Implementation Context matches the first unblocked Work Tree
  item.
- Start with Step 1, Shared types and API contract, unless the current Work
  Tree shows that another item is the first unblocked item.
- Preserve the approved audience semantics:
  - `manual`, `filter`, and `all` modes;
  - included and excluded recipient IDs;
  - 5,000-recipient limit;
  - explicit audience persistence rather than content autosave;
  - backend-owned authorization, resolution, quotas, and snapshots.
- Keep mock changes beside the frontend behavior they support.
- Do not invent backend repository paths.
- Follow the Plan's `useEffect`, data-fetching, type-safety, and API-client
  constraints.

## Discovery handling

- Small clarification: record it in Work Tree decisions.
- File-level adjustment without scope change: update the current item.
- Scope, order, ownership, or validation change: stop and recommend a Plan
  revision.
- Design or Structure change: return to that phase before coding.

## Completion for the current item

After editing:

1. Run the item's targeted validation.
2. Review the diff and changed dependency edges.
3. Report changed files and validation results.
4. Update
   `docs/agent-work/manual-recipent-audience/work-tree/work-tree.md` with
   status, evidence, decisions, and blockers.
5. Mark the item complete only when its done condition is met.
6. Stop before the next Work Tree item.

## Completion and failure rules

- If validation fails, fix it only when the fix stays within the current item
  scope.
- If the failure requires a scope, ownership, dependency, or architecture
  change, stop and record a blocker instead of working around it.
- Do not mark a blocked item complete.
- A small file adjustment is allowed when it preserves the approved
  responsibility and dependency direction.
- Update the Work Tree after implementation, validation, blockers, and
  approved decisions.
```

## Implementation gate

Do not proceed to the next item until the current item is validated, recorded
in the Work Tree, and free of unapproved scope or architecture changes.
