import type {Campaign} from "@/lib/types/campaigns";


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
