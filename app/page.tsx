import { redirect } from "next/navigation";
import { getMe } from "@/lib/api/get-me";
import { LandingContent } from "./(landing)/_components/landing-content";

export default async function HomePage() {
  const me = await getMe();

  if (me) {
    redirect("/dashboard");
  }

  return <LandingContent />;
}
