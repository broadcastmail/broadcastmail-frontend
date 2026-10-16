import type {AudienceDefinition} from "./campaign-store";
import {audienceStore, filtersStore, store} from "./campaign-store";
import type {Campaign} from "@/lib/types/campaigns";
import type {AudienceFilterPayload} from "@/features/campaigns/new/audience/audience";
import {resumeSimulations} from "./handlers/campaigns";

type SyncEntry = {
  campaign: Campaign;
  filters?: AudienceFilterPayload[];
  audience?: AudienceDefinition;
};

export async function hydrateFromServer(): Promise<void> {
  try {
    const res = await fetch("/api/mock-store/campaigns/sync");
    if (!res.ok) return;
    const entries = (await res.json()) as SyncEntry[];
    for (const { campaign, filters, audience } of entries) {
      store.set(campaign.id, campaign);
      if (filters !== undefined) filtersStore.set(campaign.id, filters);
      if (audience !== undefined) audienceStore.set(campaign.id, audience);
    }
    resumeSimulations();
  } catch {
    // non-critical
  }
}
