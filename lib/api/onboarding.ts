import { apiClient } from "@/lib/api/client";
import { forwardedCookieHeader } from "@/lib/api/server-cookies";
import type {
  OnboardingStatusResponse,
  SchemaIntrospectionResult,
} from "@/lib/types/onboarding";

// GET /status is designed to always return 200 (CONNECT_SUPABASE is itself a
// valid "you're not in onboarding" answer) — the try/catch here only guards
// against genuine network/server failure, not a normal "no session" case.
export async function getOnboardingStatus(): Promise<OnboardingStatusResponse | null> {
  try {
    const res = await apiClient.get<OnboardingStatusResponse>(
      "/api/v1/onboarding/status",
      { headers: { Cookie: await forwardedCookieHeader() } },
    );
    return res.data;
  } catch {
    return null;
  }
}

export async function getSchemaIntrospection(): Promise<SchemaIntrospectionResult | null> {
  try {
    const res = await apiClient.get<SchemaIntrospectionResult>(
      "/api/v1/onboarding/schema",
      { headers: { Cookie: await forwardedCookieHeader() } },
    );
    return res.data;
  } catch {
    return null;
  }
}
