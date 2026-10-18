import {redirect} from "next/navigation";
import {TopNav} from "@/components/layout/top-nav";
import {createServerApiClient} from "@/lib/api/client/server-client";
import type {MeResponse} from "@/lib/types/me";
import {UnsavedChangesProvider} from "@/lib/navigation/unsaved-changes-guard";
import {PlanProvider} from "@/lib/subscription/plan-context";
import {ActiveSendObserver} from "@/features/campaigns/shared/active-send-observer";

export async function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  let me: MeResponse | null = null;
  try {
    const serverApiClient = await createServerApiClient();
    const res = await serverApiClient.get<MeResponse>("/api/v1/me");
    me = res.data;
  } catch { /* ignore */ }

  if (!me) {
    redirect("/");
  }

  return (
    <PlanProvider plan={me.plan}>
      <UnsavedChangesProvider>
        <div className="flex flex-col h-screen overflow-hidden">
          <TopNav email={me.email} connectionName={me.connectionName} />
          <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
          <ActiveSendObserver />
        </div>
      </UnsavedChangesProvider>
    </PlanProvider>
  );
}
