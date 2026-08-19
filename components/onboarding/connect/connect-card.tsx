"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckIcon } from "@/components/onboarding/check-icon";
import { Spinner } from "@/components/onboarding/spinner";

// The "isConnect" screen from the design mock. The mock's own button is a
// plain colored div; we keep the official Supabase "Connect Supabase" brand
// asset instead (public/connect-supabase-dark.svg)
export function ConnectCard() {
  const [connecting, setConnecting] = useState(false);

  async function handleConnect() {
    setConnecting(true);
    if (process.env.NODE_ENV === "development") {
      // MSW's Service Worker explicitly bypasses navigation-mode requests
      // (window.location.href) — it can only intercept fetch()/XHR. So in
      // dev, resolve the mocked redirect via fetch first (the browser
      // auto-follows same-origin redirects, landing response.url on the
      // final destination), then perform the real navigation ourselves.
      //
      // ?projects=multi is a dev-only test hook (see mocks/handlers/oauth.ts)
      // that makes local runs default to the multi-project branch, since
      // that's the more interesting path to exercise while building this
      // out. Drop it once you want to test the single-project branch.
      const res = await fetch(
        "/api/v1/oauth/supabase/authorize?projects=multi",
      );
      window.location.href = res.url;
      return;
    }
    // Production: a genuine cross-origin redirect to the backend, which
    // redirects again to Supabase's real OAuth consent screen — that only
    // works as an actual top-level navigation, not a fetch().
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/oauth/supabase/authorize`;
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

      <button
        type="button"
        onClick={handleConnect}
        disabled={connecting}
        className="flex flex-col items-center gap-2 cursor-pointer disabled:cursor-wait"
      >
        <Image
          src="/connect-supabase-dark.svg"
          alt="Connect Supabase"
          width={196}
          height={44}
          className="transition-opacity"
          style={{ opacity: connecting ? 0.6 : 1 }}
        />
        {connecting && (
          <span className="flex items-center gap-2 text-[13px] text-[#8E8E9A]">
            <Spinner size={12} className="border-[#26262F] border-t-orange" />
            Opening Supabase…
          </span>
        )}
      </button>

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
