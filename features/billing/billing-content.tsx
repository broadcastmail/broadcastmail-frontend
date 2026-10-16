import {getAccountMetrics} from "@/lib/api/account";
import {createServerApiClient} from "@/lib/api/client/server-client";
import {getSubscription} from "@/features/billing/api/billing-server";
import {PlanSection} from "./plan-section";
import {UsageSection} from "./usage-section";

async function getCampaignCount(): Promise<number> {
  try {
    const serverApiClient = await createServerApiClient();
    const res = await serverApiClient.get("/api/v1/campaigns");
    return res.data.totalElements ?? 0;
  } catch {
    return 0;
  }
}

export async function BillingContent() {
  const [metrics, campaignCount, subscription] = await Promise.all([
    getAccountMetrics(),
    getCampaignCount(),
    getSubscription(),
  ]);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-9 flex justify-center">
      <div className="w-full max-w-280 flex flex-col gap-4">
        <PlanSection
          currentPeriodEnd={subscription?.currentPeriodEnd ?? null}
          cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
        />
        {metrics && (
          <UsageSection
            recipientsUsed={metrics.recipientsUsedThisPeriod}
            recipientsLimit={metrics.recipientsLimit}
            campaignCount={campaignCount}
          />
        )}
      </div>
    </div>
  );
}
