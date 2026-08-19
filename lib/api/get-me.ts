import { apiClient } from "@/lib/api/client";
import { forwardedCookieHeader } from "@/lib/api/server-cookies";
import { MeResponse } from "@/lib/types/me";

export async function getMe(): Promise<MeResponse | null> {
  try {
    const res = await apiClient.get<MeResponse>("/api/v1/me", {
      headers: { Cookie: await forwardedCookieHeader() },
    });
    return res.data;
  } catch {
    return null;
  }
}
