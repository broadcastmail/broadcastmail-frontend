import {createServerApiClient} from "@/lib/api/client/server-client";
import type {AccountMetricsResponse} from "@/lib/types/metrics";
import type {AccountEmailProviderInfo} from "@/mocks/fixtures";
import type {SchemaIntrospectionResult} from "@/lib/types/onboarding";

export async function getAccountMetrics(): Promise<AccountMetricsResponse | null> {
  try {
    const serverApiClient = await createServerApiClient();
    const res = await serverApiClient.get<AccountMetricsResponse>("/api/v1/account/metrics");
    return res.data;
  } catch {
    return null;
  }
}

export async function getAccountEmailProvider(): Promise<AccountEmailProviderInfo | null> {
  try {
    const serverApiClient = await createServerApiClient();
    const res = await serverApiClient.get<AccountEmailProviderInfo>("/api/v1/account/email-provider");
    return res.data;
  } catch {
    return null;
  }
}

// Account-authenticated schema fetch, for Settings' initial page load.
export async function getReconnectSchema(): Promise<SchemaIntrospectionResult | null> {
  try {
    const serverApiClient = await createServerApiClient();
    const res = await serverApiClient.get<SchemaIntrospectionResult>(
      "/api/v1/connections/schema/reconnect",
    );
    return res.data;
  } catch {
    return null;
  }
}
