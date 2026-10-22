"use client";

import {useState} from "react";
import {ChevronUp} from "lucide-react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import {cn} from "@/lib/utils";

interface ComposeFooterProps {
  audienceConfirmed: boolean;
  selectedRecipientCount: number;
  counting: boolean;
  saving: boolean;
  saved: boolean;
  sending: boolean;
  scheduling: boolean;
  canSend: boolean;
  resendConfigured: boolean;
  onAudience: () => void;
  onSave: () => void;
  onSend: () => void;
  onSchedule: () => void;
}

function saveLabel(saving: boolean, saved: boolean): string {
  if (saving) return "Saving...";
  if (saved) return "Saved";
  return "Save";
}

export function ComposeFooter({
  audienceConfirmed,
  selectedRecipientCount,
  counting,
  saving,
  saved,
  sending,
  scheduling,
  canSend,
  resendConfigured,
  onAudience,
  onSave,
  onSend,
  onSchedule,
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
          {saveLabel(saving, saved)}
        </button>
        <SendSplitButton
          active={canSend}
          sending={sending}
          scheduling={scheduling}
          resendConfigured={resendConfigured}
          tooltip={!audienceConfirmed ? "Set your audience first" : undefined}
          onSend={onSend}
          onSchedule={onSchedule}
        />
      </div>
    </div>
  );
}

function SendSplitButton({
  active,
  sending,
  scheduling,
  resendConfigured,
  tooltip,
  onSend,
  onSchedule,
}: Readonly<{
  active: boolean;
  sending: boolean;
  scheduling: boolean;
  resendConfigured: boolean;
  tooltip?: string;
  onSend: () => void;
  onSchedule: () => void;
}>) {
  const busy = sending || scheduling;
  const [open, setOpen] = useState(false);

  const orangeBtn = "bg-orange hover:bg-orange-hover text-[#120C06] cursor-pointer";
  const inactiveBtn = "bg-[#17171D] text-[#4C4C58] cursor-not-allowed";

  const inner = (
    <DropdownMenu open={open} onOpenChange={(v) => { if (active && !busy) setOpen(v); }}>
      <div className={cn("flex items-stretch overflow-hidden rounded-lg")}>
        <button
          type="button"
          onClick={() => { if (active && !busy) onSend(); }}
          className={cn("flex items-center justify-center text-[13.5px] font-semibold pl-4 pr-3 py-2.5 whitespace-nowrap transition-colors", active ? orangeBtn : inactiveBtn)}
        >
          {sending ? "Sending…" : "Send now"}
        </button>
        <span className={cn("w-px self-stretch", active ? "bg-[#120C06]/20" : "bg-white/[0.06]")} />
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn("flex items-center justify-center px-2.5 py-2.5 transition-colors", active && !busy ? orangeBtn : inactiveBtn)}
          >
            <ChevronUp size={12} strokeWidth={2.5} className={cn("transition-transform duration-150", open ? "rotate-180" : "")} />
          </button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        align="end"
        side="top"
        className="bg-[#0C0C0F] border border-white/10 rounded-lg p-1 shadow-[0_12px_28px_rgba(0,0,0,0.55)] min-w-[140px]"
      >
        <DropdownMenuItem
          onSelect={onSchedule}
          className="px-3 py-2 rounded-[6px] font-medium text-[13px] text-[#ECECF1] cursor-pointer focus:bg-white/[0.06] focus:text-[#ECECF1]"
        >
          Schedule send
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if ((resendConfigured && !tooltip) || busy) return inner;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent>{tooltip ?? "Connect Resend in Settings before sending"}</TooltipContent>
    </Tooltip>
  );
}
