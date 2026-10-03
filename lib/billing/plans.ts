import type { PlanId } from "@/lib/types/me";

export const PLAN_LABEL: Record<PlanId, string> = {
  free: "Free",
  pro: "Pro",
};

// Only Pro carries a price line next to its name in plan-section.tsx —
// Free has nothing to show there.
export const PLAN_PRICE: Partial<Record<PlanId, string>> = {
  pro: "$9 / month",
};

export const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: [
    "500 recipients per rolling 30-day period",
    "Unlimited campaigns",
    "Email support",
  ],
  pro: ["Unlimited recipients", "Unlimited campaigns", "Priority support"],
};
