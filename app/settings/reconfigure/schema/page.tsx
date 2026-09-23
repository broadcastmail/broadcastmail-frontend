import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { getReconfigureSchema } from "@/lib/api/onboarding";
import { ReconfigureSchemaFlow } from "@/components/settings/reconfigure/reconfigure-schema-flow";

// Landed on by the backend's real OAuth redirect — a real page, not a dialog.
export default async function ReconfigureSchemaPage() {
  const schema = await getReconfigureSchema();

  return (
    <OnboardingShell stepLabel="Reconfigure connection">
      <ReconfigureSchemaFlow schema={schema} />
    </OnboardingShell>
  );
}
