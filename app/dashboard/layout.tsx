import { redirect } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { getMe } from "@/lib/api/get-me";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getMe();

  if (!me) {
    redirect("/"); // not authenticated → landing page
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav email={me.email} connectionName={me.connectionName} />
      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
    </div>
  );
}
