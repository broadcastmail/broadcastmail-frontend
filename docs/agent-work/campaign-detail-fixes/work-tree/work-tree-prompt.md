# Campaign Detail Fixes — Work Tree Prompt

Use this prompt in a fresh context after the Campaign Detail Fixes Plan has
been approved.

```text
We are starting the Work Tree phase for the Campaign Detail Fixes feature.

Read these approved artifacts:

- docs/agent-work/campaign-detail-fixes/questions/questions.md
- docs/agent-work/campaign-detail-fixes/research/research.md
- docs/agent-work/campaign-detail-fixes/design/design.md
- docs/agent-work/campaign-detail-fixes/structure/structure.md
- docs/agent-work/campaign-detail-fixes/plan/plan.md

Use this output template:

- docs/agent-work/_templates/work-tree/work-tree.md

Do not redesign the approved feature.
Do not modify application code while creating the initial Work Tree.
Do not repeat the full Research, Design, Structure, or Plan documents.

## Work Tree objective

Track implementation of the approved four-slice campaign detail fixes one
vertical slice at a time:

1. Scroll fix — unclip the detail page height chain.
2. Body contract — `Campaign` type, payload, autosave, draft init, and detail
   preview aligned to `bodyHtml`; mock fixtures and POST handler updated.
3. Retry lineage — `retryOfCampaignId` on `Campaign`, retry functions return
   the new campaign, navigate to it, update title and retry-button visibility,
   distinguish 409; mock retry handlers updated.
4. Recipient table — DELIVERED tab count fix, `sentAt` on `CampaignRecipient`,
   mock DELIVERED filter updated.

## Required work items

For each Plan step, create small actionable work items with:

- exact frontend files from the approved Plan;
- dependency on earlier steps;
- validation method;
- completion condition.

Track mock changes beside the frontend behavior they support. Do not invent
backend repository paths; use the service boundaries from the approved Plan.

## Context boundary

Create the initial `work-tree.md` before modifying application code. After the
Work Tree is created and approved, this same context may continue into
implementation; a new context is optional.

For each implementation slice:

1. Start with the first unblocked Work Tree item.
2. Modify only the files and boundaries allowed by the approved Plan.
3. Run the item's targeted validation.
4. Update `work-tree.md` with status, evidence, decisions, and blockers.
5. Continue to the next unblocked item only after the checkpoint is recorded.

Start a fresh implementation context only if the current context becomes too
large, the work moves to a substantially different slice, or a clean context
is needed. A new context must read the current Work Tree and approved Plan
before changing code.

## Execution rules

- Start with Step 1 (scroll fix) — it is independent and requires browser
  verification before it can be marked done.
- Steps 2 and 3 modify `lib/types/campaigns.ts`; they must be strictly
  sequential — Step 3 cannot begin until Step 2's tsc is clean.
- Step 4 is independent of Step 3 but must follow Step 2 to avoid interleaved
  type file changes.
- Update status when work starts, completes, or becomes blocked.
- Record evidence for type-checks, builds, and manual browser flows.
- Do not silently change body field semantics, retry navigation behavior, or
  recipient status filtering logic.
- Do not use the Work Tree to introduce unrelated refactors.
- Preserve the `useEffect` and data-fetching constraints from the Plan.

## Completion and failure rules

- Mark a Work Tree item complete only when its done condition is met.
- If validation fails, fix it only when the fix stays within the current item
  scope.
- If the failure requires a scope, ownership, dependency, or architecture
  change, stop and record a blocker instead of working around it.
- Do not mark a blocked item complete.
- A small file adjustment is allowed when it preserves the approved
  responsibility and dependency direction.
- Update `work-tree.md` after implementation, validation, blockers, and
  approved decisions.

## Discovery protocol

If implementation reveals a problem:

- small clarification: record it under Decisions during implementation;
- changed file detail without changed scope: update the relevant work item;
- changed step order, ownership, validation, or scope: stop and recommend a
  Plan revision;
- changed Design or Structure decision: return to that phase before coding;
- reusable process improvement: use
  `docs/agent-work/_templates/work-tree/addenda/addendum-decision.md`.

The AI may identify and recommend improvements, but the human approves
substantive process or scope changes. Record ordinary progress in statuses,
work items, checkpoints, and decisions. Add revision history only if the Work
Tree structure, execution order, scope, or process changes materially.

## Required output

First create:

docs/agent-work/campaign-detail-fixes/work-tree/work-tree.md

Do not modify application code during this initial creation.

Use:

- Status
- Work items
- Checkpoints
- Decisions during implementation
- Blockers
- Final verification
- Completion notes

Keep the Work Tree operational and concise. Do not write implementation code in
the Work Tree file. After the Work Tree is approved, implement the approved
Plan slices and keep the tracker current.
```

## Work Tree gate

Do not mark the feature complete until all Plan steps have evidence, blockers
are resolved or explicitly accepted, final verification is recorded, and the
human reviews the completion notes.
