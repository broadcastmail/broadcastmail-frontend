# Campaign Detail Fixes — Questions

## Goal

Make the campaign detail page scrollable, show the sent email, update stats
after a retry, and use one body contract across frontend, backend, and mocks.

## Scope

### In scope

- Detail page scroll.
- Email preview renders the stored `bodyHtml`.
- Body contract: `bodyHtml` is the only body field.
- Retry flow: link to the new retry campaign and reflect it in stats.
- Recipient table data source.
- Mock alignment with the backend.

### Out of scope

- Storing editor JSON (`bodyJson`) for drafts.
- Storing `source` on the backend.
- Database schema changes.
- Deployment and operations.

## Decided behavior

- Retry failed recipients creates a new "(retry)" campaign. The original keeps
  its stats.
- Retry resends to failed recipients only. Bounced recipients are not retried.
- Drafts reopen from `bodyHtml`. Formatting may change slightly; accepted.
- Body sanitization happens server-side on every save.

## Open decisions

| Question | Status | Owner |
|---|---|---|
| Keep the generic unsubscribe footer in the preview? | Decision needed | Product |
| Allow links in the preview iframe? | Decision needed | Product / Engineering |
| One meaning for "Delivered" across stat card, recipient tab, and header? | Decision needed | Product |
| Build `GET /api/v1/campaigns/{id}/recipients` in the backend, or drop the table? | Decision needed | Engineering |

## Technical unknowns

- Which backend changes are required before the frontend body change can ship?
- Does the frontend need to send `connectionId` on create, and where should it come from?
- How should the UI handle a retry that returns an error or no new campaign?
- Which mock behaviors must change to match the backend?
- What manual flow proves the detail page scrolls and the stats update?

## Q-phase status

- Product decisions: **partially decided**; four open items above.
- Technical unknowns: **pending research**.
- Implementation design: **not started**.
