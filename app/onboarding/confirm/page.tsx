import {redirect} from "next/navigation";
import {createServerApiClient} from "@/lib/api/client/server-client";
import type {OnboardingStatusResponse} from "@/lib/types/onboarding";
import {ONBOARDING_STEP_PATH} from "@/lib/onboarding-steps";
import {OnboardingShell} from "@/components/onboarding/onboarding-shell";
import {ConfirmStep} from "@/components/onboarding/confirm/confirm-step";

export default async function ConfirmPage() {
  let status: OnboardingStatusResponse | null = null;
  try {
    const serverApiClient = await createServerApiClient();
    const res = await serverApiClient.get<OnboardingStatusResponse>("/api/v1/onboarding/status");
    status = res.data;
  } catch { /* ignore */ }
  if (status?.step !== "CONFIRM_ACCOUNT") {
    redirect(status ? ONBOARDING_STEP_PATH[status.step] : "/");
  }

  return (
    <OnboardingShell stepLabel="step 2 / 2">
      <ConfirmStep
        projectRef={status.recapData.projectRef}
        confirmedTable={status.recapData.confirmedTable}
        fromAddress={status.recapData.fromAddress}
      />
    </OnboardingShell>
  );
}
