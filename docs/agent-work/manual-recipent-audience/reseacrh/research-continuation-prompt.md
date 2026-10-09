# Manual Recipient Audience — Backend Research Continuation Prompt

Use this prompt in a fresh context with access to the backend repository or
with the backend team.

```text
Continue the Research phase for the Manual Recipient Audience feature.

Read these existing artifacts first:

- docs/agent-work/manual-recipent-audience/questions/questions.md
- docs/agent-work/manual-recipent-audience/questions/relevance.md
- docs/agent-work/manual-recipent-audience/reseacrh/research.md

The frontend repository research is complete. Do not repeat it.

## Scope

Investigate only the backend and persistence questions that remain open in
research.md:

1. What production API accepts and persists the campaign audience definition?
2. How are final recipients resolved at campaign confirmation?
3. When and where is the immutable campaign-recipient snapshot created?
4. How are deleted, ineligible, unauthorized, duplicate, or missing recipient
   IDs handled?
5. Where are campaign ownership and recipient account ownership validated?
6. Where are plan limits and recipient quotas enforced?
7. What request-size and rate limits apply to audience updates?
8. Does audience resolution or snapshot creation use a queue, transaction,
   timeout, or retry mechanism?
9. What final response reports the valid recipient count?
10. What database entities, constraints, and indexes store the audience
    definition and recipient snapshot?

## Investigation scope

Inspect only the backend areas directly responsible for:

- campaign draft updates;
- campaign audience persistence;
- recipient lookup and filtering;
- campaign confirmation;
- campaign-recipient creation;
- authorization and account ownership;
- plan and quota enforcement;
- sending queues or jobs;
- relevant entities, migrations, constraints, and indexes;
- integration or contract tests for these paths.

## Rules

- Do not modify application code.
- Do not propose implementation or architecture.
- Do not make product decisions.
- Do not repeat the completed frontend research.
- Cite backend file paths, symbols, endpoints, entities, migrations, tests, or
  dated external confirmations for every important finding.
- Distinguish:
  - Confirmed: directly verified in backend code, schema, or tests.
  - Inferred: suggested by evidence but not proven.
  - Unknown: still cannot be verified.
- Do not treat frontend mocks as production behavior.
- If the backend repository or a required subsystem is unavailable, record that
  limitation instead of inventing an answer.
- Preserve all existing frontend findings in research.md.
- Update only backend, database, operations, and related open-question sections.
- Keep the continuation concise and do not create a full backend inventory.

## Output

Update:

docs/agent-work/manual-recipent-audience/reseacrh/research.md

For each investigated question, add or update a finding using this format:

### <Question or finding title>

- **Location:** `backend/path/file.ext:SymbolName`
- **Fact:** ...
- **Status:** Confirmed / Inferred / Unknown
- **Evidence:** ...
- **Impact on research:** ...

Update the existing sections:

1. `## Layer impact evidence`
2. `## Questions answered`
3. `## Questions still open`
4. `## Research status`

Do not write design recommendations in research.md.

Set the final status to exactly one of:

- `Complete` — all blocking questions are answered.
- `Blocked` — a required backend answer is unavailable.
- `Needs external confirmation` — code research is complete but an owner must
  confirm a contract or operational rule.

If the final status is not `Complete`, include the remaining question, why it
is unresolved, and the owner who must answer it.
```

## Backend confirmation record

If the backend repository is unavailable and answers come from a person, add
the answer to `research.md` with:

- the exact question;
- the answer;
- the person's role or team;
- the date;
- the API, schema, or service version if relevant.
