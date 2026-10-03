import type { Campaign } from "@/mocks/fixtures";
import type { AudienceFilterPayload } from "@/lib/campaigns/audience";

// Imported by both mocks/handlers/campaigns.ts and
// app/api/mock-store/campaigns/sync/route.ts. In the Node process (server
// rendering, and that route itself) this is one real shared module-level
// singleton — but mocks/handlers/campaigns.ts also runs inside the
// browser's Service Worker, a separate JS engine with its own copy of every
// module, this one included. The sync route exists specifically to bridge
// that gap: see its comment for how.
export const store = new Map<string, Campaign>();
export const filtersStore = new Map<string, AudienceFilterPayload[]>();
