"use client";

import {useRouter, useSearchParams} from "next/navigation";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import {usePlan} from "@/lib/subscription/plan-context";
import {isProPlan} from "@/lib/subscription/plans";

export function PortalReturnDialog() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isPro = isProPlan(usePlan());
  const fromPortal = searchParams.get("from") === "portal";
  const open = fromPortal;

  function dismiss() {
    router.replace("/billing", { scroll: false });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss(); }}>
      <DialogContent showClose={false} className="max-w-[400px]">
        <div className="flex flex-col items-center gap-5 text-center pt-2">
          <div className="size-12 rounded-full bg-status-resolving-bg border border-orange/32 flex items-center justify-center shrink-0">
            {isPro ? (
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="#F0973F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 3v5M8 11v1" stroke="#F0973F" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </div>

          <DialogHeader>
            <DialogTitle className="text-center text-[18px]">
              {isPro ? "You're all set" : "Plan updated"}
            </DialogTitle>
            <DialogDescription className="text-center text-pretty">
              {isPro
                ? "Any changes may take a moment to reflect here."
                : "You're now on the free plan. Filters and sends over 500 recipients are no longer available."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="w-full pt-0">
            <button
              type="button"
              onClick={dismiss}
              className="w-full bg-orange hover:bg-orange-hover text-[#120C06] text-sm font-semibold rounded-lg py-2.5 transition-colors cursor-pointer"
            >
              Got it
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
