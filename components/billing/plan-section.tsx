"use client";

import { Check } from "lucide-react";
import { SectionCard } from "@/components/layout/section-card";
import { FieldRow } from "@/components/layout/field-row";
import { Spinner } from "@/components/onboarding/spinner";
import { PLAN_LABEL, PLAN_PRICE, PLAN_FEATURES, isProPlan } from "@/lib/billing/plans";
import { startCheckout, startBillingPortal } from "@/lib/api/billing";
import { usePlan } from "@/lib/billing/plan-context";
import { useCheckoutRedirect } from "@/lib/billing/use-checkout-redirect";

export function PlanSection() {
  const plan = usePlan();
  const isPro = isProPlan(plan);
  const price = PLAN_PRICE[plan];
  const { redirecting, redirect } = useCheckoutRedirect();

  function handleClick() {
    redirect(
      isPro ? startBillingPortal : startCheckout,
      isPro
        ? "Couldn't open subscription management — try again."
        : "Couldn't start checkout — try again.",
    );
  }

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
            onClick={handleClick}
            disabled={redirecting}
            className="flex items-center gap-1.75 bg-transparent border border-white/13 text-[#B9B9C2] text-[12.5px] font-medium rounded-lg px-3.25 py-2 whitespace-nowrap transition-colors hover:border-white/24 hover:text-text-primary disabled:opacity-60 disabled:cursor-wait cursor-pointer"
          >
            {redirecting && (
              <Spinner size={11} className="border-[#26262F] border-t-[#B9B9C2]" />
            )}
            {redirecting ? "Redirecting…" : "Manage subscription →"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            disabled={redirecting}
            className="flex items-center gap-1.75 bg-orange hover:not-disabled:bg-orange-hover text-[#120C06] text-[13.5px] font-semibold rounded-lg px-4 py-2.5 whitespace-nowrap transition-colors disabled:opacity-60 disabled:cursor-wait cursor-pointer"
          >
            {redirecting && (
              <Spinner size={12} className="border-[rgba(18,12,6,0.3)] border-t-[#120C06]" />
            )}
            {redirecting ? "Redirecting…" : "Upgrade to Pro →"}
          </button>
        )}
      </div>
    </SectionCard>
  );
}
