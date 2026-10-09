# Manual Recipient Audience — Questions

## Goal

Allow campaign creators to define an exact audience, preserve that definition
while editing a draft, and avoid submitting a large final recipient list when
the campaign is sent.

## Product decisions

### Audience behavior

- **Manual selection with no filters:** the campaign sends only to explicitly
  selected recipients.
- **Manual selection with filters:** filters define the base audience, while
  manual selection can add recipients outside the filters and exclude
  recipients from the filtered audience.
- **Select all with filters:** select all recipients matching the active
  filters, including recipients on pages not loaded in the browser.
- **Select all without filters:** select all recipients in the account
  audience.
- **Filter changes:** preserve manual additions and exclusions, then ask the
  user whether to reapply or clear them.

### Persistence and sending

- Selection persists across refreshes, navigation, and reopening the campaign
  draft.
- The backend resolves the final audience and creates an immutable recipient
  snapshot only when the user confirms sending.
- If audience persistence fails, Continue/Send is blocked and the save error
  is shown.
- If a selected recipient is deleted or becomes ineligible before
  confirmation, the backend omits that recipient and reports the final valid
  count.

### Limits

- The first-version limit is 5,000 manually selected recipients.
- The same 5,000-recipient limit applies when no filters are active.

## Audience semantics

```text
Final audience = (base audience + manual additions) - manual exclusions

Base audience = all account recipients, or recipients matching the filters
```

The audience definition therefore needs to represent:

- active filters;
- manual additions;
- manual exclusions;
- whether select-all is active.

## Questions about possible impact

The change may cross several boundaries, but the affected layers are not
assumed yet. Research must establish the evidence.

- Where does audience selection begin and end in the current flow?
- Which state, data, workflows, and consumers may be affected?
- Which existing contracts must remain compatible?
- Which layers might not need to change?

## Technical unknowns to answer later

### Current persistence and API

- Where is audience state currently persisted?
- What does the existing campaign draft `PATCH` endpoint accept?
- Does the mock backend already persist campaign filters or audience state?
- Is a dedicated audience persistence endpoint needed?
- Which frontend components, hooks, and API functions own the current flow?
- Which mock handlers and fixtures represent the current behavior?

### Resolution and confirmation

- How does the current confirmation flow resolve recipients?
- Where are campaign-recipient records currently created for sending?
- Does the backend code exist in this repository, or are only frontend mocks
  available?
- What response should return the final valid recipient count?

### Database and operations

- Is audience state stored as JSON, relational rows, or not stored yet?
- How are campaign-recipient snapshots represented?
- Which constraints and indexes protect ownership and uniqueness?
- What request-size, rate-limit, queue, timeout, and observability behavior
  already exists?

### Security and limits

- Where are campaign ownership and recipient account ownership validated?
- Where are plan limits and recipient quotas enforced?
- What request-size and rate limits apply to audience updates?
- How should invalid, deleted, or unauthorized recipient IDs be handled?

### Frontend state and UX

- Which frontend state currently represents additions, exclusions, and
  select-all?
- How should the filter-change confirmation be represented in the UI?
- How should pending or failed audience persistence be shown?
- How should the 5,000-recipient limit be communicated before sending?

### Validation

- What existing tests cover campaign confirmation?
- What tests cover audience filtering, pagination, and selection?
- Which validation commands should run after each implementation slice?

## Q-phase status

- Product decisions: **answered**
- Possible impact: **not established**
- Technical unknowns: **unanswered**
- Implementation design: **not started**