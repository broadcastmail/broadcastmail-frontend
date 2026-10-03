import { getMe } from "@/lib/api/get-me";
import { getAccountEmailProvider, getReconnectSchema } from "@/lib/api/account";
import { AccountSection } from "./account-section";
import { SupabaseSection } from "./supabase-section";
import { EmailProviderSection } from "./email-provider-section";
import { SessionSection } from "./session-section";

export async function SettingsContent() {
  const [me, schema, emailProvider] = await Promise.all([
    getMe(),
    getReconnectSchema(),
    getAccountEmailProvider(),
  ]);

  return (
    <div className="flex-1 overflow-y-auto px-8 py-9 flex justify-center">
      <div className="w-full max-w-280 flex flex-col gap-4">
        {me && <AccountSection email={me.email} />}
        <SupabaseSection
          connectionName={me?.connectionName ?? null}
          schema={schema}
        />
        <EmailProviderSection emailProvider={emailProvider} />
        <SessionSection />
      </div>
    </div>
  );
}
