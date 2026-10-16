import {createServerApiClient} from "@/lib/api/client/server-client";

export interface SubscriptionInfo {
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export async function getSubscription(): Promise<SubscriptionInfo | null> {
  try {
    const client = await createServerApiClient();
    const res = await client.get<SubscriptionInfo>("/api/v1/billing/subscription");
    return res.data;
  } catch {
    return null;
  }
}

export async function verifyCheckoutSession(sessionId: string): Promise<boolean> {
  try {
    const client = await createServerApiClient();
    await client.get(`/api/v1/billing/checkout/session?session_id=${encodeURIComponent(sessionId)}`);
    return true;
  } catch {
    return false;
  }
}
