import type { PlanId } from "@/lib/types/me";

export const PLAN_LABEL: Record<PlanId, string> = {
  FREE: "Free",
  PRO: "Pro",
};

export const PLAN_PRICE: Partial<Record<PlanId, string>> = {
  PRO: "$9 / month",
};

export const PLAN_FEATURES: Record<PlanId, string[]> = {
  FREE: [
    "500 recipients per rolling 30-day period",
    "Unlimited campaigns",
    "Audience filters require Pro",
    "Email support",
  ],
  PRO: [
    "Unlimited recipients",
    "Unlimited campaigns",
    "Audience filters",
    "Priority support",
  ],
};

export function isProPlan(plan: PlanId): boolean {
  return plan === "PRO";
}

export function isFreePlan(plan: PlanId): boolean {
  return !isProPlan(plan);
}
