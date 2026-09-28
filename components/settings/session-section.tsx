"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/layout/section-card";
import { logout } from "@/lib/api/auth";

export function SessionSection() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await logout();
      router.push("/");
    } catch {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="Session">
      <div className="flex items-center justify-between gap-5 flex-wrap">
        <p className="text-[12.5px] leading-[1.55] text-text-muted max-w-105 text-pretty">
          Signing out ends your current session. Sign back in at any time via
          Supabase OAuth.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={loading}
          className="bg-transparent border border-white/13 text-[#B9B9C2] text-[12px] font-medium rounded-[7px] px-3 py-1.75 whitespace-nowrap transition-colors hover:border-white/24 hover:text-text-primary disabled:opacity-60 disabled:cursor-wait cursor-pointer"
        >
          {loading ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </SectionCard>
  );
}
