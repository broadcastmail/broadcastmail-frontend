import type { ReactNode } from "react";

interface OnboardingShellProps {
  stepLabel: string;
  children: ReactNode;
}

// Shared card chrome for every onboarding screen
export function OnboardingShell({ stepLabel, children }: OnboardingShellProps) {
  return (
    <div className="min-h-screen box-border flex items-center justify-center px-6 py-12">
      <div className="w-[520px] max-w-full box-border bg-[#0B0B0F] border border-[#1B1B22] rounded-2xl flex justify-center py-12 bg-[radial-gradient(circle,#15151B_1px,transparent_1px)] bg-[size:20px_20px]">
        <div className="w-[400px] max-w-full flex flex-col gap-[22px] px-6 sm:px-0">
          <div className="flex items-center gap-[10px]">
            <div
              className="w-[18px] h-[18px] rounded-[5px] bg-orange flex items-center justify-center font-mono text-[11px] font-semibold text-[#120C06]"
              aria-hidden="true"
            >
              b
            </div>
            <div className="font-mono text-[13px] font-medium text-[#ECECF1]">
              broadcastmail
            </div>
            <div className="font-mono text-[11px] text-[#71717D]">
              {stepLabel}
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
