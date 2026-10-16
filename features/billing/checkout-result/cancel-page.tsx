"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {Spinner} from "@/components/onboarding/spinner";
import {startCheckout} from "@/features/billing/api/billing-client";

export function CancelPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [checkoutError, setCheckoutError] = useState(false);

  async function handleUpgrade() {
    if (checking) return;
    setChecking(true);
    setCheckoutError(false);
    try {
      await startCheckout();
    } catch {
      setChecking(false);
      setCheckoutError(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-[440px] max-w-full bg-surface border border-(--color-border) rounded-2xl px-10 pt-11 pb-9 flex flex-col items-center gap-5.5 text-center">
        <div className="size-14 rounded-full bg-white/4 border border-white/10 flex items-center justify-center shrink-0">
          <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M13 8H3.5M7.5 4 3.5 8l4 4" stroke="#8E8E9A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] font-semibold text-text-primary tracking-tight leading-[1.15]">
            No changes made.
          </h1>
          <p className="text-sm leading-[1.55] text-text-muted text-pretty">
            You&apos;re still on the Free plan.
          </p>
        </div>

        <div className="w-full flex flex-col gap-2 mt-1.5">
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={checking}
            className="flex items-center justify-center gap-2 w-full bg-orange hover:not-disabled:bg-orange-hover text-[#120C06] text-sm font-semibold rounded-lg py-3 transition-colors disabled:opacity-60 disabled:cursor-wait cursor-pointer"
          >
            {checking && (
              <Spinner size={13} className="border-[rgba(18,12,6,0.3)] border-t-[#120C06]" />
            )}
            {checking ? "Opening checkout…" : "Upgrade to Pro"}
          </button>
          <button
            type="button"
            onClick={() => { router.refresh(); router.push("/dashboard"); }}
            className="flex items-center justify-center w-full border border-white/13 text-[#B9B9C2] text-sm font-medium rounded-lg py-[11px] transition-colors hover:border-white/24 hover:text-text-primary cursor-pointer"
          >
            Back to dashboard
          </button>
        </div>

        {checkoutError && (
          <p className="text-[12.5px] text-status-failed">
            Couldn&apos;t open checkout. Try again in a moment.
          </p>
        )}
      </div>
    </div>
  );
}
