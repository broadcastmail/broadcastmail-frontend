"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { usePlan } from "@/lib/billing/plan-context";
import { isProPlan } from "@/lib/billing/plans";

interface DashboardHeroProps {
  audience: number;
  audienceSource: string;
  totalDeliveredThisMonth: number;
  deliveryRate: number;
  recipientsUsedThisPeriod: number;
  recipientsLimit: number;
}

export function DashboardHero({
  audience,
  audienceSource,
  totalDeliveredThisMonth,
  deliveryRate,
  recipientsUsedThisPeriod,
  recipientsLimit,
}: DashboardHeroProps) {
  const isPro = isProPlan(usePlan());
  const ratio = recipientsLimit > 0 ? recipientsUsedThisPeriod / recipientsLimit : 0;

  return (
    <div className="grid grid-cols-3 gap-[14px]">
      <MetricCard
        label="Audience"
        value={audience}
        supporting={`from ${audienceSource}`}
      />
      <MetricCard
        label="Delivered · 30d"
        value={totalDeliveredThisMonth}
        supporting={`${deliveryRate}% delivery rate`}
      />
      <MetricCard
        label="Recipients · This period"
        value={recipientsUsedThisPeriod}
        limit={isPro ? undefined : recipientsLimit}
        progress={isPro ? undefined : Math.min(100, Math.round(ratio * 100))}
        supporting={isPro ? "Unlimited" : undefined}
      />
    </div>
  );
}
