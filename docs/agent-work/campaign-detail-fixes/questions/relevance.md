# Campaign Detail Fixes - Q Relevance

| Q section | Status | Reason |
|---|---|---|
| Goal and scope | Required | Detail page scroll, empty preview, retry flow, stats, and body contract. |
| Product and behavior decisions | Required | Retry model, bounced handling, stat meanings, and draft reopen behavior. |
| Normal behavior | Required | Detail page must scroll, show the sent HTML, and update stats after retry. |
| Edge cases | Required | Retry with zero failed recipients, retry on FAILED, empty body, imported HTML. |
| Lifecycle and persistence | Required | Body is stored once as `bodyHtml`; retry creates a new campaign. |
| Permissions, limits, and safety | Required | Server-side HTML sanitization on save. |
| Failure behavior | Required | Retry API failure, SSE disconnect, missing recipients endpoint. |
| Questions about possible impact | Required | Frontend, backend, and mock must change together. |
| Technical unknowns | Required | Recipients endpoint, `connectionId`, body fields. |
| Verification | Required | Browser check of scroll, preview, retry, and stats. |

## Layer relevance

| Layer | Status | Reason |
|---|---|---|
| Product | Required | Retry model and bounced decisions already made. |
| Frontend | Required | Layout, preview, retry UX, body field rename, mocks. |
| API | Required | Recipients endpoint and body contract. |
| Backend | Required | `broadcastmail-api` at `../broadcastmail-api`. Body sanitize, recipients endpoint. |
| Database | Not applicable | `body_html` column already exists; no schema change for body. |
| Operations | Not applicable | No deployment change in scope. |
| Testing | Required | Browser verification and backend controller tests. |

## Q-scope decision

This task will include these Q sections:

- Goal and scope
- Product and behavior decisions
- Normal behavior
- Edge cases
- Lifecycle and persistence
- Permissions, limits, and safety
- Failure behavior
- Questions about possible impact
- Technical unknowns
- Verification

These sections are intentionally excluded:

- Database schema changes (body column already exists)
- Operations and deployment
