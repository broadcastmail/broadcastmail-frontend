"use client";

import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {cn} from "@/lib/utils";

interface ComposeFooterProps {
  audienceConfirmed: boolean;
  selectedRecipientCount: number;
  counting: boolean;
  saving: boolean;
  sending: boolean;
  canSend: boolean;
  resendConfigured: boolean;
  onAudience: () => void;
  onSave: () => void;
  onSend: () => void;
}

export function ComposeFooter({
  audienceConfirmed,
  selectedRecipientCount,
  counting,
  saving,
  sending,
  canSend,
  resendConfigured,
  onAudience,
  onSave,
  onSend,
}: Readonly<ComposeFooterProps>) {
  return (
    <div className="shrink-0 h-[60px] flex items-center justify-between gap-4 px-6 bg-surface border-t border-white/[0.07]">
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={onAudience}
          className="text-[13px] text-[#8E8E9A] hover:text-[#ECECF1] whitespace-nowrap"
        >
          ← Audience
        </button>
        <span className="w-px h-4 bg-white/[0.08]" />
        <div className="flex items-center gap-1.5 text-[13px] text-[#8E8E9A] whitespace-nowrap">
          {counting && <span className="w-3 h-3 rounded-full border-2 border-[#26262F] border-t-orange animate-bmspin" />}
          {audienceConfirmed ? (
            <>
              <span className="text-orange">Sending to</span>
              <span className="font-mono text-orange">{selectedRecipientCount.toLocaleString()}</span>
              <span className="text-orange">recipients</span>
            </>
          ) : (
            <button type="button" onClick={onAudience} className="text-orange hover:underline transition-colors">
              Select audience
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || sending}
          className="flex items-center gap-1.5 border border-white/[0.13] text-[#B9B9C2] hover:text-[#ECECF1] hover:border-white/[0.24] text-[13px] font-medium rounded-lg px-3.5 py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <SendCampaignButton active={canSend} sending={sending} resendConfigured={resendConfigured} tooltip={!audienceConfirmed ? "Set your audience first" : undefined} onSend={onSend} />
      </div>
    </div>
  );
}

function SendCampaignButton({
  active,
  sending,
  resendConfigured,
  tooltip,
  onSend,
}: Readonly<{
    active: boolean;
    sending: boolean;
    resendConfigured: boolean;
    tooltip?: string;
    onSend: () => void;
}>) {
  const button = (
    <button
      type="button"
      onClick={onSend}
      aria-disabled={!active}
      className={cn(
        "flex items-center justify-center gap-1.75 text-[13.5px] font-semibold rounded-lg px-4 py-2.5 whitespace-nowrap transition-colors",
        active ? "bg-orange hover:bg-orange-hover text-[#120C06] cursor-pointer" : "bg-[#17171D] text-[#4C4C58] cursor-not-allowed",
      )}
    >
      {sending ? "Sending..." : "Send campaign"}
    </button>
  );

  if ((resendConfigured && !tooltip) || sending) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{tooltip ?? "Connect Resend in Settings before sending"}</TooltipContent>
    </Tooltip>
  );
}
