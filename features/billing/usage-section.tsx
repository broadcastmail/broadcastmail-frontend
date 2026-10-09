"use client";

import {SectionCard} from "@/components/layout/section-card";
import {MetricCard} from "@/components/dashboard/metric-card";
import {startCheckout} from "@/features/billing/api/billing";
import {isProPlan} from "@/lib/subscription/plans";
import {usePlan} from "@/lib/subscription/plan-context";
import {useCheckoutRedirect} from "@/lib/subscription/use-checkout-redirect";

interface UsageSectionProps {
  recipientsUsed: number;
  recipientsLimit: number;
  campaignCount: number;
}
export function UsageSection({
  recipientsUsed,
  recipientsLimit,
  campaignCount,
}: Readonly<UsageSectionProps>) {
  const isPro = isProPlan(usePlan());
  const ratio = recipientsLimit > 0 ? recipientsUsed / recipientsLimit : 0;
  const atLimit = !isPro && recipientsUsed >= recipientsLimit;
  const { redirecting, redirect } = useCheckoutRedirect();

  function handleUpgradeClick() {
    redirect(startCheckout, "Couldn't start checkout — try again.");
  }

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
            onClick={handleUpgradeClick}
            disabled={redirecting}
            className="text-[12.5px] text-orange hover:text-orange-hover whitespace-nowrap disabled:opacity-60 disabled:cursor-wait cursor-pointer"
          >
            {redirecting ? "Redirecting…" : "Upgrade to Pro →"}
          </button>
        </div>
      )}
    </SectionCard>
  );
}
