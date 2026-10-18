import {OnboardingShell} from "@/components/onboarding/onboarding-shell";
import {createServerApiClient} from "@/lib/api/client/server-client";
import type {SchemaIntrospectionResult} from "@/lib/types/onboarding";
import {ReconfigureSchemaFlow} from "@/components/settings/reconfigure/reconfigure-schema-flow";

// Landed on by the backend's real OAuth redirect — a real page, not a dialog.
export default async function ReconfigureSchemaPage() {
  const serverApiClient = await createServerApiClient();
  const schema = await serverApiClient.get<SchemaIntrospectionResult>("/api/v1/connections/schema").then((r) => r.data).catch(() => null);

  return (
    <OnboardingShell stepLabel="Reconfigure connection">
      <ReconfigureSchemaFlow schema={schema} />
    </OnboardingShell>
  );
}
