import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { SelectProjectFlow } from "@/components/onboarding/select-project/select-project-flow";
import { listOnboardingProjects } from "@/lib/api/onboarding";

// Landed on when a reconfigured account has multiple projects to pick from.
export default async function ReconfigureSelectProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ partialToken?: string }>;
}) {
  const { partialToken } = await searchParams;
  const projects = await listOnboardingProjects(partialToken ?? "");

  return (
    <OnboardingShell stepLabel="Reconfigure connection">
      <SelectProjectFlow partialToken={partialToken ?? ""} projects={projects} />
    </OnboardingShell>
  );
}
