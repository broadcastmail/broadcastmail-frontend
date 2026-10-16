import {Spinner} from "@/components/onboarding/spinner";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {cn} from "@/lib/utils";

interface RetryButtonProps {
  label: string;
  onRetry: () => void;
  retrying: boolean;
  disabled: boolean;
  resendConfigured: boolean;
  className?: string;
}

export function RetryButton({
  label,
  onRetry,
  retrying,
  disabled,
  resendConfigured,
  className,
}: Readonly<RetryButtonProps>) {
  const button = (
    <button
      type="button"
      onClick={onRetry}
      aria-disabled={disabled}
      className={cn(
        "flex items-center gap-1.75 bg-orange text-[#120C06] text-[13px] font-semibold rounded-lg px-3.75 py-2.25 transition-colors",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-orange-hover cursor-pointer",
        className,
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
      {retrying ? "Retrying…" : label}
    </button>
  );

  if (resendConfigured || retrying) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>Connect Resend in Settings before retrying</TooltipContent>
    </Tooltip>
  );
}
