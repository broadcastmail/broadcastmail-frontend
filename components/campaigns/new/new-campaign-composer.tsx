"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CampaignHeader } from "./campaign-header";
import { SubjectField } from "./subject-field";
import { EmailEditor, type EmailBody } from "./editor/email-editor";
import { HtmlImportEditor } from "./editor/html-import-editor";
import { AudienceFilters } from "./audience-filters";
import { PreviewPane } from "./preview-pane";
import { SendingOverlay, type SendStep } from "./sending-overlay";
import { Spinner } from "@/components/onboarding/spinner";
import { getCampaign, confirmCampaign } from "@/lib/api/campaigns";
import { updateSessionDraft } from "@/lib/campaigns/session-drafts";
import { useCampaignAutosave } from "@/lib/campaigns/use-campaign-autosave";
import { wrapEmailShell } from "@/lib/campaigns/email-html";
import { sanitizeHtmlSource } from "@/lib/campaigns/sanitize-html-source";
import { EMPTY_DOC, jsonToHtml } from "@/lib/campaigns/editor-extensions";
import { cn } from "@/lib/utils";
import {
  AUDIENCE_OPS,
  estimateRecipientCount,
  TOTAL_AUDIENCE,
  type AudienceColumn,
  type AudienceFilter,
} from "@/lib/campaigns/audience";
import { getReconnectSchema } from "@/lib/api/schema";
import { getAccountEmailProvider } from "@/lib/api/email-provider";
import {
  useUnsavedChangesGuard,
  UNSAVED_CHANGES_MESSAGE,
} from "@/lib/navigation/unsaved-changes-guard";

type ContentSource = "visual" | "import";

let filterIdSeq = 0;
const nextFilterId = () => `filter-${++filterIdSeq}`;

interface NewCampaignComposerProps {
  /** The DRAFT campaign this composer edits — created blank the moment
   *  "New campaign" was clicked (see new-campaign-button.tsx), not by this
   *  component. Everything below patches that existing record; nothing
   *  here creates a campaign. */
  campaignId: string;
}

export function NewCampaignComposer({ campaignId }: NewCampaignComposerProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Untitled campaign");
  const [subject, setSubject] = useState("");

  // The two content sources are kept as fully separate state, not one
  // shared `body` string a mode switch converts between — nothing is lost
  // or reinterpreted when you flip between them, and it keeps "composed
  // through our schema" and "someone's own HTML" from ever blurring into
  // the same value (see editor/email-editor.tsx and
  // editor/html-import-editor.tsx for why that distinction matters).
  const [source, setSource] = useState<ContentSource>("visual");
  const [visualBody, setVisualBody] = useState<EmailBody>({
    html: "",
    json: EMPTY_DOC,
  });
  const [importedHtml, setImportedHtml] = useState("");

  const [filters, setFilters] = useState<AudienceFilter[]>([]);
  const [counting, setCounting] = useState(false);
  const [recipientCount, setRecipientCount] = useState(TOTAL_AUDIENCE);
  const [sendStep, setSendStep] = useState<SendStep | null>(null);
  const [sendError, setSendError] = useState(false);
  // Whatever Settings currently has enabled for filtering — see
  // audience-filters.tsx, which used to offer a hardcoded column list
  // regardless of this. Empty until the fetch below resolves, same as a
  // genuinely unconfigured account; "Add filter" reads that correctly
  // either way.
  const [audienceColumns, setAudienceColumns] = useState<AudienceColumn[]>([]);
  // Whether Settings has a Resend "from" address set — sending is only
  // possible once it does (see email-provider-section.tsx). Fetched
  // alongside everything else below; false (not just "unknown") while
  // loading, same as audienceColumns above.
  const [resendConfigured, setResendConfigured] = useState(false);

  // Loads the draft this id points to, and the account's filterable
  // columns alongside it. Both run client-side, not as server-fetched
  // props — see app/dashboard/campaigns/[id]/page.tsx for why (the draft
  // was created via a client-side POST, so it only exists in the
  // browser's mock worker; the schema fetch just rides along in the same
  // effect for one loading gate instead of two). The editor mounts once
  // loading clears, so it seeds from real data on its one and only mount
  // instead of needing to be re-hydrated after the fact.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCampaign(campaignId),
      getReconnectSchema(),
      getAccountEmailProvider(),
    ])
      .then(([campaign, schema, emailProvider]) => {
        if (cancelled) return;
        setName(campaign.name);
        setSubject(campaign.subject);
        setSource(campaign.source);
        if (campaign.source === "visual" && campaign.bodyJson) {
          setVisualBody({ html: jsonToHtml(campaign.bodyJson), json: campaign.bodyJson });
        } else if (campaign.source === "import" && campaign.bodyHtmlImported) {
          setImportedHtml(campaign.bodyHtmlImported);
        }
        setAudienceColumns(
          (schema?.status === "DETECTED" ? schema.filterableColumns : [])
            .filter((c) => c.enabled)
            .map((c) => ({ name: c.columnName, type: c.columnType as AudienceColumn["type"] })),
        );
        setResendConfigured(!!emailProvider?.fromAddress);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  // Debounced autosave, plus the manual Save button's imperative escape
  // hatch — see use-campaign-autosave.ts for why the debounce is the one
  // effect worth keeping here and everything else (this button included)
  // is a direct call instead.
  const { saving, dirty, saveNow } = useCampaignAutosave({
    campaignId,
    enabled: !loading,
    name,
    subject,
    source,
    visualBodyJson: visualBody.json,
    importedHtml,
  });
  const [saveError, setSaveError] = useState(false);

  // Two independent guards for the same gap — the debounced autosave
  // silently drops whatever's pending if you leave within its ~1s delay
  // (see use-campaign-autosave.ts). Neither is a substitute for the other:
  // `beforeunload` is the only way to catch a tab close, refresh, or typed
  // URL (all real page unloads Next's router never sees), while the top
  // nav's links are in-app client-side navigations that never unload the
  // page at all, so they're guarded separately via onNavigate — see
  // nav-item.tsx and unsaved-changes-guard.tsx. Both are genuine syncs with
  // a browser/external mechanism, the same exception debouncing itself
  // already relies on.
  const { setHasUnsavedChanges } = useUnsavedChangesGuard();
  useEffect(() => {
    setHasUnsavedChanges(dirty);
    return () => setHasUnsavedChanges(false);
  }, [dirty, setHasUnsavedChanges]);

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = UNSAVED_CHANGES_MESSAGE;
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  async function handleSave() {
    setSaveError(false);
    try {
      await saveNow();
    } catch {
      setSaveError(true);
    }
  }

  // Debounces the simulated recipient recount. No cleanup effect: React 18
  // silently drops a setState from an unmounted component, so a stray
  // timer outliving the composer by up to 500ms is harmless, and this
  // stays a plain ref instead of pulling in an effect just for that.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  function recount(next: AudienceFilter[]) {
    clearTimeout(debounceRef.current);
    if (!next.length) {
      setCounting(false);
      setRecipientCount(TOTAL_AUDIENCE);
      return;
    }
    setCounting(true);
    debounceRef.current = setTimeout(() => {
      setCounting(false);
      setRecipientCount(estimateRecipientCount(next));
    }, 500);
  }

  function handleAddFilter() {
    // AudienceFilters already hides this action once audienceColumns is
    // empty — this guard is just defense against a stale click racing a
    // reconfigure that just cleared it.
    if (!audienceColumns.length) return;
    const first = audienceColumns[0];
    setFilters((prev) => {
      const next = [
        ...prev,
        {
          id: nextFilterId(),
          column: first.name,
          op: AUDIENCE_OPS[first.type][0][0],
          value: first.type === "boolean" ? "true" : "",
        },
      ];
      recount(next);
      return next;
    });
  }

  function handlePatchFilter(id: string, patch: Partial<AudienceFilter>) {
    setFilters((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, ...patch } : f));
      recount(next);
      return next;
    });
  }

  function handleRemoveFilter(id: string) {
    setFilters((prev) => {
      const next = prev.filter((f) => f.id !== id);
      recount(next);
      return next;
    });
  }

  // The imported path is sanitized here too (not just at send) so the
  // preview always reflects what would actually be sent, never the raw
  // typed/pasted text — see sanitize-html-source.ts.
  const previewHtml =
    source === "visual" ? visualBody.html : sanitizeHtmlSource(importedHtml);
  const previewDoc = useMemo(() => wrapEmailShell(previewHtml), [previewHtml]);
  const ready = !!name.trim() && !!subject.trim() && !!previewHtml.trim();
  const canSend = ready && resendConfigured;

  async function handleSend() {
    if (sendStep || !canSend) return;
    setSendError(false);
    setSendStep("saving");
    try {
      // Save whatever's on screen right now — not relying on the debounced
      // autosave to have already caught up — then confirm. Both act on the
      // campaign the button created, never create a new one. Reuses the
      // same saveNow() the manual Save button calls (see
      // use-campaign-autosave.ts), so this doesn't re-derive the
      // visual/import payload split a third time.
      await saveNow();
      setSendStep("sending");
      await confirmCampaign(campaignId, recipientCount);
      setSendStep("done");
      // Same reasoning as the autosave effect above — reflect the final
      // name/subject/status in the dashboard's session-local copy so it
      // shows "Sending" (not a stale "Draft") the moment we redirect back.
      updateSessionDraft(campaignId, { name, subject, status: "SENDING" });
      // Hold on "Campaign sent" for a beat before leaving — otherwise the
      // overlay would appear and vanish in the same frame the mocked
      // confirm call resolves.
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch {
      setSendStep(null);
      setSendError(true);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full min-h-0 items-center justify-center">
        <Spinner size={20} className="border-[#26262F] border-t-orange" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <CampaignHeader
        name={name}
        onNameChange={setName}
        counting={counting}
        recipientCount={recipientCount}
        sending={sendStep !== null}
        sendError={sendError}
        canSend={canSend}
        resendConfigured={resendConfigured}
        onSend={handleSend}
        saving={saving}
        saveError={saveError}
        onSave={handleSave}
      />

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 box-border overflow-y-auto px-6 pt-[22px] pb-10 flex flex-col gap-5 border-r border-white/[0.07]">
          <SubjectField value={subject} onChange={setSubject} />

          <div className="flex items-center gap-0.5 bg-black/20 border border-[#26262F] rounded-[7px] p-0.5 self-start">
            {(
              [
                { id: "visual", label: "Compose" },
                { id: "import", label: "Import your own HTML" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSource(opt.id)}
                className={cn(
                  "px-2.5 py-1 rounded-[5px] text-[11.5px] font-medium transition-colors cursor-pointer",
                  source === opt.id
                    ? "bg-white/8 text-[#ECECF1]"
                    : "text-[#71717D] hover:text-[#B9B9C2]",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {source === "visual" ? (
            <EmailEditor initialHtml={visualBody.html} onChange={setVisualBody} />
          ) : (
            <HtmlImportEditor value={importedHtml} onChange={setImportedHtml} />
          )}

          <div className="h-px bg-white/[0.07]" />
          <AudienceFilters
            columns={audienceColumns}
            filters={filters}
            counting={counting}
            recipientCount={recipientCount}
            onAdd={handleAddFilter}
            onPatch={handlePatchFilter}
            onRemove={handleRemoveFilter}
          />
        </div>

        <PreviewPane
          previewDoc={previewDoc}
          subject={subject}
          recipientCount={recipientCount}
        />
      </div>

      <SendingOverlay step={sendStep} recipientCount={recipientCount} />
    </div>
  );
}
