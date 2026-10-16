import {RetryButton} from "./retry-button";

interface RetryStripProps {
  failedCount: number;
  onRetry: () => void;
  retrying: boolean;
  canRetry?: boolean;
  errorMessage: string | null;
  resendConfigured: boolean;
}

export function RetryStrip({
  failedCount,
  onRetry,
  retrying,
  canRetry = true,
  errorMessage,
  resendConfigured,
}: Readonly<RetryStripProps>) {
  return (
    <div className="flex items-center justify-between gap-5 flex-wrap pt-4 border-t border-white/[0.07]">
      <div className="flex flex-col gap-1">
        <div className="text-[13.5px] text-[#8E8E9A]">
          <span className="font-mono text-status-failed">
            {failedCount.toLocaleString()}
          </span>{" "}
          recipients didn&apos;t receive this email.
        </div>
        {errorMessage && (
          <div className="text-[12px] text-status-failed">
            {errorMessage}
          </div>
        )}
      </div>
      <RetryButton
        label="Retry failed recipients"
        onRetry={onRetry}
        retrying={retrying}
        disabled={retrying || !resendConfigured || !canRetry}
        resendConfigured={resendConfigured}
      />
    </div>
  );
}
