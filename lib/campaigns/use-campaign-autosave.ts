"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import {
  updateCampaign,
  type CreateCampaignPayload,
} from "@/lib/api/campaigns";
import { updateSessionDraft } from "@/lib/campaigns/session-drafts";
import { sanitizeHtmlSource } from "@/lib/campaigns/sanitize-html-source";
import {
  toFilterPayloads,
  type AudienceColumn,
  type AudienceFilter,
} from "@/lib/campaigns/audience";
import { useDebounceController } from "@/lib/campaigns/use-debounced-callback";

interface UseCampaignAutosaveOptions {
  campaignId: string;
  enabled: boolean;
  name: string;
  subject: string;
  source: "visual" | "import";
  visualBodyJson: JSONContent;
  importedHtml: string;
  filters: AudienceFilter[];
  filtersTouched: boolean;
  audienceColumns: AudienceColumn[];
  delayMs?: number;
}

interface UseCampaignAutosaveResult {
  saving: boolean;
  dirty: boolean;

  saveNow: () => Promise<void>;
}

interface CampaignSnapshot {
  name: string;
  subject: string;
  source: "visual" | "import";
  visualBodyJson: JSONContent;
  importedHtml: string;
  filters: AudienceFilter[];
}

/** Debounced autosave for the campaign composer, plus an imperative escape
 *  hatch for "save right now." The debounce (react to edits settling for a
 *  beat, PATCH in the background) is the one effect in here that's actually
 *  earning its keep — there's no non-effect way to know "N ms have passed
 *  since the last edit," which is exactly the kind of external-clock
 *  synchronization useEffect exists for. Everything else here — the manual
 *  save, and payload building it shares with handleSend — is a plain
 *  function called directly, not something routed through an effect. */
export function useCampaignAutosave({
  campaignId,
  enabled,
  name,
  subject,
  source,
  visualBodyJson,
  importedHtml,
  filters,
  filtersTouched,
  audienceColumns,
  delayMs = 1000,
}: UseCampaignAutosaveOptions): UseCampaignAutosaveResult {
  const [saving, setSaving] = useState(false);

  // Kept fresh every render so saveNow() always sends what's on screen
  // right now, not whatever it was when saveNow was created.
  const latestRef = useRef({
    name,
    subject,
    source,
    visualBodyJson,
    importedHtml,
    filters,
    filtersTouched,
    audienceColumns,
  });
  latestRef.current = {
    name,
    subject,
    source,
    visualBodyJson,
    importedHtml,
    filters,
    filtersTouched,
    audienceColumns,
  };

  // Baseline "dirty" compares against — the fields as of the last
  // successful save.
  const committedRef = useRef<CampaignSnapshot | null>(null);
  if (enabled && committedRef.current === null) {
    committedRef.current = {
      name,
      subject,
      source,
      visualBodyJson,
      importedHtml,
      filters,
    };
  }
  const committed = committedRef.current;
  const dirty =
    enabled &&
    committed !== null &&
    (name !== committed.name ||
      subject !== committed.subject ||
      source !== committed.source ||
      visualBodyJson !== committed.visualBodyJson ||
      importedHtml !== committed.importedHtml ||
      filters !== committed.filters);

  const buildPayload = useCallback((): CreateCampaignPayload => {
    const l = latestRef.current;
    const filters = l.filtersTouched
      ? toFilterPayloads(l.filters, l.audienceColumns)
      : undefined;
    return l.source === "visual"
      ? {
          name: l.name,
          subject: l.subject,
          source: "visual",
          bodyJson: l.visualBodyJson,
          filters,
        }
      : {
          name: l.name,
          subject: l.subject,
          source: "import",
          bodyHtmlImported: sanitizeHtmlSource(l.importedHtml),
          filters,
        };
  }, []);

  const { schedule: scheduleSave, cancel: cancelScheduledSave } =
    useDebounceController();

  const saveNow = useCallback(async () => {
    cancelScheduledSave();
    setSaving(true);
    try {
      await updateCampaign(campaignId, buildPayload());
      // Keeps the dashboard's session-local copy (see session-drafts.ts)
      // showing the current name/subject instead of "Untitled campaign" if
      // the user leaves before this draft is ever sent.
      updateSessionDraft(campaignId, {
        name: latestRef.current.name,
        subject: latestRef.current.subject,
      });
      committedRef.current = { ...latestRef.current };
    } finally {
      setSaving(false);
    }
  }, [campaignId, buildPayload, cancelScheduledSave]);

  const skipFirstRef = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (skipFirstRef.current) {
      skipFirstRef.current = false;
      return;
    }
    scheduleSave(() => {
      // Best-effort: no retry UI for a background autosave failure yet —
      // the manual Save button (which does surface its own error) is the
      // fallback.
      saveNow().catch((err) => console.error(`Autosave failed for campaign ${campaignId}`, err));
    }, delayMs);
    return cancelScheduledSave;
  }, [
    enabled,
    campaignId,
    delayMs,
    name,
    subject,
    source,
    visualBodyJson,
    importedHtml,
    filters,
    scheduleSave,
    cancelScheduledSave,
    saveNow,
  ]);

  return { saving, dirty, saveNow };
}
