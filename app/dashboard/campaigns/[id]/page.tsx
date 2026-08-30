import { NewCampaignComposer } from "@/components/campaigns/new/new-campaign-composer";

// Deliberately not a server-fetched page (no getCampaign() call here) even
// though app/(dasboard)/_components/dashboard-content.tsx fetches its data
// server-side — that pattern doesn't work for this route. The campaign a
// user lands here for was just created by a client-side POST (see
// new-campaign-button.tsx), which MSW intercepted in the *browser's* mock
// worker; a Server Component render of this page runs in the Node process
// and would hit an entirely separate MSW server instance with its own
// empty store, so it would never see that draft. NewCampaignComposer loads
// the campaign itself, client-side, against the same mock worker that
// created it.
export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NewCampaignComposer campaignId={id} />;
}
