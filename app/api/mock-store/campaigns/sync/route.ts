import { NextResponse } from "next/server";
import { store, filtersStore } from "@/mocks/campaign-store";
import type { Campaign } from "@/mocks/fixtures";
import type { AudienceFilterPayload } from "@/lib/campaigns/audience";
/**
A real route (not an MSW-intercepted one — "/api/mock-store/*" matches no
"*/api/v1/*" handler pattern) that the browser's mock campaign
create/update handlers call after writing to their own local store, so
the Node-side mock (server rendering, including the campaign composer's
now-server-fetched load) sees the same data. Both this route and the
Node-side mock handlers run in the same process, so they already share
one module instance of mocks/campaign-store.ts directly — only the
browser, a genuinely separate JS engine, needs this HTTP bridge at all.
*/
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  const body = (await request.json()) as {
    campaign: Campaign;
    filters?: AudienceFilterPayload[];
  };
  store.set(body.campaign.id, body.campaign);
  if (body.filters !== undefined) {
    filtersStore.set(body.campaign.id, body.filters);
  }
  return NextResponse.json({ ok: true });
}
