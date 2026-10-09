import {OnboardingShell} from "@/components/onboarding/onboarding-shell";
import {SelectProjectFlow} from "@/components/onboarding/select-project/select-project-flow";
import {listOnboardingProjects} from "@/features/onboarding/api/onboarding";

export default async function SelectProjectPage({
  searchParams,
}: Readonly<{
    searchParams: Promise<{ partialToken?: string }>;
}>) {
  const { partialToken } = await searchParams;
  const projects = await listOnboardingProjects(partialToken ?? "");

  return (
    <OnboardingShell stepLabel="step 1 / 2">
      <SelectProjectFlow partialToken={partialToken ?? ""} projects={projects} />
    </OnboardingShell>
  );
}
