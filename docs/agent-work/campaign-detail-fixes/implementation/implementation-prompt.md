# Campaign Detail Fixes — Implementation Prompt

Use this prompt after the Work Tree has been created and the Plan has been
approved.

```text
We are implementing the Campaign Detail Fixes feature.

Read these artifacts:

- docs/agent-work/campaign-detail-fixes/design/design.md
- docs/agent-work/campaign-detail-fixes/structure/structure.md
- docs/agent-work/campaign-detail-fixes/plan/plan.md
- docs/agent-work/campaign-detail-fixes/work-tree/work-tree.md
- <PATH TO IMPLEMENTATION CONTEXT>

The Implementation Context must be created first using:

- docs/agent-work/_templates/implementation/context-split/context-prompt.md

Read the approved Implementation Context before editing. Implement only the
item it defines. Do not implement later steps, redesign approved decisions, or
add unrelated refactors. If the context plan conflicts with the approved Plan
or Work Tree, stop and report the conflict.

## Current execution rules

- Confirm the current Work Tree item, dependencies, files, validation, and done
  condition before editing.
- Confirm the Implementation Context matches the first unblocked Work Tree item.
- Start with Step 1 (scroll fix) unless the Work Tree shows another item is
  first unblocked.
- Steps 2 and 3 both touch `lib/types/campaigns.ts`; they must be strictly
  sequential — do not begin Step 3 until Step 2's `tsc --noEmit` is clean.
- Step 4 must follow Step 2 but can proceed independently of Step 3.
- Preserve the approved body field semantics:
  - `bodyHtml` is the single HTML body field on `Campaign`;
  - `source`, `bodyJson`, and `bodyHtmlImported` are removed everywhere;
  - `buildPayload` in `use-campaign-autosave.ts` owns body fields only.
- Preserve the approved retry semantics:
  - retry functions return `Promise<Campaign>`, not `void`;
  - navigation goes to the returned campaign's id;
  - 409 is a distinct error from other failures.
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
   `docs/agent-work/campaign-detail-fixes/work-tree/work-tree.md` with
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
- Update the Work Tree after implementation, validation, blockers, and approved
  decisions.
```

## Implementation gate

Do not proceed to the next item until the current item is validated, recorded
in the Work Tree, and free of unapproved scope or architecture changes.
