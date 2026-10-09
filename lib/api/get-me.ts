import {createServerApiClient} from "@/lib/api/client/server-client";
import {MeResponse} from "@/lib/types/me";

export async function getMe(): Promise<MeResponse | null> {
  try {
    const serverApiClient = await createServerApiClient();
    const res = await serverApiClient.get<MeResponse>("/api/v1/me");
    return res.data;
  } catch {
    return null;
  }
}
