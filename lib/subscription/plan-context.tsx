"use client";

import {createContext, type ReactNode, useContext} from "react";
import type {PlanId} from "@/lib/types/me";

const PlanContext = createContext<PlanId | null>(null);

export function PlanProvider({
  plan,
  children,
}: Readonly<{
    plan: PlanId;
    children: ReactNode;
}>) {
  return <PlanContext.Provider value={plan}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanId {
  const plan = useContext(PlanContext);
  if (plan === null) {
    throw new Error("usePlan() must be used within <PlanProvider>");
  }
  return plan;
}
