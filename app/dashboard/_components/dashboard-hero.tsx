"use client";

import {MetricCard} from "@/components/dashboard/metric-card";
import {usePlan} from "@/lib/subscription/plan-context";
import {isProPlan} from "@/lib/subscription/plans";
import {useGetMetrics} from "@/lib/api/generated/me/me";

export function DashboardHero() {
  const isPro = isProPlan(usePlan());
  const { data: metrics } = useGetMetrics({ query: { staleTime: 2 * 60_000 } });

  if (!metrics) return null;

  const ratio = (metrics.recipientsLimit ?? 0) > 0
    ? (metrics.recipientsUsedThisPeriod ?? 0) / (metrics.recipientsLimit ?? 1)
    : 0;

  return (
    <div className="grid grid-cols-3 gap-[14px]">
      <MetricCard
        label="Audience"
        value={metrics.audience ?? 0}
        supporting={`from ${metrics.audienceSource ?? ''}`}
      />
      <MetricCard
        label="Delivered · 30d"
        value={metrics.totalDeliveredThisMonth ?? 0}
        supporting={`${metrics.deliveryRate ?? 0}% delivery rate`}
      />
      <MetricCard
        label="Recipients · This period"
        value={metrics.recipientsUsedThisPeriod ?? 0}
        limit={isPro ? undefined : (metrics.recipientsLimit ?? 0)}
        progress={isPro ? undefined : Math.min(100, Math.round(ratio * 100))}
        supporting={isPro ? "Unlimited" : undefined}
      />
    </div>
  );
}
