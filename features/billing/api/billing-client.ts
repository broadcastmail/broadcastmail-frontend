import {apiClient} from "@/lib/api/client/client";
import type {SubscriptionInfo} from "./billing-server";

export async function startCheckout(): Promise<void> {
  const res = await apiClient.post<{ url: string }>("/api/v1/billing/checkout");
  window.location.href = res.data.url;
}

export async function startBillingPortal(): Promise<void> {
  const res = await apiClient.post<{ url: string }>("/api/v1/billing/portal");
  window.location.href = res.data.url;
}

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 10;

export async function pollForPro(): Promise<boolean> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    if (i > 0) await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    try {
      const res = await apiClient.get<SubscriptionInfo>("/api/v1/billing/subscription");
      if (res.data.currentPeriodEnd !== null) return true;
    } catch {
      // keep polling
    }
  }
  return false;
}
