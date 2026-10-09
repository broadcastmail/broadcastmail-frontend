# Manual Recipient Audience — Design Discussion Prompt

Use this prompt in a fresh context after reviewing and approving the Research
phase.

```text
We are starting the Design Discussion phase for the Manual Recipient Audience
feature.

Read these approved artifacts:

- docs/agent-work/manual-recipent-audience/questions/questions.md
- docs/agent-work/manual-recipent-audience/questions/relevance.md
- docs/agent-work/manual-recipent-audience/reseacrh/research.md

Do not modify application code.
Do not create structure.md or plan.md yet.
Do not skip directly to implementation.

## Product decisions already approved

- With no filters, manual selection sends only to explicitly selected
  recipients.
- With filters, filters define the base audience.
- Manual selection can add recipients outside the filters and exclude
  recipients from the filtered audience.
- Select-all with filters means all recipients matching the filters, including
  recipients on unloaded pages.
- Select-all without filters means all recipients in the account audience.
- Filter changes preserve additions and exclusions, then ask whether to reapply
  or clear them.
- Selection persists across refreshes, navigation, and reopening the draft.
- The backend resolves and snapshots recipients only at send confirmation.
- Failed audience persistence blocks Continue/Send and shows an error.
- Invalid recipients are omitted at confirmation and the final valid count is
  reported.
- The first-version manual-selection limit is 5,000 recipients.

## Design discussion rules

1. Summarize the current problem using only the research evidence.
2. Identify the confirmed constraints and the unresolved backend assumptions.
3. Propose the smallest reasonable design options.
4. Compare their tradeoffs, especially for:
   - audience representation;
   - draft persistence;
   - large manual selections;
   - select-all semantics;
   - filter changes;
   - confirmation-time resolution;
   - recipient snapshots;
   - authorization, quotas, and limits;
   - failed or partial persistence.
5. Recommend one design.
6. Do not treat frontend mocks as production backend behavior.
7. Do not invent backend contracts where research says they are unknown.
8. Ask me focused questions for any decision that requires approval.
9. Do not write the final design document until I approve the decisions.

## Required ownership discussion

Explicitly discuss who owns:

- audience-definition state;
- recipient counts;
- recipient authorization and eligibility;
- plan and quota enforcement;
- final audience resolution;
- immutable recipient snapshots;
- delivery records and send status.

## Required design output after approval

After I approve the design, write:

docs/agent-work/manual-recipent-audience/design/design.md

Use the general structure from:

docs/agent-work/_templates/design.md

The final design document must include:

- decision summary;
- goals and non-goals;
- chosen audience model;
- ownership and source of truth;
- API/data contracts;
- invariants and safety rules;
- lifecycle and failure behavior;
- alternatives considered;
- explicit assumptions and unresolved items;
- human approval record.

Keep the design concise and decision-focused. Do not repeat the complete
research report or write implementation tasks.
```

## Design gate

Do not proceed to Structure until these decisions are approved:

- audience representation;
- persistence boundary;
- confirmation and snapshot semantics;
- ownership and authorization;
- quota and selection limits;
- invalid-recipient behavior;
- failure and retry behavior;
- assumptions caused by unavailable backend information.
