import { apiClient } from "@/lib/api/client";
import type { MeResponse } from "@/lib/types/me";

export async function logout(): Promise<void> {
  await apiClient.post("/api/v1/auth/logout");
}


export async function getMe(): Promise<MeResponse | null> {
  try {
    const res = await apiClient.get<MeResponse>("/api/v1/me");
    return res.data;
  } catch {
    return null;
  }
}
