import type { Campaign } from "@/mocks/fixtures";

// Campaigns created in this browser tab, held only in memory — a plain
// module-level array, not sessionStorage, so it resets on refresh exactly
// like the mock API's own in-memory store does (mocks/handlers/campaigns.ts
// has no real persistence either; there's nothing for a reload to reload
// from). This exists because app/(dasboard)/_components/campaign-section.tsx
// renders a Server Component's fetch of the campaign list, which runs in
// a different MSW instance (Node) than the one a just-created draft was
// POSTed to (the browser) — see app/dashboard/campaigns/[id]/page.tsx for
// the full explanation of that split. Tracking what *this* browser session
// created and merging it in client-side is how the dashboard shows a new
// draft without waiting on a refetch that can't see it.
let drafts: Campaign[] = [];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function addSessionDraft(campaign: Campaign) {
  drafts = [campaign, ...drafts.filter((c) => c.id !== campaign.id)];
  notify();
}

export function updateSessionDraft(id: string, patch: Partial<Campaign>) {
  if (!drafts.some((c) => c.id === id)) return;
  drafts = drafts.map((c) => (c.id === id ? { ...c, ...patch } : c));
  notify();
}

export function removeSessionDraft(id: string) {
  if (!drafts.some((c) => c.id === id)) return;
  drafts = drafts.filter((c) => c.id !== id);
  notify();
}

export function getSessionDrafts(): Campaign[] {
  return drafts;
}

export function subscribeSessionDrafts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
