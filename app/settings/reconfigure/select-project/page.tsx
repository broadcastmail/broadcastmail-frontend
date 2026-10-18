import {OnboardingShell} from "@/components/onboarding/onboarding-shell";
import {SelectProjectFlow} from "@/components/onboarding/select-project/select-project-flow";
import {listProjects} from "@/lib/api/generated/oauth/oauth";
import type {ConnectionProject} from "@/lib/types/connection";

// Landed on when a reconfigured account has multiple projects to pick from.
export default async function ReconfigureSelectProjectPage({
  searchParams,
}: Readonly<{
    searchParams: Promise<{ partialToken?: string }>;
}>) {
  const { partialToken } = await searchParams;
  const projects = await listProjects({ partialToken: partialToken ?? "" }).catch(() => []) as unknown as ConnectionProject[];

  return (
    <OnboardingShell stepLabel="Reconfigure connection">
      <SelectProjectFlow partialToken={partialToken ?? ""} projects={projects} />
    </OnboardingShell>
  );
}
