import { DashboardHero } from "./dashboard-hero";
import { CampaignSection } from "./campaign-section";
import { NewCampaignButton } from "@/components/dashboard/new-campaign-button";
import { apiClient } from "@/lib/api/client";
import { forwardedCookieHeader } from "@/lib/api/server-cookies";
import type { Campaign } from "@/mocks/fixtures";
import { AccountMetricsResponse } from "@/lib/types/metrics";

async function getMetrics(): Promise<AccountMetricsResponse | null> {
  try {
    const res = await apiClient.get<AccountMetricsResponse>(
      "/api/v1/account/metrics",
      { headers: { Cookie: await forwardedCookieHeader() } },
    );
    return res.data;
  } catch {
    return null;
  }
}

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
  const [metrics, campaigns] = await Promise.all([
    getMetrics(),
    getCampaigns(),
  ]);

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
        <NewCampaignButton />
      </header>
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
    </div>
  );
}
