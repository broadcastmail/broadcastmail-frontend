import {delay, http, HttpResponse} from "msw";
import {faker} from "@faker-js/faker";
import {fakeCampaign,} from "../fixtures";
import type {AudienceMode, Campaign, CampaignRecipient, CampaignStatusEvent, RecipientStatus} from "@/lib/types/campaigns";
import type {AudienceFilterPayload} from "@/features/campaigns/new/audience/audience";
import {type AudienceDefinition, audienceStore, filtersStore, store} from "@/mocks/campaign-store";

function isTerminalStatus(status: Campaign["status"]): boolean {
  return status === "SENT" || status === "FAILED" || status === "PARTIALLY_FAILED";
}

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
};

const sseEncoder = new TextEncoder();


function encodeStatusEvent(campaign: Campaign): Uint8Array {
  const event: CampaignStatusEvent = {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    recipientsCount: campaign.recipientCount,
    sentCount: campaign.sentCount,
    openedCount: campaign.openedCount,
    deliveredCount: campaign.deliveredCount,
    bouncedCount: campaign.bouncedCount,
    failedCount: campaign.failedCount,
  };
  return sseEncoder.encode(`event: status\ndata: ${JSON.stringify(event)}\n\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


const TOTAL_RECIPIENTS = 4960;

function estimatePreviewCount(filters: AudienceFilterPayload[]): number {
  if (!filters.length) return TOTAL_RECIPIENTS;
  const n = filters.reduce(
    (acc, f) => Math.round(acc * (f.filterValue ? 0.42 : 0.71)),
    TOTAL_RECIPIENTS,
  );
  return Math.max(n, 3);
}

// The browser's store/filtersStore are a separate instance from the Node
// server's (see mocks/campaign-store.ts) — mirror a write to the real
// bridge route so server-side reads (e.g. the campaign composer's
// server-fetched load) see it too. No-ops on the Node side, which already
// shares the same module instance with that route directly.
async function syncToServer(campaign: Campaign, filters?: AudienceFilterPayload[], audience?: AudienceDefinition) {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/mock-store/campaigns/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign, filters, audience }),
    });
  } catch (err) {
    console.error("Failed to sync mock campaign to the server store", err);
  }
}

// Merges this campaign's persisted filters and audience definition in, same
// as the real backend's CampaignController.withFilters — used for every
// single-campaign response (not the list endpoint, which doesn't bother either).
type AudiencePatch = { audienceMode?: AudienceMode; includedIds?: string[]; excludedIds?: string[] };

function hasAudienceFields(patch: AudiencePatch): boolean {
  return patch.audienceMode !== undefined || patch.includedIds !== undefined || patch.excludedIds !== undefined;
}

function mergeAudienceStore(id: string, patch: AudiencePatch): void {
  const prev = audienceStore.get(id) ?? { audienceMode: null, includedIds: null, excludedIds: null };
  audienceStore.set(id, {
    audienceMode: patch.audienceMode ?? prev.audienceMode,
    includedIds: patch.includedIds ?? prev.includedIds,
    excludedIds: patch.excludedIds ?? prev.excludedIds,
  });
}

function withFilters(campaign: Campaign): Campaign {
  const filters = filtersStore.get(campaign.id);
  const audience = audienceStore.get(campaign.id);
  const withAudience = audience ? { ...campaign, ...audience } : campaign;
  if (filters === undefined) return withAudience;
  return { ...withAudience, filters: filters.map((f) => ({ ...f, jsonKey: null })) };
}


const RESOLVE_MS = 3000;
const SEND_MS = 7000;

interface SimState {
  confirmedAt: number;
  resolutionFailed: boolean;
  recipients: (CampaignRecipient & { revealOffsetMs: number })[];
  frozen: boolean;
}

const sims = new Map<string, SimState>();


function chance(probability: number): boolean {
  return faker.number.float({ min: 0, max: 1 }) < probability;
}

/** Builds a final recipient list for a send of `total` people. About 65% of
 *  sends are entirely clean (guaranteeing a SENT outcome is possible); the
 *  rest get a handful of failures/bounces (guaranteeing at least one, so a
 *  campaign that rolls "has failures" always actually ends up
 *  PARTIALLY_FAILED rather than clean by chance). `forceFailures` pins that
 *  coin flip instead of rolling it — used to guarantee the seed set below
 *  includes at least one of each outcome rather than leaving it to chance
 *  whether a fresh session ever shows a PARTIALLY_FAILED campaign at all. */
function generateRecipients(total: number, forceFailures?: boolean): SimState["recipients"] {
  const hasFailures = forceFailures ?? chance(0.35);
  const failRate = hasFailures ? faker.number.float({ min: 0.03, max: 0.12 }) : 0;
  const openRate = 0.35; // share of *successful* sends that get opened

  const list = Array.from({ length: total }, (_, i) => {
    const failed = failRate > 0 && chance(failRate);
    let status: RecipientStatus = "DELIVERED";
    if (failed) status = chance(0.5) ? "FAILED" : "BOUNCED";
    else if (chance(openRate)) status = "OPENED";
    return {
      id: faker.string.uuid(),
      email: faker.internet.email().toLowerCase(),
      status,
      sentAt: null,
      deliveredAt: null,
      openedAt: null,
      bouncedAt: null,
      failedReason: status === "FAILED" ? "Provider rejected the message" : null,
      // Spread across the send window with a little jitter rather than
      // strict even spacing, so it doesn't look metronomic while polling.
      revealOffsetMs: Math.min(
        SEND_MS,
        Math.max(0, (i / total) * SEND_MS + faker.number.int({ min: -300, max: 300 })),
      ),
    };
  });

  if (hasFailures && total > 0 && !list.some((r) => r.status === "FAILED" || r.status === "BOUNCED")) {
    list[0] = { ...list[0], status: "FAILED", failedReason: "Provider rejected the message" };
  }

  return list.sort((a, b) => a.revealOffsetMs - b.revealOffsetMs);
}

function countByStatus(recipients: CampaignRecipient[]) {
  let delivered = 0,
    opened = 0,
    failed = 0,
    bounced = 0;
  for (const r of recipients) {
    // Cumulative, not mutually exclusive — see the Campaign interface's
    // comment in mocks/fixtures/index.ts. An opened recipient was also
    // delivered.
    if (r.status === "DELIVERED" || r.status === "OPENED") delivered++;
    if (r.status === "OPENED") opened++;
    if (r.status === "FAILED") failed++;
    if (r.status === "BOUNCED") bounced++;
  }
  return { delivered, opened, failed, bounced };
}

function statusFromCounts(counts: ReturnType<typeof countByStatus>): Campaign["status"] {
  return counts.failed + counts.bounced > 0 ? "PARTIALLY_FAILED" : "SENT";
}

function withRevealTimes(
  recipients: SimState["recipients"],
  confirmedAt: number,
): CampaignRecipient[] {
  const sentAt = confirmedAt +RESOLVE_MS;
  return recipients.map(({ revealOffsetMs, ...r }) => {
    const at = new Date(sentAt + revealOffsetMs).toISOString();
    return {
      ...r,
      deliveredAt: r.status === "DELIVERED" || r.status === "OPENED" ? at : null,
      openedAt: r.status === "OPENED" ? at : null,
      bouncedAt: r.status === "BOUNCED" ? at : null,
    };
  });
}

function freeze(id: string, patch: Partial<Campaign>) {
  const existing = store.get(id);
  if (!existing) return;
  const updated = { ...existing, ...patch };
  store.set(id, updated);
  const sim = sims.get(id);
  if (sim) sim.frozen = true;
  void syncToServer(updated);
}

/** Starts (or restarts) the live-progressing lifecycle for a just-confirmed
 *  / retried campaign — status will animate RESOLVING → SENDING → terminal
 *  in real time as resolveCampaign() gets polled. */
function startSimulation(id: string, recipientCount: number, confirmedAt: number = Date.now(), resolutionFailed: boolean = chance(0.1)) {
  sims.set(id, {
    confirmedAt,
    resolutionFailed,
    recipients: resolutionFailed ? [] : generateRecipients(recipientCount),
    frozen: false,
  });
  store.set(id, {
    ...(store.get(id) as Campaign),
    status: "RESOLVING",
    recipientCount,
    sentCount: 0,
    deliveredCount: 0,
    openedCount: 0,
    bouncedCount: 0,
    failedCount: 0,
    sentAt: null,
  });
}

export function resumeSimulations(): void {
  for (const [id, campaign] of store.entries()) {
    if (sims.has(id)) continue;
    if (campaign.status === "RESOLVING" || campaign.status === "SENDING") {
      const recipientCount = campaign.recipientCount ?? 100;
      const progress = recipientCount > 0 ? Math.min((campaign.sentCount ?? 0) / recipientCount, 1) : 0;
      const sendElapsed = progress * SEND_MS;
      startSimulation(id, recipientCount, Date.now() - RESOLVE_MS - sendElapsed, false);
    } else if (campaign.status === "SENT" || campaign.status === "PARTIALLY_FAILED") {
      const recipientCount = campaign.recipientCount ?? 0;
      const sentAt = campaign.sentAt ? new Date(campaign.sentAt) : new Date();
      seedTerminalSimulation(id, recipientCount, sentAt, campaign.status);
    }
  }
}

/** Same lifecycle as startSimulation, but already-terminal on arrival — for
 *  seeding demo campaigns that should look like they sent a while ago
 *  rather than animating through a resolve/send window right now. `force`
 *  pins the outcome instead of rolling it — see generateRecipients' comment
 *  on why the seed set below needs that. */
function seedTerminalSimulation(
  id: string,
  recipientCount: number,
  sentAt: Date,
  force?: "SENT" | "PARTIALLY_FAILED" | "FAILED",
): { status: Campaign["status"]; counts: ReturnType<typeof countByStatus> } {
  const resolutionFailed = force ? force === "FAILED" : chance(0.1);
  const confirmedAt = sentAt.getTime() - RESOLVE_MS - SEND_MS;

  if (resolutionFailed) {
    sims.set(id, { confirmedAt, resolutionFailed: true, recipients: [], frozen: true });
    return { status: "FAILED", counts: { delivered: 0, opened: 0, failed: 0, bounced: 0 } };
  }

  const forceFailures = force === undefined ? undefined : force === "PARTIALLY_FAILED";
  const recipients = generateRecipients(recipientCount, forceFailures);
  sims.set(id, { confirmedAt, resolutionFailed: false, recipients, frozen: true });
  const counts = countByStatus(recipients);
  return { status: statusFromCounts(counts), counts };
}

/** Returns the campaign as it should look *right now*, advancing/freezing
 *  the simulation as needed. Safe to call on every GET / poll tick. */
function resolveCampaign(id: string): Campaign {
  const base = store.get(id);
  if (!base) return fakeCampaign({ id });

  const sim = sims.get(id);
  if (!sim || sim.frozen) return base;

  const elapsed = Date.now() - sim.confirmedAt;

  if (elapsed < RESOLVE_MS) {
    return { ...base, status: "RESOLVING" };
  }

  if (sim.resolutionFailed) {
    freeze(id, { status: "FAILED" });
    return store.get(id)!;
  }

  const sendElapsed = elapsed - RESOLVE_MS;
  if (sendElapsed < SEND_MS) {
    const revealed = withRevealTimes(
      sim.recipients.filter((r) => r.revealOffsetMs <= sendElapsed),
      sim.confirmedAt,
    );
    const counts = countByStatus(revealed);
    return {
      ...base,
      status: "SENDING",
      sentCount: revealed.length,
      deliveredCount: counts.delivered,
      openedCount: counts.opened,
      failedCount: counts.failed,
      bouncedCount: counts.bounced,
    };
  }

  const final = withRevealTimes(sim.recipients, sim.confirmedAt);
  const counts = countByStatus(final);
  freeze(id, {
    status: statusFromCounts(counts),
    sentCount: final.length,
    deliveredCount: counts.delivered,
    openedCount: counts.opened,
    failedCount: counts.failed,
    bouncedCount: counts.bounced,
    sentAt: new Date(sim.confirmedAt + RESOLVE_MS + SEND_MS).toISOString(),
  });
  return store.get(id)!;
}

/** Recipients as they currently stand — only meaningful once frozen or
 *  mid-SENDING; QUEUED placeholders fill in for anything not revealed yet. */
function resolveRecipients(id: string): CampaignRecipient[] {
  const sim = sims.get(id);
  if (!sim) return [];

  const revealedAt = sim.frozen
    ? SEND_MS
    : Math.max(0, Date.now() - sim.confirmedAt - RESOLVE_MS);

  return sim.recipients.map((r) => {
    if (r.revealOffsetMs > revealedAt) {
      return {
        id: r.id,
        email: r.email,
        status: "QUEUED" as const,
        sentAt: null,
        deliveredAt: null,
        openedAt: null,
        bouncedAt: null,
        failedReason: null,
      };
    }
    const [full] = withRevealTimes([r], sim.confirmedAt);
    return full;
  });
}


type SeedStatus = "DRAFT" | "SENT" | "PARTIALLY_FAILED" | "FAILED";

function seedDemoCampaign(force?: SeedStatus) {
  const isDraft = force ? force === "DRAFT" : chance(0.15);
  if (isDraft) {
    const campaign = fakeCampaign({
      status: "DRAFT",
      recipientCount: null,
      sentCount: 0,
      deliveredCount: 0,
      openedCount: 0,
      bouncedCount: 0,
      failedCount: 0,
      sentAt: null,
    });
    store.set(campaign.id, campaign);
    return;
  }

  const id = faker.string.uuid();
  const recipientCount = faker.number.int({ min: 40, max: 400 });
  const sentAt = faker.date.recent({ days: 30 });
  const { status, counts } = seedTerminalSimulation(
    id,
    recipientCount,
    sentAt,
    force === "DRAFT" ? undefined : force,
  );

  const campaign = fakeCampaign({
    id,
    status,
    recipientCount: status === "FAILED" ? null : recipientCount,
    sentCount: status === "FAILED" ? 0 : recipientCount,
    deliveredCount: counts.delivered,
    openedCount: counts.opened,
    failedCount: counts.failed,
    bouncedCount: counts.bounced,
    sentAt: status === "FAILED" ? null : sentAt.toISOString(),
  });
  store.set(id, campaign);
}

// One of each interesting terminal status is forced rather than left to
// chance — a fixed seed is deterministic, but deterministic still means
// "whatever that seed happens to roll," and it happened to roll zero
// PARTIALLY_FAILED out of 8 before this. The remaining slots stay random
// (still through the same seeded, cross-instance-consistent RNG).
const GUARANTEED_STATUSES: SeedStatus[] = ["DRAFT", "SENT", "PARTIALLY_FAILED", "FAILED"];
const SEED_COUNT = 8;

faker.seed(20260830); // fixed, arbitrary — only needs to match itself across instances
for (let i = 0; i < SEED_COUNT; i++) seedDemoCampaign(GUARANTEED_STATUSES[i]);
faker.seed(); // back to non-deterministic for everything from here on

function isActiveCampaign(c: Campaign) {
  return c.status === "RESOLVING" || c.status === "SENDING";
}

function flushTerminated(inFlight: Set<string>, activeIds: Set<string>, controller: ReadableStreamDefaultController) {
  for (const id of inFlight) {
    if (!activeIds.has(id)) {
      controller.enqueue(encodeStatusEvent(resolveCampaign(id)));
      inFlight.delete(id);
    }
  }
}

function resolveRecipientCount(audience: AudienceDefinition | undefined, filters: AudienceFilterPayload[]): number {
  if (audience?.audienceMode === "manual") return (audience.includedIds ?? []).length;
  if (audience?.audienceMode === "all") return Math.max(0, TOTAL_RECIPIENTS - (audience.excludedIds ?? []).length);
  return estimatePreviewCount(filters);
}

async function createRetryCampaign(originalId: string, recipientCount: number) {
  const original = store.get(originalId) as Campaign;
  const retry = fakeCampaign({
    retryOfCampaignId: originalId,
    name: original.name,
    subject: original.subject,
    bodyHtml: original.bodyHtml,
    status: "DRAFT",
    recipientCount: null,
    sentCount: 0,
    deliveredCount: 0,
    openedCount: 0,
    bouncedCount: 0,
    failedCount: 0,
    sentAt: null,
    createdAt: new Date().toISOString(),
  });
  store.set(retry.id, retry);
  startSimulation(retry.id, recipientCount);
  await syncToServer(store.get(retry.id) as Campaign);
  return HttpResponse.json(withFilters(resolveCampaign(retry.id)), { status: 202 });
}

export const campaignHandlers = [
  http.get("*/api/v1/campaigns", () => {
    const campaigns = [...store.keys()]
      .map(resolveCampaign)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return HttpResponse.json({
      content: campaigns,
      totalElements: campaigns.length,
      totalPages: 1,
      number: 0,
      size: 20,
    });
  }),

  http.get("*/api/v1/campaigns/:id", async ({ params }) => {
    await delay(400);
    const id = params.id as string;
    if (!store.has(id)) return HttpResponse.json(fakeCampaign({ id }));
    return HttpResponse.json(withFilters(resolveCampaign(id)));
  }),

  http.get("*/api/v1/campaigns/:id/status/stream", ({ params }) => {
    const id = params.id as string;
    let cancelled = false;
    const stream = new ReadableStream({
      async start(controller) {
        while (!cancelled) {
          const campaign = resolveCampaign(id);
          controller.enqueue(encodeStatusEvent(campaign));
          if (isTerminalStatus(campaign.status)) {
            controller.close();
            return;
          }
          await sleep(2000);
        }
      },
      cancel() {
        cancelled = true;
      },
    });
    return new HttpResponse(stream, { headers: SSE_HEADERS });
  }),

  http.get("*/api/v1/campaigns/status/stream", () => {
    let cancelled = false;
    const stream = new ReadableStream({
      async start(controller) {
        const inFlight = new Set<string>();
        while (!cancelled) {
          const active = [...store.keys()].map(resolveCampaign).filter(isActiveCampaign);
          const activeIds = new Set(active.map((c) => c.id));
          flushTerminated(inFlight, activeIds, controller);
          if (active.length === 0 && inFlight.size === 0) { controller.close(); return; }
          for (const campaign of active) {
            if (cancelled) return;
            inFlight.add(campaign.id);
            controller.enqueue(encodeStatusEvent(campaign));
            if (campaign.status === "SENDING") void syncToServer(campaign);
          }
          const anySending = active.some((c) => c.status === "SENDING");
          await sleep(anySending ? 400 : 2000);
        }
      },
      cancel() { cancelled = true; },
    });
    return new HttpResponse(stream, { headers: SSE_HEADERS });
  }),

  http.post("*/api/v1/campaigns", async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as Partial<Campaign> & {
      filters?: AudienceFilterPayload[];
    };
    const { filters, ...campaignBody } = body;
    const campaign = fakeCampaign({
      ...campaignBody,
      status: "DRAFT",
      recipientCount: null,
      sentCount: 0,
      deliveredCount: 0,
      openedCount: 0,
      bouncedCount: 0,
      failedCount: 0,
      sentAt: null,
      createdAt: new Date().toISOString(),
    });
    store.set(campaign.id, campaign);
    if (filters !== undefined) filtersStore.set(campaign.id, filters);
    await syncToServer(campaign, filters);
    return HttpResponse.json(withFilters(campaign), { status: 201 });
  }),

  http.patch("*/api/v1/campaigns/:id", async ({ params, request }) => {
    await delay(1100);
    const id = params.id as string;
    const body = (await request.json()) as Partial<Campaign> & {
      filters?: AudienceFilterPayload[];
    } & AudiencePatch;
    const { filters, audienceMode, includedIds, excludedIds, ...patch } = body;
    const audiencePatch: AudiencePatch = { audienceMode, includedIds, excludedIds };
    const existing = store.get(id) ?? fakeCampaign({ id, status: "DRAFT" });
    const updated = { ...existing, ...patch };
    store.set(id, updated);
    if (filters !== undefined) filtersStore.set(id, filters);
    if (hasAudienceFields(audiencePatch)) mergeAudienceStore(id, audiencePatch);
    const audienceData = hasAudienceFields(audiencePatch) ? audienceStore.get(id) : undefined;
    await syncToServer(updated, filters, audienceData);
    return HttpResponse.json(withFilters(updated));
  }),

  http.delete("*/api/v1/campaigns/:id", ({ params }) => {
    const id = params.id as string;
    const existing = store.get(id);
    // Mirrors the real backend: CampaignService.deleteCampaign throws
    // CampaignNotEditableException for anything past DRAFT, which
    // GlobalExceptionHandler maps to 403 with this same body shape. The
    // delete option is already hidden in the UI once a campaign leaves
    // DRAFT (see campaign-row.tsx) — this is what actually enforces it.
    if (existing && existing.status !== "DRAFT") {
      return HttpResponse.json({ error: "Campaign Not Editable" }, { status: 403 });
    }
    store.delete(id);
    sims.delete(id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/api/v1/campaigns/:id/confirm", async ({ params, request }) => {
    await delay(2200);
    const id = params.id as string;
    if (!store.has(id)) return new HttpResponse(null, { status: 404 });
    await request.json().catch(() => ({}));
    const hasActiveCampaign = [...store.keys()]
      .filter((k) => k !== id)
      .some((k) => { const s = resolveCampaign(k).status; return s === "RESOLVING" || s === "SENDING"; });
    if (hasActiveCampaign) {
      return HttpResponse.json(
        { error: "Another campaign is currently sending. Wait for it to finish before sending a new one." },
        { status: 409 },
      );
    }
    const audience = audienceStore.get(id);
    const savedFilters = filtersStore.get(id) ?? [];
    if ((audience?.audienceMode == null) && savedFilters.length === 0) {
      return HttpResponse.json({ error: "Audience not configured" }, { status: 422 });
    }
    startSimulation(id, resolveRecipientCount(audience, savedFilters));
    await syncToServer(store.get(id) as Campaign);
    return new HttpResponse(null, { status: 202 });
  }),


  http.post("*/api/v1/campaigns/:id/retry", async ({ params }) => {
    await delay(600);
    const id = params.id as string;
    const existing = store.get(id);
    if (!existing) return new HttpResponse(null, { status: 404 });
    if (existing.status !== "FAILED")
      return HttpResponse.json({ error: "Campaign is not in FAILED status" }, { status: 409 });
    const retryExists = [...store.values()].some((c) => c.retryOfCampaignId === id);
    if (retryExists)
      return HttpResponse.json({ error: "A retry campaign already exists" }, { status: 409 });
    return createRetryCampaign(id, existing.recipientCount ?? faker.number.int({ min: 40, max: 400 }));
  }),

  http.post(
    "*/api/v1/campaigns/:id/recipients/retry-failed",
    async ({ params }) => {
      await delay(1800);
      const id = params.id as string;
      const existing = store.get(id);
      if (!existing) return new HttpResponse(null, { status: 404 });
      const retryExists = [...store.values()].some((c) => c.retryOfCampaignId === id);
      if (retryExists)
        return HttpResponse.json({ error: "A retry campaign already exists" }, { status: 409 });
      const sim = sims.get(id);
      const failedRecipients = sim
        ? sim.recipients.filter((r) => r.status === "FAILED" || r.status === "BOUNCED")
        : [];
      return createRetryCampaign(id, Math.max(1, failedRecipients.length));
    },
  ),

  http.get("*/api/v1/campaigns/:id/recipients", ({ params, request }) => {
    const id = params.id as string;
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as RecipientStatus | null;
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 8);

    const all = resolveRecipients(id);
    let filtered = all;
    if (status === "DELIVERED") filtered = all.filter((r) => r.status === "DELIVERED" || r.status === "OPENED");
    else if (status) filtered = all.filter((r) => r.status === status);
    const start = page * size;

    return HttpResponse.json({
      content: filtered.slice(start, start + size),
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / size)),
      number: page,
      size,
    });
  }),

  http.get("*/api/v1/campaigns/:id/preview", ({ params }) => {
    const id = params.id as string;
    const count = estimatePreviewCount(filtersStore.get(id) ?? []);
    return HttpResponse.json({ recipientCount: count });
  }),

  http.post("*/api/v1/campaigns/:id/test/send", async ({ params }) => {
    await delay(800);
    const id = params.id as string;
    if (!store.has(id)) return new HttpResponse(null, { status: 404 });
    return new HttpResponse(null, { status: 202 });
  }),
];
