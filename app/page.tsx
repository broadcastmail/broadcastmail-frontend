import { TopNav } from "@/components/layout/top-nav";
import { apiClient } from "@/lib/api/client";
import { forwardedCookieHeader } from "@/lib/api/server-cookies";
import { MeResponse } from "@/lib/types/me";
import { DashboardContent } from "./(dasboard)/_components/dashboard-content";
import { LandingContent } from "./(landing)/_components/landing-content";

async function getMe() {
  try {
    const res = await apiClient.get<MeResponse>("/api/v1/me", {
      headers: { Cookie: await forwardedCookieHeader() },
    });
    return res.data;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const me = await getMe();

  if (!me) {
    return <LandingContent />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav email={me.email} connectionName={me.connectionName} />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <DashboardContent />
      </main>
    </div>
  );
}
