# Manual Recipient Audience - Q Relevance

This document scopes the Q phase before technical research begins.

| Q section | Status | Reason |
|---|---|---|
| Goal and scope | Required | The task changes how campaign audiences are defined and sent. |
| Product and behavior decisions | Required | Selection, filtering, select-all, and send semantics change. |
| Normal behavior | Required | The final audience formula must be explicit. |
| Edge cases | Required | Deleted recipients, filter changes, duplicates, and empty audiences matter. |
| Lifecycle and persistence | Required | Selection must survive draft reopening and be finalized at send time. |
| Permissions, limits, and safety | Required | Recipient ownership, quotas, and the 5,000-ID limit are relevant. |
| Failure behavior | Required | Failed audience persistence must block sending. |
| Questions about possible impact | Required | The affected boundaries are not known before research. |
| Technical unknowns | Required | Current persistence and confirmation behavior must be discovered. |
| Verification | Required | Audience correctness and send behavior need explicit validation. |

## Layer relevance

| Layer | Status | Reason |
|---|---|---|
| Product | Required | The audience behavior and acceptance criteria are changing. |
| Frontend | Required | Current selection state and audience UI must represent the new behavior. |
| API | Required | Audience state and confirmation payloads may need new contracts. |
| Backend | Required | The backend must validate, resolve, and snapshot recipients. |
| Database | Optional | Required only if current persistence cannot represent the audience definition or snapshot. |
| Operations | Optional | Required if bulk updates, rate limits, queues, or large audience resolution are affected. |
| Testing | Required | Exact recipient behavior and safety rules need coverage. |

## Status meanings

- **Required**: questions must be answered before leaving Q.
- **Optional**: include only if research reveals a connection.
- **Not applicable**: explicitly out of scope for this task.

## Q-scope decision

This task includes:

- goal and scope;
- product and behavior decisions;
- edge cases;
- lifecycle and persistence;
- permissions, limits, and safety;
- failure behavior;
- possible impact;
- technical unknowns;
- verification.

Database and operations remain optional until research establishes whether
they must change. They are not being assumed as implementation requirements.
