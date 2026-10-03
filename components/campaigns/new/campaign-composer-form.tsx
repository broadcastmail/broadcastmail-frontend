"use client";

import { useMemo, useState } from "react";
import type { Campaign } from "@/mocks/fixtures";
import { CampaignHeader } from "./campaign-header";
import { SubjectField } from "./subject-field";
import { EmailEditor } from "./editor/email-editor";
import { HtmlImportEditor } from "./editor/html-import-editor";
import { AudienceFilters } from "./audience-filters";
import { PreviewPane } from "./preview-pane";
import { SendingOverlay } from "./sending-overlay";
import { useCampaignDraft, type ContentSource } from "@/lib/campaigns/use-campaign-draft";
import { useAudienceFilterEditor } from "@/lib/campaigns/use-audience-filter-editor";
import { useSendCampaign } from "@/lib/campaigns/use-send-campaign";
import { useCampaignAutosave } from "@/lib/campaigns/use-campaign-autosave";
import { wrapEmailShell } from "@/lib/campaigns/email-html";
import { sanitizeHtmlSource } from "@/lib/campaigns/sanitize-html-source";
import { cn } from "@/lib/utils";
import type {
  AudienceColumn,
  AudienceFilter,
  CampaignFilterResponse,
} from "@/lib/campaigns/audience";
import { startCheckout } from "@/lib/api/billing";
import { isFreePlan } from "@/lib/billing/plans";
import { usePlan } from "@/lib/billing/plan-context";
import { useCheckoutRedirect } from "@/lib/billing/use-checkout-redirect";
import { useUnsavedChangesSync } from "@/lib/navigation/use-unsaved-changes-sync";
import { useBeforeUnloadWarning } from "@/lib/navigation/use-before-unload-warning";

interface CampaignComposerFormProps {
  campaignId: string;
  campaign: Campaign;
  audienceColumns: AudienceColumn[];
  resendConfigured: boolean;
  initialFilters: CampaignFilterResponse[];
  initialRecipientCount: number;
}

const CONTENT_SOURCE_TABS = [
  { id: "visual", label: "Compose" },
  { id: "import", label: "Import your own HTML" },
] as const satisfies { id: ContentSource; label: string }[];

export function CampaignComposerForm({
  campaignId,
  campaign,
  audienceColumns,
  resendConfigured,
  initialFilters,
  initialRecipientCount,
}: CampaignComposerFormProps) {
  const draft = useCampaignDraft(campaign);
  const filterEditor = useAudienceFilterEditor({
    campaignId,
    audienceColumns,
    initialFilters,
    initialRecipientCount,
  });
  const plan = usePlan();
  const { redirecting: upgrading, redirect } = useCheckoutRedirect();

  const { saving, dirty, saveNow } = useCampaignAutosave({
    campaignId,
    enabled: true,
    name: draft.name,
    subject: draft.subject,
    source: draft.source,
    visualBodyJson: draft.visualBody.json,
    importedHtml: draft.importedHtml,
    filters: filterEditor.filters,
    filtersTouched: filterEditor.filtersTouched,
    audienceColumns,
  });
  const [saveError, setSaveError] = useState<Error | null>(null);

  useUnsavedChangesSync(dirty);
  useBeforeUnloadWarning(dirty);

  async function handleSave() {
    setSaveError(null);
    try {
      await saveNow();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`Manual save failed for campaign ${campaignId}`, error);
      setSaveError(error);
    }
  }

  function handleAddFilter() {
    filterEditor.addFilter();
    filterEditor.recount(saveNow);
  }

  function handlePatchFilter(id: string, patch: Partial<AudienceFilter>) {
    filterEditor.patchFilter(id, patch);
    filterEditor.recount(saveNow);
  }

  function handleRemoveFilter(id: string) {
    filterEditor.removeFilter(id);
    filterEditor.recount(saveNow);
  }

  const previewHtml =
    draft.source === "visual" ? draft.visualBody.html : sanitizeHtmlSource(draft.importedHtml);
  const previewDoc = useMemo(() => wrapEmailShell(previewHtml), [previewHtml]);
  const ready = !!draft.name.trim() && !!draft.subject.trim() && !!previewHtml.trim();
  const upgradeRequired = isFreePlan(plan) && filterEditor.filters.length > 0;
  const canSend = ready && resendConfigured && !upgradeRequired;

  const sendCampaign = useSendCampaign({
    campaignId,
    canSend,
    saveNow,
    name: draft.name,
    subject: draft.subject,
    recipientCount: filterEditor.recipientCount,
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <CampaignHeader
        name={draft.name}
        onNameChange={draft.setName}
        counting={filterEditor.counting}
        recipientCount={filterEditor.recipientCount}
        sending={sendCampaign.step !== null}
        sendError={sendCampaign.error !== null}
        canSend={canSend}
        resendConfigured={resendConfigured}
        onSend={sendCampaign.send}
        upgradeRequired={upgradeRequired}
        upgrading={upgrading}
        onUpgrade={() => redirect(startCheckout, "Couldn't start checkout — try again.")}
        saving={saving}
        saveError={saveError !== null}
        onSave={handleSave}
      />

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 box-border overflow-y-auto px-6 pt-[22px] pb-10 flex flex-col gap-5 border-r border-white/[0.07]">
          <SubjectField value={draft.subject} onChange={draft.setSubject} />

          <div className="flex items-center gap-0.5 bg-black/20 border border-[#26262F] rounded-[7px] p-0.5 self-start">
            {CONTENT_SOURCE_TABS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => draft.setSource(opt.id)}
                className={cn(
                  "px-2.5 py-1 rounded-[5px] text-[11.5px] font-medium transition-colors cursor-pointer",
                  draft.source === opt.id
                    ? "bg-white/8 text-[#ECECF1]"
                    : "text-[#71717D] hover:text-[#B9B9C2]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {draft.source === "visual" ? (
            <EmailEditor initialHtml={draft.visualBody.html} onChange={draft.setVisualBody} />
          ) : (
            <HtmlImportEditor value={draft.importedHtml} onChange={draft.setImportedHtml} />
          )}

          <div className="h-px bg-white/[0.07]" />
          <AudienceFilters
            columns={audienceColumns}
            filters={filterEditor.filters}
            counting={filterEditor.counting}
            recipientCount={filterEditor.recipientCount}
            onAdd={handleAddFilter}
            onPatch={handlePatchFilter}
            onRemove={handleRemoveFilter}
          />
        </div>

        <PreviewPane
          previewDoc={previewDoc}
          subject={draft.subject}
          recipientCount={filterEditor.recipientCount}
        />
      </div>

      <SendingOverlay step={sendCampaign.step} recipientCount={filterEditor.recipientCount} />
    </div>
  );
}
