import { redirect } from "next/navigation";
import { getOnboardingStatus, getSchemaIntrospection } from "@/lib/api/onboarding";
import { ONBOARDING_STEP_PATH } from "@/lib/onboarding-steps";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { EmailProviderForm } from "@/components/onboarding/email-provider/email-provider-form";

export default async function EmailProviderPage() {
  const status = await getOnboardingStatus();
  if (!status || status.step !== "CONNECT_RESEND") {
    redirect(status ? ONBOARDING_STEP_PATH[status.step] : "/");
  }

  const schema = await getSchemaIntrospection();
  const connectedTable =
    schema?.status === "DETECTED"
      ? `${schema.userTableSchema}.${schema.userTableName}`
      : null;

  return (
    <OnboardingShell stepLabel="step 2 / 2">
      <EmailProviderForm connectedTable={connectedTable} />
    </OnboardingShell>
  );
}
