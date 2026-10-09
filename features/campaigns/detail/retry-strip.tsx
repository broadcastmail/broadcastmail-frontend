import {Spinner} from "@/components/onboarding/spinner";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {cn} from "@/lib/utils";

interface RetryStripProps {
  failedCount: number;
  onRetry: () => void;
  retrying: boolean;
  error: boolean;
  resendConfigured: boolean;
}

export function RetryStrip({
  failedCount,
  onRetry,
  retrying,
  error,
  resendConfigured,
}: Readonly<RetryStripProps>) {
  const disabled = retrying || !resendConfigured;

  const button = (
    <button
      type="button"
      onClick={onRetry}
      aria-disabled={disabled}
      className={cn(
        "flex items-center gap-1.75 bg-orange text-[#120C06] text-[13px] font-semibold rounded-lg px-3.75 py-2.25 transition-colors",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-orange-hover cursor-pointer",
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
      {retrying ? "Retrying…" : "Retry failed recipients"}
    </button>
  );

  return (
    <div className="flex items-center justify-between gap-5 flex-wrap pt-4 border-t border-white/[0.07]">
      <div className="flex flex-col gap-1">
        <div className="text-[13.5px] text-[#8E8E9A]">
          <span className="font-mono text-status-failed">
            {failedCount.toLocaleString()}
          </span>{" "}
          recipients didn&apos;t receive this email.
        </div>
        {error && (
          <div className="text-[12px] text-status-failed">
            Couldn&apos;t retry those recipients. Try again in a moment.
          </div>
        )}
      </div>
      {resendConfigured || retrying ? (
        button
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>Connect Resend in Settings before retrying</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
