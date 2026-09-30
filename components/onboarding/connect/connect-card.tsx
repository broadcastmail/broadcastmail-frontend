"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/onboarding/check-icon";
import { navigateToBackendRedirect } from "@/lib/api/oauth-redirect";
import { SupabaseConnectButton } from "./supabase-connect-button";

// The "isConnect" screen from the design mock. The mock's own button is a
// plain colored div; we keep the official Supabase "Connect Supabase" brand
// asset instead (public/connect-supabase-dark.svg)
export function ConnectCard() {
  const [connecting, setConnecting] = useState(false);

  async function handleConnect() {
    setConnecting(true);
    // ?projects=multi is a dev-only test hook (see mocks/handlers/oauth.ts)
    // that makes local runs default to the multi-project branch, since
    // that's the more interesting path to exercise while building this
    // out. Drop it once you want to test the single-project branch.
    await navigateToBackendRedirect(
      "/api/v1/oauth/supabase/authorize",
      "?projects=multi",
    );
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold text-[#ECECF1] tracking-[-0.02em]">
          Connect your Supabase project
        </h1>
        <p className="text-[13.5px] leading-[1.55] text-[#8E8E9A] text-pretty">
          You approve every permission on Supabase&apos;s side. We never see
          your database password or secret keys.
        </p>
      </div>

      <SupabaseConnectButton connecting={connecting} onConnect={handleConnect} />

      <div className="flex flex-col gap-2 text-[12.5px] leading-[1.5] text-[#71717D]">
        <div className="flex gap-2 items-baseline">
          <CheckIcon />
          Read-only access to email addresses only
        </div>
        <div className="flex gap-2 items-baseline">
          <CheckIcon />
          Revoke anytime from your Supabase dashboard
        </div>
      </div>
    </div>
  );
}
