import { redirect } from "next/navigation";
import { getOnboardingStatus } from "@/lib/api/onboarding";
import { ONBOARDING_STEP_PATH } from "@/lib/onboarding-steps";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { ConfirmStep } from "@/components/onboarding/confirm/confirm-step";

export default async function ConfirmPage() {
  const status = await getOnboardingStatus();
  if (!status || status.step !== "CONFIRM_ACCOUNT") {
    redirect(status ? ONBOARDING_STEP_PATH[status.step] : "/");
  }

  return (
    <OnboardingShell stepLabel="step 2 / 2">
      <ConfirmStep
        projectRef={status.projectRef}
        confirmedTable={status.confirmedTable}
        fromAddress={status.fromAddress}
      />
    </OnboardingShell>
  );
}
