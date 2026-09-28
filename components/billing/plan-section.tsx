import { Check } from "lucide-react";
import { SectionCard } from "@/components/layout/section-card";
import { FieldRow } from "@/components/layout/field-row";
import { PLAN_LABEL, PLAN_PRICE, PLAN_FEATURES } from "@/lib/billing/plans";
import type { PlanId } from "@/lib/types/me";

interface PlanSectionProps {
  plan: PlanId;
}

// Real-backend TODO: neither button below goes anywhere yet — there's no
// checkout/subscription-management flow to link to (see lib/api/campaigns.ts
// for the same kind of "not on the API yet" note elsewhere in this app).
export function PlanSection({ plan }: PlanSectionProps) {
  const isPro = plan === "pro";
  const price = PLAN_PRICE[plan];

  return (
    <SectionCard title="Plan">
      <FieldRow label="Current plan">
        <div className="flex items-baseline gap-2.25 flex-wrap text-[13.5px] text-text-primary">
          {PLAN_LABEL[plan]}
          {price && (
            <>
              <span className="text-text-dim">·</span>
              <span className="text-[12.5px] text-text-muted whitespace-nowrap">
                {price}
              </span>
            </>
          )}
        </div>
      </FieldRow>

      <div className="flex flex-col gap-2.25 pl-41.5">
        {PLAN_FEATURES[plan].map((feature) => (
          <div
            key={feature}
            className="flex gap-2.25 items-baseline text-[13px] text-text-muted"
          >
            <Check
              size={11}
              className="text-status-sent shrink-0 translate-y-px"
              strokeWidth={2.5}
            />
            {feature}
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-1">
        {isPro ? (
          <button
            type="button"
            className="flex items-center bg-transparent border border-white/13 text-[#B9B9C2] text-[12.5px] font-medium rounded-lg px-3.25 py-2 whitespace-nowrap transition-colors hover:border-white/24 hover:text-text-primary cursor-pointer"
          >
            Manage subscription →
          </button>
        ) : (
          <button
            type="button"
            className="flex items-center bg-orange hover:bg-orange-hover text-[#120C06] text-[13.5px] font-semibold rounded-lg px-4 py-2.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            Upgrade to Pro →
          </button>
        )}
      </div>
    </SectionCard>
  );
}
