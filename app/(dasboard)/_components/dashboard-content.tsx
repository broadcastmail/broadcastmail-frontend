import { DashboardHero } from "./dashboard-hero";
import { CampaignSection } from "./campaign-section";
import { NewCampaignButton } from "@/components/dashboard/new-campaign-button";
import { ConnectRequiredEmptyState } from "@/components/dashboard/connect-required-empty-state";
import { apiClient } from "@/lib/api/client";
import { forwardedCookieHeader } from "@/lib/api/server-cookies";
import { getAccountMetrics } from "@/lib/api/account";
import { getSchemaIntrospection } from "@/lib/api/onboarding";
import type { Campaign } from "@/mocks/fixtures";

async function getCampaigns(): Promise<Campaign[]> {
  try {
    const res = await apiClient.get("/api/v1/campaigns", {
      headers: { Cookie: await forwardedCookieHeader() },
    });
    return res.data.content ?? [];
  } catch {
    return [];
  }
}

export async function DashboardContent() {
  const [metrics, campaigns, schema] = await Promise.all([
    getAccountMetrics(),
    getCampaigns(),
    getSchemaIntrospection(),
  ]);

  // Project + table detected — what a campaign actually needs to load a
  // real audience (recipients always resolve via auth.user_emails, not a
  // per-connection email column). Filterable columns are a refinement on
  // top (see components/settings/supabase-section.tsx's own edit split) —
  // not required just to send, so they don't gate this.
  const configured = schema?.status === "DETECTED";

  return (
    <div className="flex-1 overflow-y-auto px-8 py-9 flex flex-col gap-7">
      <header className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-[5px]">
          <h1 className="text-[24px] font-semibold text-text-primary tracking-[-0.02em]">
            Campaigns
          </h1>
          <p className="text-[13.5px] text-text-muted">
            Send to segments of your Supabase users.
          </p>
        </div>
        <NewCampaignButton configured={configured} />
      </header>
      {configured ? (
        <>
          {metrics && (
            <DashboardHero
              audience={metrics.audience}
              audienceSource={metrics.audienceSource}
              totalDeliveredThisMonth={metrics.totalDeliveredThisMonth}
              deliveryRate={metrics.deliveryRate}
              recipientsUsedThisPeriod={metrics.recipientsUsedThisPeriod}
              recipientsLimit={metrics.recipientsLimit}
            />
          )}
          <CampaignSection campaigns={campaigns} />
        </>
      ) : (
        <ConnectRequiredEmptyState />
      )}
    </div>
  );
}
