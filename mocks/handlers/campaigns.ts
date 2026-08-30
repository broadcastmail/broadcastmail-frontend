import { http, HttpResponse, delay } from "msw";
import { fakeCampaign, fakeCampaigns, type Campaign } from "../fixtures";

// Unlike the rest of this file's fully-random fixtures, drafts created
// through the composer need to actually persist what was sent — the
// composer creates a blank draft up front (see new-campaign-button.tsx) and
// relies on GET/PATCH .../:id round-tripping the same record so navigating
// back to it (or autosaving mid-edit) reflects real data, not a fresh
// random fake. This in-memory map is that store; it only lives as long as
// the current dev session/MSW worker, same as every other handler here.
const store = new Map<string, Campaign>();

export const campaignHandlers = [
  http.get("*/api/v1/campaigns", () => {
    // Real drafts first, padded out with random fakes so the list still
    // looks populated in a fresh session with nothing created yet.
    const drafts = [...store.values()];
    return HttpResponse.json({
      content: [...drafts, ...fakeCampaigns(Math.max(0, 8 - drafts.length))],
      totalElements: 8,
      totalPages: 1,
      number: 0,
      size: 20,
    });
  }),

  http.get("*/api/v1/campaigns/:id", async ({ params }) => {
    await delay(400);
    const id = params.id as string;
    return HttpResponse.json(store.get(id) ?? fakeCampaign({ id }));
  }),

  http.post("*/api/v1/campaigns", async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as Partial<Campaign>;
    const campaign = fakeCampaign({
      ...body,
      status: "DRAFT",
      recipientCount: null,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      sentAt: null,
    });
    store.set(campaign.id, campaign);
    return HttpResponse.json(campaign, { status: 201 });
  }),

  http.patch("*/api/v1/campaigns/:id", async ({ params, request }) => {
    // Also the sending-overlay.tsx "Saving campaign" step's delay — held
    // long enough to actually read, not just flicker past.
    await delay(1100);
    const id = params.id as string;
    const patch = (await request.json()) as Partial<Campaign>;
    const existing = store.get(id) ?? fakeCampaign({ id, status: "DRAFT" });
    const updated = { ...existing, ...patch };
    store.set(id, updated);
    return HttpResponse.json(updated);
  }),

  http.delete("*/api/v1/campaigns/:id", ({ params }) => {
    store.delete(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/api/v1/campaigns/:id/confirm", async ({ params }) => {
    // Held noticeably longer than the other endpoints — this is the step
    // the sending-overlay.tsx takeover exists to cover, so it needs to be
    // slow enough in the mock to actually be visible rather than flashing
    // "Sending…" for one frame.
    await delay(2200);
    const id = params.id as string;
    const existing = store.get(id);
    if (existing) store.set(id, { ...existing, status: "SENDING" });
    return new HttpResponse(null, { status: 202 });
  }),

  http.get("*/api/v1/campaigns/:id/preview", () => {
    return HttpResponse.json({ recipientCount: 42 });
  }),
];
