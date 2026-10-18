import {redirect} from "next/navigation";
import {createServerApiClient} from "@/lib/api/client/server-client";
import type {MeResponse} from "@/lib/types/me";
import {LandingContent} from "./(landing)/_components/landing-content";

export default async function HomePage() {
  let me: MeResponse | null = null;
  try {
    const serverApiClient = await createServerApiClient();
    const res = await serverApiClient.get<MeResponse>("/api/v1/me");
    me = res.data;
  } catch { /* ignore */ }

  if (me) {
    redirect("/dashboard");
  }

  return <LandingContent />;
}
