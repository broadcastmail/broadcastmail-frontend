import {RetryButton} from "./retry-button";

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
  return (
    <div className="bg-white/3 backdrop-blur-sm border border-(--color-border) rounded-xl py-14 px-6 flex flex-col items-center gap-3">
      <div className="text-[17px] font-semibold text-text-primary">
        This campaign didn&apos;t send.
      </div>
      <div className="text-[13.5px] text-[#8E8E9A] text-center text-balance">
        Resolution failed before any emails were delivered.
      </div>
      {canRetry && (
        <RetryButton
          label="Try again"
          onRetry={onRetry}
          retrying={retrying}
          disabled={retrying || !resendConfigured}
          resendConfigured={resendConfigured}
          className="text-[13.5px] px-4 py-2.5 mt-2"
        />
      )}
      {errorMessage && (
        <div className="text-[12.5px] text-status-failed">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
