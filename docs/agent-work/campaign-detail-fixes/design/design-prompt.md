# Design Discussion Prompt

Use this after the relevant Research phase is complete.

```text
We are starting the Design Discussion phase for:

Campaign Detail Fixes

Read these approved artifacts:

- docs/agent-work/campaign-detail-fixes/questions/questions.md
- docs/agent-work/campaign-detail-fixes/questions/relevance.md
- docs/agent-work/campaign-detail-fixes/research/research.md

Verify claims against the sibling repos when needed: ../broadcastmail-api,
../broadcastmail-common, ../broadcastmail-worker, ../broadcast-webhooks.

Do not modify application code.
Do not create a detailed implementation plan yet.

Based only on the product decisions and factual research:

1. Summarize the current problem.
2. Identify the constraints and confirmed affected boundaries.
3. Propose the smallest reasonable design options for each open item below.
4. Compare the important tradeoffs.
5. Recommend one option per item.
6. Identify decisions that still require my approval.
7. State assumptions explicitly when research is incomplete.

Open items to cover:

- A. Sanitizer for broadcastmail-api (none exists in any sibling repo).
- B. Source of connectionId on create, and the ownership check.
- C. Recipient table: build GET /api/v1/campaigns/{id}/recipients in this task,
     or drop the table. Default to building it, since features are vertical
     slices that include every layer they need.
- D. "Delivered" labels: card = total, tab = delivered excluding opened.
- E. Retry: follow the retry campaign; add retryCampaignId to CampaignResponse.
- F. Preview footer shape, aligned to the worker's appended unsubscribe link.
- G. Scroll fix: let AppShell main scroll; verify in browser.

Discuss the options with me before writing the final design document.

After I approve the decisions, write:

docs/agent-work/campaign-detail-fixes/design/design.md

Keep the design focused on decisions, ownership, contracts, tradeoffs, and
invariants. Do not repeat the full research report or write implementation
tasks. Do not write slice or file-level structure here; that belongs to the
Structure phase.
```

## Design gate

Do not proceed to Structure until the human approves:

- the chosen behavior;
- ownership and source of truth;
- API and data contracts;
- security and failure rules;
- important tradeoffs and assumptions.
