import { redirect } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { getMe } from "@/lib/api/get-me";
import { UnsavedChangesProvider } from "@/lib/navigation/unsaved-changes-guard";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const me = await getMe();

  if (!me) {
    redirect("/");
  }

  return (
    <UnsavedChangesProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <TopNav email={me.email} connectionName={me.connectionName} />
        <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
      </div>
    </UnsavedChangesProvider>
  );
}
