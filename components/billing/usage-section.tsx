import { SectionCard } from "@/components/layout/section-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import type { PlanId } from "@/lib/types/me";

interface UsageSectionProps {
  plan: PlanId;
  recipientsUsed: number;
  recipientsLimit: number;
  campaignCount: number;
}
export function UsageSection({
  plan,
  recipientsUsed,
  recipientsLimit,
  campaignCount,
}: UsageSectionProps) {
  const isPro = plan === "pro";
  const ratio = recipientsLimit > 0 ? recipientsUsed / recipientsLimit : 0;
  const atLimit = !isPro && recipientsUsed >= recipientsLimit;

  return (
    <SectionCard title="Usage">
      <div className="grid grid-cols-2 gap-3.5">
        <MetricCard
          label="Recipients · this period"
          value={recipientsUsed}
          limit={isPro ? undefined : recipientsLimit}
          progress={isPro ? undefined : Math.min(100, ratio * 100)}
          progressColor={ratio >= 0.8 ? "danger" : "orange"}
          supporting={
            isPro
              ? "Unlimited"
              : `${Math.round(ratio * 100)}% of your monthly allowance`
          }
        />
        <MetricCard
          label="Campaigns"
          value={campaignCount}
          supporting={isPro ? "Unlimited" : "No limit on free"}
        />
      </div>

      {atLimit && (
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <p className="text-[12.5px] leading-[1.55] text-orange max-w-140 text-pretty">
            You&apos;ve reached your limit for this period. Campaigns will be
            blocked until the period resets or you upgrade.
          </p>
          <button
            type="button"
            className="text-[12.5px] text-orange hover:text-orange-hover whitespace-nowrap cursor-pointer"
          >
            Upgrade to Pro →
          </button>
        </div>
      )}
    </SectionCard>
  );
}
