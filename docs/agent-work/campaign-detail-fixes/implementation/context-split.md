# Campaign Detail Fixes — Context Split Recommendations

Use these recommendations alongside:

```text
docs/agent-work/campaign-detail-fixes/implementation/implementation-prompt.md
```

One Implementation Context document per step is required before implementing
that step. Create and approve each context plan before editing code for it.

---

## Step 1 — Scroll fix

**Recommended context:** Continue in current context (Work Tree creation
context, or implementation-prompt context).

**Reason:** One file, one CSS class change. No type changes, no hook reads, no
state wiring. The context is not burdened by this item; a fresh context gains
nothing and loses the Work Tree state already loaded.

**Context file to create:** not required for this step — scope is fully
specified in the Plan and Work Tree. Proceed directly with the implementation
prompt.

---

## Step 2 — Body contract

**Recommended context:** Continue in current context after Step 1 is done,
OR start a fresh context.

**Reason:** Seven files touched. If the current context has accumulated large
tool output from Step 1's browser verification, a fresh context is cleaner.
If Step 1 was trivial and the context is light, continue without a reset.

**Context file to create:**
`docs/agent-work/campaign-detail-fixes/implementation/step-2-context.md`

Create it using:
`docs/agent-work/_templates/implementation/context-split/context-prompt.md`

**Key scope notes for the context plan:**
- `buildPayload` in `use-campaign-autosave.ts` must not grow beyond body
  fields; reinforce this in the context goal.
- Mock fixture change adds `retryOfCampaignId: null` as a placeholder for
  Step 3 — note this in out-of-scope so it is not mistaken for a Step 3 start.
- `tsc --noEmit` must be clean before this step is marked done; gate Step 3 on
  it.

---

## Step 3 — Retry lineage

**Recommended context:** Start a fresh context after Step 2 checkpoint passes.

**Reason:** Step 3 begins with a `lib/types/campaigns.ts` change that must
follow Step 2's clean tsc. A fresh context that re-reads the Work Tree (now
showing Step 2 complete with evidence) and the updated type file avoids
carrying stale type assumptions from Step 2's editing pass.

**Context file to create:**
`docs/agent-work/campaign-detail-fixes/implementation/step-3-context.md`

Create it using:
`docs/agent-work/_templates/implementation/context-split/context-prompt.md`

**Key scope notes for the context plan:**
- Retry API return type change (`void → Promise<Campaign>`) requires updating
  both `retryCampaign` and `retryFailedRecipients`; state this explicitly.
- 409 distinction in the catch block: the context plan should specify which
  error message string goes for 409 vs other errors.
- Mock handler must not let a second retry succeed; include this in the
  validation list.

---

## Step 4 — Recipient table

**Recommended context:** Continue in Step 3 context if small, OR start a
fresh context.

**Reason:** Step 4 is three files with a simple count fix and filter change.
If the Step 3 context is large after browser verification, reset. Otherwise
the cost of re-reading the Work Tree outweighs the benefit.

**Context file to create:**
`docs/agent-work/campaign-detail-fixes/implementation/step-4-context.md`

Create it using:
`docs/agent-work/_templates/implementation/context-split/context-prompt.md`

**Key scope notes for the context plan:**
- `sentAt: string | null` is a type addition only; no component renders it yet
  (backend endpoint pending); mark that as out-of-scope for the UI.
- DELIVERED count fix is a one-expression change; the MSW filter change is the
  higher-risk item — both belong in the same Work Tree item to keep mock and
  frontend in sync.
- Validate OPENED recipients appear under DELIVERED tab against the updated
  MSW handler; note the dev-server restart requirement.

---

## Summary

| Step | Context action | Context file |
|---|---|---|
| 1 — Scroll fix | Continue; no context file needed | — |
| 2 — Body contract | Continue or fresh; create context file | `step-2-context.md` |
| 3 — Retry lineage | Fresh context required; create context file | `step-3-context.md` |
| 4 — Recipient table | Continue or fresh; create context file | `step-4-context.md` |

The trigger for a mandatory fresh context is the Step 2 → Step 3 boundary:
Step 3 must not begin until `tsc --noEmit` is clean after Step 2, and a fresh
context re-reading the Work Tree enforces that gate naturally.
