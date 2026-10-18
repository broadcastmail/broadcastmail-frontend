import {createServerApiClient} from "@/lib/api/client/server-client";
import type {MeResponse} from "@/lib/types/me";
import type {SchemaIntrospectionResult} from "@/lib/types/onboarding";
import type {AccountEmailProviderInfo} from "@/mocks/fixtures";
import {AccountSection} from "./account-section";
import {SupabaseSection} from "./supabase-section";
import {EmailProviderSection} from "./email-provider-section";
import {SessionSection} from "./session-section";

export async function SettingsContent() {
  const serverApiClient = await createServerApiClient();
  const [me, schema, emailProvider] = await Promise.all([
    serverApiClient.get<MeResponse>("/api/v1/me").then((r) => r.data).catch(() => null),
    serverApiClient.get<SchemaIntrospectionResult>("/api/v1/connections/schema/reconnect").then((r) => r.data).catch(() => null),
    serverApiClient.get<AccountEmailProviderInfo>("/api/v1/account/email-provider").then((r) => r.data).catch(() => null),
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
