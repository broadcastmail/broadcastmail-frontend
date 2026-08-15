"use client";

import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";

export function SignInButton() {
  const router = useRouter();

  async function handleSignIn() {
    await apiClient.post("/api/v1/auth/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignIn}
      className="bg-orange hover:bg-orange-hover text-[#120C06] text-[13.5px] font-semibold rounded-lg px-5 py-2.5 cursor-pointer transition-colors"
    >
      Sign in
    </button>
  );
}
