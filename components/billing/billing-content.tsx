import { getMe } from "@/lib/api/get-me";
import { getAccountMetrics } from "@/lib/api/account";
import { apiClient } from "@/lib/api/client";
import { forwardedCookieHeader } from "@/lib/api/server-cookies";
import { PlanSection } from "./plan-section";
import { UsageSection } from "./usage-section";

async function getCampaignCount(): Promise<number> {
  try {
    const res = await apiClient.get(
      "/api/v1/campaigns",
      { headers: { Cookie: await forwardedCookieHeader() } },
    );
    return res.data.totalElements ?? 0;
  } catch {
    return 0;
  }
}

export async function BillingContent() {
  const [me, metrics, campaignCount] = await Promise.all([
    getMe(),
    getAccountMetrics(),
    getCampaignCount(),
  ]);

  const plan = me?.plan ?? "free";

  return (
    <div className="flex-1 overflow-y-auto px-8 py-9 flex justify-center">
      <div className="w-full max-w-280 flex flex-col gap-4">
        <PlanSection plan={plan} />
        {metrics && (
          <UsageSection
            plan={plan}
            recipientsUsed={metrics.recipientsUsedThisPeriod}
            recipientsLimit={metrics.recipientsLimit}
            campaignCount={campaignCount}
          />
        )}
      </div>
    </div>
  );
}
