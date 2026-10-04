import { apiClient } from "@/lib/api/client";

interface CheckoutSessionResponse {
  url: string;
}

export async function startCheckout(): Promise<void> {
  const res = await apiClient.post<CheckoutSessionResponse>(
    "/api/v1/billing/checkout",
  );
  window.location.href = res.data.url;
}

export async function startBillingPortal(): Promise<void> {
  const res = await apiClient.post<CheckoutSessionResponse>(
    "/api/v1/billing/portal",
  );
  window.location.href = res.data.url;
}
