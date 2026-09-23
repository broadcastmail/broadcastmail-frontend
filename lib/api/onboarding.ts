import { apiClient } from "@/lib/api/client";
import { forwardedCookieHeader } from "@/lib/api/server-cookies";
import type {
  OnboardingStatusResponse,
  SchemaIntrospectionResult,
} from "@/lib/types/onboarding";
import type { ConnectionProject } from "@/lib/types/connection";

// GET /status always returns 200 — try/catch only guards real network failure.
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

// Reconfigure's schema fetch — same onboarding_session, mounted under /connections.
export async function getReconfigureSchema(): Promise<SchemaIntrospectionResult | null> {
  try {
    const res = await apiClient.get<SchemaIntrospectionResult>(
      "/api/v1/connections/schema",
      { headers: { Cookie: await forwardedCookieHeader() } },
    );
    return res.data;
  } catch {
    return null;
  }
}

// No cookie needed — the partial token itself is the credential.
export async function listOnboardingProjects(
  partialToken: string,
): Promise<ConnectionProject[]> {
  try {
    const res = await apiClient.get<ConnectionProject[]>(
      "/api/v1/oauth/supabase/projects",
      { params: { partialToken } },
    );
    return res.data;
  } catch {
    return [];
  }
}
