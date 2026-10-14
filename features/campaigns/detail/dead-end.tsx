import {Spinner} from "@/components/onboarding/spinner";
import {Tooltip, TooltipContent, TooltipTrigger,} from "@/components/ui/tooltip";
import {cn} from "@/lib/utils";

interface DeadEndProps {
  onRetry: () => void;
  retrying: boolean;
  canRetry: boolean;
  errorMessage: string | null;
  resendConfigured: boolean;
}

export function DeadEnd({
  onRetry,
  retrying,
  canRetry,
  errorMessage,
  resendConfigured,
}: Readonly<DeadEndProps>) {
  const disabled = retrying || !resendConfigured;

  const button = (
    <button
      type="button"
      onClick={onRetry}
      aria-disabled={disabled}
      className={cn(
        "flex items-center gap-1.75 bg-orange text-[#120C06] text-[13.5px] font-semibold rounded-lg px-4 py-2.5 transition-colors mt-2",
        disabled
          ? "opacity-60 cursor-not-allowed"
          : "hover:bg-orange-hover cursor-pointer",
      )}
    >
      {retrying ? (
        <Spinner size={12} className="border-[#120C06]/30 border-t-[#120C06]" />
      ) : (
        <svg width="13" height="13" viewBox="0 0 14 14">
          <path
            d="M12 7a5 5 0 11-1.6-3.7M12 1.5V4h-2.5"
            stroke="#120C06"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {retrying ? "Retrying…" : "Try again"}
    </button>
  );

  return (
    <div className="bg-white/3 backdrop-blur-sm border border-(--color-border) rounded-xl py-14 px-6 flex flex-col items-center gap-3">
      <div className="text-[17px] font-semibold text-text-primary">
        This campaign didn&apos;t send.
      </div>
      <div className="text-[13.5px] text-[#8E8E9A] text-center text-balance">
        Resolution failed before any emails were delivered.
      </div>
      {canRetry && (resendConfigured || retrying ? (
        button
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            Connect Resend in Settings before retrying
          </TooltipContent>
        </Tooltip>
      ))}
      {errorMessage && (
        <div className="text-[12.5px] text-status-failed">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
