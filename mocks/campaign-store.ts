import type {AudienceMode, Campaign} from "@/lib/types/campaigns";
import type {AudienceFilterPayload} from "@/features/campaigns/new/audience/audience";

// Imported by both mocks/handlers/campaigns.ts and
// app/api/mock-store/campaigns/sync/route.ts. In the Node process (server
// rendering, and that route itself) this is one real shared module-level
// singleton — but mocks/handlers/campaigns.ts also runs inside the
// browser's Service Worker, a separate JS engine with its own copy of every
// module, this one included. The sync route exists specifically to bridge
// that gap: see its comment for how.
//
// In Next.js 15 dev mode, route handlers and instrumentation.ts load in
// isolated module contexts, so plain module-level Maps would be separate
// instances. Attaching to globalThis ensures all contexts share the same
// Maps across re-instantiations (standard Next.js singleton pattern).
export interface AudienceDefinition {
  audienceMode: AudienceMode | null;
  includedIds: string[] | null;
  excludedIds: string[] | null;
}

type StoreGlobal = {
  __bm_store?: Map<string, Campaign>;
  __bm_filtersStore?: Map<string, AudienceFilterPayload[]>;
  __bm_audienceStore?: Map<string, AudienceDefinition>;
};

const g = globalThis as unknown as StoreGlobal;

export const store: Map<string, Campaign> = (g.__bm_store ??= new Map());
export const filtersStore: Map<string, AudienceFilterPayload[]> = (g.__bm_filtersStore ??= new Map());
export const audienceStore: Map<string, AudienceDefinition> = (g.__bm_audienceStore ??= new Map());
