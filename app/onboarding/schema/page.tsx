import {redirect} from "next/navigation";
import {getOnboardingStatus, getSchemaIntrospection} from "@/features/onboarding/api/onboarding";
import {ONBOARDING_STEP_PATH} from "@/lib/onboarding-steps";
import {OnboardingShell} from "@/components/onboarding/onboarding-shell";
import {SchemaFlow} from "@/components/onboarding/schema/schema-flow";

export default async function SchemaPage() {
  const status = await getOnboardingStatus();
  if (status?.step !== "CONFIRM_SCHEMA") {
    redirect(status ? ONBOARDING_STEP_PATH[status.step] : "/");
  }

  const schema = await getSchemaIntrospection();

  return (
    <OnboardingShell stepLabel="step 1 / 2">
      <SchemaFlow schema={schema} />
    </OnboardingShell>
  );
}
