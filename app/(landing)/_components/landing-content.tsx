import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { ConnectCard } from "@/components/onboarding/connect/connect-card";

export function LandingContent() {
  return (
    <OnboardingShell stepLabel="step 1 / 2">
      <ConnectCard />
    </OnboardingShell>
  );
}
