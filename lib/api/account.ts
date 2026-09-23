import { apiClient } from "@/lib/api/client";
import { forwardedCookieHeader } from "@/lib/api/server-cookies";
import type { AccountMetricsResponse } from "@/lib/types/metrics";
import type { AccountEmailProviderInfo } from "@/mocks/fixtures";
import type { SchemaIntrospectionResult } from "@/lib/types/onboarding";
export async function getAccountMetrics(): Promise<AccountMetricsResponse | null> {
  try {
    const res = await apiClient.get<AccountMetricsResponse>(
      "/api/v1/account/metrics",
      { headers: { Cookie: await forwardedCookieHeader() } },
    );
    return res.data;
  } catch {
    return null;
  }
}

export async function getAccountEmailProvider(): Promise<AccountEmailProviderInfo | null> {
  try {
    const res = await apiClient.get<AccountEmailProviderInfo>(
      "/api/v1/account/email-provider",
      { headers: { Cookie: await forwardedCookieHeader() } },
    );
    return res.data;
  } catch {
    return null;
  }
}

// Account-authenticated schema fetch, for Settings' initial page load.
export async function getReconnectSchema(): Promise<SchemaIntrospectionResult | null> {
  try {
    const res = await apiClient.get<SchemaIntrospectionResult>(
      "/api/v1/connections/schema/reconnect",
      { headers: { Cookie: await forwardedCookieHeader() } },
    );
    return res.data;
  } catch {
    return null;
  }
}
