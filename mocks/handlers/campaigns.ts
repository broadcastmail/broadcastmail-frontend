import { http, HttpResponse, delay } from "msw";
import { faker } from "@faker-js/faker";
import {
  fakeCampaign,
  type Campaign,
  type CampaignRecipient,
  type RecipientStatus,
} from "../fixtures";

// Every campaign the UI can ever be pointed at — real drafts created
// through the composer *and* the handful of seed campaigns generated below
// to make a fresh session's dashboard look populated — lives in this map.
// Earlier this only held real drafts and padded the list with throwaway
// random fakes generated fresh on every GET; that meant clicking one of
// those rows (most of the table, in a fresh session) hit GET /campaigns/:id
// with an id `store` didn't recognize, which re-rolled an *entirely new*
// random campaign under the same id — different data, and ~1-in-6 odds of
// landing on DRAFT. Persisting everything here, once, is what makes "click
// a row" reliably reopen the same campaign you saw in the table. It only
// lives as long as the current dev session/MSW worker.
const store = new Map<string, Campaign>();

// ---------------------------------------------------------------------------
// Send-lifecycle simulation
//
// Once a draft is confirmed, this fakes the RESOLVING → SENDING →
// SENT/PARTIALLY_FAILED/FAILED lifecycle the real worker (broadcastmail-worker,
// ResolutionJob/OutboxProcessor) drives asynchronously — derived purely from
// elapsed wall-clock time so it works the same whether the campaign-detail
// page is polling live or you reload it five minutes later. Once the
// lifecycle reaches a terminal state it's frozen into `store`/`recipients`
// (see freeze() below) so a retry action has a stable list to mutate.
//
// SENT vs PARTIALLY_FAILED is never pre-chosen — it's derived from whether
// any recipient actually ended up FAILED/BOUNCED once everything's settled,
// so "Sent" reliably means every recipient got it; nothing else sets it.
// ---------------------------------------------------------------------------

const RESOLVE_MS = 3000;
const SEND_MS = 7000;

interface SimState {
  confirmedAt: number;
  // Whether *resolution itself* failed — a dead end, no recipients ever
  // generated. Anything else derives SENT/PARTIALLY_FAILED from the
  // recipient list once it's done sending (see resolveCampaign below).
  resolutionFailed: boolean;
  // Full, final recipient list with a scheduled reveal offset — "reveal" as
  // in when it stops showing as QUEUED and starts showing its real outcome,
  // spreading the SENDING phase out instead of it resolving in one jump.
  recipients: (CampaignRecipient & { revealOffsetMs: number })[];
  frozen: boolean;
}

const sims = new Map<string, SimState>();

// Math.random() has no seeding API and is never reproducible across JS
// engines — this app's mock backend actually runs as *two* separate MSW
// instances (mocks/node.ts for server-rendered pages, mocks/browser.ts for
// everything fetched client-side; see the seeding block near the bottom of
// this file for why that matters), so every random draw the seed data
// depends on goes through faker instead, which can be seeded identically in
// both places.
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
    const status: RecipientStatus = failed
      ? chance(0.5)
        ? "FAILED"
        : "BOUNCED"
      : chance(openRate)
        ? "OPENED"
        : "DELIVERED";
    return {
      id: faker.string.uuid(),
      email: faker.internet.email().toLowerCase(),
      status,
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
  const sentAt = confirmedAt + RESOLVE_MS;
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
  store.set(id, { ...existing, ...patch });
  const sim = sims.get(id);
  if (sim) sim.frozen = true;
}

/** Starts (or restarts) the live-progressing lifecycle for a just-confirmed
 *  / retried campaign — status will animate RESOLVING → SENDING → terminal
 *  in real time as resolveCampaign() gets polled. */
function startSimulation(id: string, recipientCount: number) {
  const resolutionFailed = chance(0.1);
  sims.set(id, {
    confirmedAt: Date.now(),
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
  const resolutionFailed = force === "FAILED" ? true : force ? false : chance(0.1);
  const confirmedAt = sentAt.getTime() - RESOLVE_MS - SEND_MS;

  if (resolutionFailed) {
    sims.set(id, { confirmedAt, resolutionFailed: true, recipients: [], frozen: true });
    return { status: "FAILED", counts: { delivered: 0, opened: 0, failed: 0, bounced: 0 } };
  }

  const recipients = generateRecipients(
    recipientCount,
    force === "PARTIALLY_FAILED" ? true : force === "SENT" ? false : undefined,
  );
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

// ---------------------------------------------------------------------------
// Seed data — generated once, on module load, so a fresh session's
// dashboard isn't empty. Every seed goes through `store`/`sims` exactly
// like a real campaign (see seedTerminalSimulation above), so clicking one
// behaves identically to clicking something you actually created: same id
// every time, real recipients in the detail table, working retry actions.
//
// This module is loaded into *two* separate MSW instances with two
// separate module graphs — mocks/node.ts (the Node process, backing every
// server-rendered page) and mocks/browser.ts (the browser's mock worker,
// backing every client-side fetch). Each evaluates this file's top level
// independently, so an ordinarily-random seeding loop here would produce
// two different sets of demo campaigns with two different sets of ids: the
// dashboard table (server-rendered, Node's set) would show one campaign,
// and clicking into it (client-side fetch, the browser's set) would find a
// different id entirely and fall back to fabricating something random on
// the spot — which is exactly the "status changes when I click it" bug
// this replaced. Seeding faker with a fixed value before generating (and
// routing every random decision the seed data depends on through faker via
// chance() above, never bare Math.random() — see its comment) makes both
// instances compute the *identical* set, ids included. Reset back to a
// random seed right after, so nothing downstream of this block —
// real confirms, real retries, every other fixture — becomes deterministic.
// ---------------------------------------------------------------------------

type SeedStatus = "DRAFT" | "SENT" | "PARTIALLY_FAILED" | "FAILED";

function seedDemoCampaign(force?: SeedStatus) {
  const isDraft = force === "DRAFT" ? true : force ? false : chance(0.15);
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
    return HttpResponse.json(resolveCampaign(id));
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
      openedCount: 0,
      bouncedCount: 0,
      failedCount: 0,
      sentAt: null,
      // Actually now, not fakeCampaign()'s random "sometime in the last 60
      // days" default — otherwise a brand-new draft could sort anywhere in
      // the dashboard list instead of at the top (the list is sorted by
      // createdAt desc).
      createdAt: new Date().toISOString(),
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
    // Held noticeably longer than the other endpoints — this is the step
    // the sending-overlay.tsx takeover exists to cover, so it needs to be
    // slow enough in the mock to actually be visible rather than flashing
    // "Sending…" for one frame.
    await delay(2200);
    const id = params.id as string;
    if (!store.has(id)) return new HttpResponse(null, { status: 404 });
    const body = (await request.json().catch(() => ({}))) as {
      recipientCount?: number;
    };
    startSimulation(id, body.recipientCount ?? faker.number.int({ min: 40, max: 400 }));
    return new HttpResponse(null, { status: 202 });
  }),

  // Dead-end retry: a campaign whose *resolution* failed (status FAILED, no
  // recipients ever generated) gets a fresh attempt from scratch.
  // Real-backend TODO: no equivalent endpoint exists yet — this would mirror
  // CampaignConfirmService.confirmCampaign (reset status to RESOLVING,
  // re-enqueue a ResolutionJob) but starting from FAILED instead of DRAFT.
  http.post("*/api/v1/campaigns/:id/retry", async ({ params }) => {
    await delay(600);
    const id = params.id as string;
    const existing = store.get(id);
    if (!existing) return new HttpResponse(null, { status: 404 });
    startSimulation(id, existing.recipientCount ?? faker.number.int({ min: 40, max: 400 }));
    return new HttpResponse(null, { status: 202 });
  }),

  // Re-attempts delivery to just the recipients currently FAILED/BOUNCED on
  // an otherwise-terminal campaign.
  // Real-backend TODO: no equivalent endpoint exists yet. The data model is
  // already there (CampaignRecipientRepository has findByCampaignIdAndStatus
  // and deleteFailedBatch, just nothing that re-queues) — this would flip
  // those rows back to QUEUED so OutboxProcessor/EmailSendService pick them
  // up again, then update Campaign.failedCount/bouncedCount/deliveredCount
  // as each one resolves.
  http.post(
    "*/api/v1/campaigns/:id/recipients/retry-failed",
    async ({ params }) => {
      await delay(1800);
      const id = params.id as string;
      const sim = sims.get(id);
      if (!sim) return new HttpResponse(null, { status: 404 });

      // ~80% of a retry succeeds — matches "some of these were transient."
      sim.recipients = sim.recipients.map((r) => {
        if (r.status !== "FAILED" && r.status !== "BOUNCED") return r;
        if (!chance(0.8)) return r; // still fails
        return { ...r, status: "DELIVERED" as const, failedReason: null };
      });

      const final = withRevealTimes(sim.recipients, sim.confirmedAt);
      const counts = countByStatus(final);
      freeze(id, {
        status: statusFromCounts(counts),
        deliveredCount: counts.delivered,
        openedCount: counts.opened,
        failedCount: counts.failed,
        bouncedCount: counts.bounced,
      });
      return new HttpResponse(null, { status: 202 });
    },
  ),

  http.get("*/api/v1/campaigns/:id/recipients", ({ params, request }) => {
    const id = params.id as string;
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as RecipientStatus | null;
    const page = Number(url.searchParams.get("page") ?? 0);
    const size = Number(url.searchParams.get("size") ?? 8);

    const all = resolveRecipients(id);
    const filtered = status ? all.filter((r) => r.status === status) : all;
    const start = page * size;

    return HttpResponse.json({
      content: filtered.slice(start, start + size),
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / size)),
      number: page,
      size,
    });
  }),

  http.get("*/api/v1/campaigns/:id/preview", () => {
    return HttpResponse.json({ recipientCount: 42 });
  }),
];
