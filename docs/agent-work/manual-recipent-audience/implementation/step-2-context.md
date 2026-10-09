# Implementation Context — Step 2: Draft audience persistence and restoration

Use this document with:

```text
docs/agent-work/_templates/implementation-prompt.md
```

## Current item

- Work Tree item: Step 2 — Draft audience persistence and restoration
- Plan step: Step 2

## Goal

Seed `useAudienceRecipients` from the campaign record's audience fields so a
reopened draft restores its selection. Expose `audienceDefinition` from the
hook so the step can pass it to the form. In `NewCampaignForm`, call the
audience PATCH on Continue, hold saving/error state, and gate `canSend` on
a non-null `audienceMode` returned from the PATCH. In `AudienceStep`, disable
Continue while saving and display any PATCH error.

## Scope

- Files:
  - `features/campaigns/new/audience/hooks/use-audience-recipients.ts`
  - `features/campaigns/new/audience/ui/audience-step.tsx`
  - `features/campaigns/new/new-campaign-form.tsx`
- Out of scope: no changes to `use-campaign-autosave.ts`, `campaigns.ts` API,
  `lib/types/campaigns.ts`, mocks, or any compose files.

## Dependencies

- Step 1 complete: `AudienceMode`, `audienceMode`/`includedIds`/`excludedIds`
  on `Campaign`, `AudienceSelectionPayload`, `updateCampaign` returning
  `Promise<Campaign>`, and MSW handlers all ready.

## Validation

1. `tsc --noEmit` passes with no new errors.
2. Open a null-audience draft → hook shows no selection; no error shown.
3. Open a draft with `audienceMode: "manual"`, `includedIds: ["id1"]` → hook
   initializes with that recipient checked.
4. Click Continue with selections → PATCH fires with
   `audienceMode/includedIds/excludedIds` → campaign record updated in mock.
5. Simulate PATCH failure → Continue remains; error message shown; retry
   succeeds.
6. `canSend` false when `confirmedAudienceMode` is null; true after successful
   PATCH returns non-null `audienceMode`.

## Done when

Drafts restore selection on open; Continue triggers the audience PATCH; PATCH
failures surface and are retryable; `canSend` is gated on non-null
`audienceMode` from the PATCH response.

## Context handoff

- Continue in current context
- Reason: All required files are already read; no context boundary needed.
