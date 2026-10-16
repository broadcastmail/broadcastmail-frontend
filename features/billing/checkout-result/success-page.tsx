"use client";

import {useEffect, useRef, useState} from "react";
import {useRouter} from "next/navigation";
import {Spinner} from "@/components/onboarding/spinner";
import {pollForPro} from "@/features/billing/api/billing-client";

type State = "polling" | "ready" | "timeout";

export function SuccessPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("polling");
  const firedRef = useRef(false);

  function go() {
    if (firedRef.current) return;
    firedRef.current = true;
    router.refresh();
    router.push("/dashboard");
  }

  useEffect(() => {
    pollForPro().then((activated) => {
      setState(activated ? "ready" : "timeout");
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-[440px] max-w-full bg-surface border border-(--color-border) rounded-2xl px-10 pt-11 pb-9 flex flex-col items-center gap-5.5 text-center">
        <div className="size-14 rounded-full bg-status-resolving-bg border border-orange/32 flex items-center justify-center shrink-0">
          {state === "polling" ? (
            <Spinner size={22} className="border-orange/30 border-t-orange" />
          ) : (
            <svg width="26" height="26" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="#F0973F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] font-semibold text-text-primary tracking-tight leading-[1.15]">
            {state === "polling" ? "Activating your account…" : "You're on Pro"}
          </h1>
          <p className="text-sm leading-[1.55] text-text-muted text-pretty">
            {state === "timeout"
              ? "This is taking longer than expected. You'll receive a confirmation email shortly."
              : state === "ready"
              ? "Filters, scheduling, and 90-day history are now unlocked."
              : "Confirming your payment…"}
          </p>
        </div>

        {state !== "polling" && (
          <div className="w-full mt-1.5">
            <button
              type="button"
              onClick={go}
              className="flex items-center justify-center gap-2 w-full bg-orange hover:bg-orange-hover text-[#120C06] text-sm font-semibold rounded-lg py-3 transition-colors cursor-pointer"
            >
              {state === "ready" ? "Go to dashboard" : "Go to dashboard anyway"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
