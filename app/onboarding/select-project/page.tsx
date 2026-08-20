import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { SelectProjectFlow } from "@/components/onboarding/select-project/select-project-flow";

export default async function SelectProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ partialToken?: string }>;
}) {
  const { partialToken } = await searchParams;

  return (
    <OnboardingShell stepLabel="step 1 / 2">
      <SelectProjectFlow partialToken={partialToken ?? ""} />
    </OnboardingShell>
  );
}
