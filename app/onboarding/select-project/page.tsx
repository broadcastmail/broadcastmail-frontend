import {OnboardingShell} from "@/components/onboarding/onboarding-shell";
import {SelectProjectFlow} from "@/components/onboarding/select-project/select-project-flow";
import {listProjects} from "@/lib/api/generated/oauth/oauth";
import type {ConnectionProject} from "@/lib/types/connection";

export default async function SelectProjectPage({
  searchParams,
}: Readonly<{
    searchParams: Promise<{ partialToken?: string }>;
}>) {
  const { partialToken } = await searchParams;
  const projects = await listProjects({ partialToken: partialToken ?? "" }).catch(() => []) as unknown as ConnectionProject[];

  return (
    <OnboardingShell stepLabel="step 1 / 2">
      <SelectProjectFlow partialToken={partialToken ?? ""} projects={projects} />
    </OnboardingShell>
  );
}
