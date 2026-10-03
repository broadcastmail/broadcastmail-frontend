import { MetricCard } from "@/components/dashboard/metric-card";

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
  const progress = Math.round(
    (recipientsUsedThisPeriod / recipientsLimit) * 100,
  );

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
        limit={recipientsLimit}
        progress={progress}
      />
    </div>
  );
}
