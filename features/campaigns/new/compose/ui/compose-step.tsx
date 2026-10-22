"use client";

import {type KeyboardEvent, useEffect, useMemo, useRef, useState} from "react";
import type {AudienceColumn} from "@/features/campaigns/new/audience/audience";
import {Pencil} from "lucide-react";
import type {Campaign} from "@/lib/types/campaigns";
import {SubjectField} from "./subject-field";
import {EmailEditor} from "./editor/email-editor";
import {HtmlImportEditor} from "./editor/html-import-editor";
import {PreviewPane} from "./preview-pane";
import {ComposeFooter} from "./compose-footer";
import {type ContentSource, useCampaignDraft} from "@/features/campaigns/new/compose/hooks/use-campaign-draft";
import {useCampaignAutosave} from "@/features/campaigns/new/compose/hooks/use-campaign-autosave";
import {wrapEmailShell} from "@/features/campaigns/new/compose/lib/email-html";
import {sanitizeHtmlSource} from "@/features/campaigns/new/compose/lib/sanitize-html-source";
import {useUnsavedChangesSync} from "@/lib/navigation/use-unsaved-changes-sync";
import {useBeforeUnloadWarning} from "@/lib/navigation/use-before-unload-warning";
import {UNSAVED_CHANGES_MESSAGE} from "@/lib/navigation/unsaved-changes-guard";
import {campaignNameSchema} from "@/lib/schemas/campaigns";
import {cn} from "@/lib/utils";
import {updateCampaign, useSendTestEmail} from "@/lib/api/generated/campaigns/campaigns";
import {toast} from "sonner";
import {useRouter} from "next/navigation";
import {ScheduleDialog} from "./schedule-dialog";
import {updateSessionDraft} from "@/features/campaigns/shared/session-drafts";

export interface SendContext {
  saveNow: () => Promise<void>;
  name: string;
  subject: string;
}

interface ComposeState {
  recipientCount: number;
  canSend: boolean;
  sending: boolean;
}

interface ComposeStepProps {
  campaign: Campaign;
  resendConfigured: boolean;
  state: ComposeState;
  audienceColumns: AudienceColumn[];
  onBack: () => void;
  onSend: (ctx: SendContext) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const CONTENT_SOURCE_TABS = [
  { id: "visual", label: "Compose" },
  { id: "import", label: "Import your own HTML" },
] as const satisfies { id: ContentSource; label: string }[];

export function ComposeStep({
  campaign,
  resendConfigured,
  state: { recipientCount, canSend, sending },
  audienceColumns,
  onBack,
  onSend,
  onDirtyChange,
}: Readonly<ComposeStepProps>) {
  const rawDraft = useCampaignDraft(campaign);
  const { saving, saved, dirty, saveNow, draft } = useCampaignAutosave(rawDraft, {
    campaignId: campaign.id,
    enabled: true,
  });
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nameResult = campaignNameSchema.safeParse(draft.name);
  const nameError = editingName && !nameResult.success ? nameResult.error.issues[0]?.message : null;

  useUnsavedChangesSync(dirty);
  useBeforeUnloadWarning(dirty);

  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);

  const rawPreviewHtml =
    draft.source === "visual" ? draft.visualBody.html : sanitizeHtmlSource(draft.importedHtml);
  const previewHtml = rawPreviewHtml.replace(
    /\{\{([a-zA-Z_]\w*)\}\}/g,
    '<span style="background:rgba(240,151,63,0.15);color:#f0973f;border-radius:3px;padding:1px 4px;font-family:monospace;font-size:0.875em;">{{$1}}</span>',
  );
  const previewDoc = useMemo(() => wrapEmailShell(previewHtml), [previewHtml]);
  const ready = !!draft.name.trim() && !!draft.subject.trim() && !!rawPreviewHtml.trim();

  const sendEnabled = canSend && ready && !dirty;

  async function handleSave() {
    setSaveError(null);
    try {
      await saveNow();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`Manual save failed for campaign ${campaign.id}`, error);
      setSaveError(error);
    }
  }

  const router = useRouter();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const { mutate: sendTestEmail, isPending: sendingTest } = useSendTestEmail();

  async function handleSendTest() {
    await handleSave();
    sendTestEmail(
      { id: campaign.id, data: { variables: {} } },
      {
        onSuccess: () => toast.success("Test email sent to your inbox"),
        onError: () => toast.error("Failed to send test email"),
      },
    );
  }

  async function handleScheduleConfirm(scheduledAt: string) {
    if (scheduling) return;
    setScheduling(true);
    try {
      await saveNow();
      await updateCampaign(campaign.id, { scheduledAt });
      updateSessionDraft(campaign.id, { name: draft.name, subject: draft.subject, status: "DRAFT" });
      router.push("/dashboard");
    } catch (err) {
      console.error(`Failed to schedule campaign ${campaign.id}`, err);
      toast.error("Failed to schedule — try again.");
      setScheduling(false);
    }
  }

  function handleBack() {
    if (dirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    onBack();
  }

  function handleSend() {
    if (!sendEnabled || sending) return;
    onSend({ saveNow, name: draft.name, subject: draft.subject });
  }

  function handleNameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && nameResult.success) setEditingName(false);
    if (event.key === "Escape") setEditingName(false);
  }

  return (
    <>
      <div className="shrink-0 px-6 py-[18px] border-b border-white/5">
        {editingName ? (
          <div className="flex flex-col gap-1">
            <input
              ref={nameInputRef}
              value={draft.name}
              onChange={(event) => draft.setName(event.target.value)}
              onBlur={() => { if (nameResult.success) setEditingName(false); }}
              onKeyDown={handleNameKeyDown}
              aria-invalid={!!nameError}
              className="w-80 max-w-full box-border bg-[#101015] border border-[#3A3A46] aria-invalid:border-[#E5726A] rounded-lg px-2.5 py-1.5 text-[20px] font-semibold text-[#ECECF1] tracking-[-0.02em] outline-none"
            />
            {nameError && <p className="text-xs text-[#E5726A]">{nameError}</p>}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingName(true);
              requestAnimationFrame(() => nameInputRef.current?.focus());
            }}
            className="inline-flex items-center gap-2 border border-transparent hover:border-[#26262F] rounded-lg px-[9px] py-[5px] -ml-[9px] text-[20px] font-semibold text-[#ECECF1] tracking-[-0.02em] cursor-text transition-colors"
          >
            {draft.name}
            <Pencil size={12} className="opacity-45 shrink-0" />
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 min-h-0 box-border overflow-y-auto bm-scrollbar px-6 pt-[22px] pb-10 flex flex-col gap-5 border-r border-white/[0.07]">
          <SubjectField value={draft.subject} onChange={draft.setSubject} />
          <div className="flex items-center gap-0.5 bg-black/20 border border-[#26262F] rounded-[7px] p-0.5 self-start">
            {CONTENT_SOURCE_TABS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => draft.setSource(opt.id)}
                className={cn(
                  "px-2.5 py-1 rounded-[5px] text-[11.5px] font-medium transition-colors cursor-pointer",
                  draft.source === opt.id ? "bg-white/8 text-[#ECECF1]" : "text-[#71717D] hover:text-[#B9B9C2]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {draft.source === "visual" ? (
            <EmailEditor initialHtml={draft.visualBody.html} onChange={draft.setVisualBody} audienceColumns={audienceColumns} />
          ) : (
            <HtmlImportEditor value={draft.importedHtml} onChange={draft.setImportedHtml} />
          )}
        </div>
        <PreviewPane previewDoc={previewDoc} subject={draft.subject} recipientCount={recipientCount} onSendTest={handleSendTest} sendingTest={sendingTest} />
      </div>
      {saveError && (
        <div className="shrink-0 px-6 py-2 text-[12.5px] text-[#E5726A] border-t border-white/[0.07]">
          Save failed: {saveError.message}. Try again.
        </div>
      )}
      <ComposeFooter
        audienceConfirmed={recipientCount > 0}
        selectedRecipientCount={recipientCount}
        counting={false}
        saving={saving}
        saved={saved}
        sending={sending}
        scheduling={scheduling}
        canSend={sendEnabled}
        resendConfigured={resendConfigured}
        onAudience={handleBack}
        onSave={handleSave}
        onSend={handleSend}
        onSchedule={() => setScheduleOpen(true)}
      />
      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        initialScheduledAt={campaign.scheduledAt ?? null}
        confirming={scheduling}
        onSchedule={handleScheduleConfirm}
      />
    </>
  );
}
