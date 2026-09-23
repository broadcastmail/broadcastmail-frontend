"use client";

import Image from "next/image";
import { Spinner } from "@/components/onboarding/spinner";

interface SupabaseConnectButtonProps {
  connecting: boolean;
  onConnect: () => void;
}

export function SupabaseConnectButton({
  connecting,
  onConnect,
}: SupabaseConnectButtonProps) {
  return (
    <button
      type="button"
      onClick={onConnect}
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
  );
}
