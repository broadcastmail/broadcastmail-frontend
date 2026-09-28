"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import {
  updateCampaign,
  type CreateCampaignPayload,
} from "@/lib/api/campaigns";
import { updateSessionDraft } from "@/lib/campaigns/session-drafts";
import { sanitizeHtmlSource } from "@/lib/campaigns/sanitize-html-source";

interface UseCampaignAutosaveOptions {
  campaignId: string;
  /** Pass false while the initial load hasn't resolved yet — nothing to
   *  autosave before there's a loaded draft to autosave *from*. */
  enabled: boolean;
  name: string;
  subject: string;
  source: "visual" | "import";
  visualBodyJson: JSONContent;
  importedHtml: string;
  delayMs?: number;
}

interface UseCampaignAutosaveResult {
  saving: boolean;
  /** True once any of the tracked fields has changed since the last
   *  successful save (including one still pending in the debounce). Lets
   *  the composer warn before the user navigates away with edits the
   *  autosave hasn't caught up to yet — see navigation guarding in
   *  new-campaign-composer.tsx. */
  dirty: boolean;

  saveNow: () => Promise<void>;
}

interface CampaignSnapshot {
  name: string;
  subject: string;
  source: "visual" | "import";
  visualBodyJson: JSONContent;
  importedHtml: string;
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
  delayMs = 1000,
}: UseCampaignAutosaveOptions): UseCampaignAutosaveResult {
  const [saving, setSaving] = useState(false);

  // Kept fresh on every render (a plain assignment, not an effect) so
  // saveNow() — called from a click, not from the debounce below — always
  // sends what's on screen *right now*, not whatever it was when saveNow
  // was created.
  const latestRef = useRef({
    name,
    subject,
    source,
    visualBodyJson,
    importedHtml,
  });
  latestRef.current = { name, subject, source, visualBodyJson, importedHtml };

  // The fields as of the last successful save — the baseline "dirty" below
  // compares against. Set once, the first render `enabled` is true (the
  // just-loaded draft counts as saved), then again after every successful
  // save. A plain ref written during render, not an effect: it only ever
  // needs to happen once per condition becoming true, which the `=== null`
  // guard already makes idempotent.
  const committedRef = useRef<CampaignSnapshot | null>(null);
  if (enabled && committedRef.current === null) {
    committedRef.current = {
      name,
      subject,
      source,
      visualBodyJson,
      importedHtml,
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
      importedHtml !== committed.importedHtml);

  const buildPayload = useCallback((): CreateCampaignPayload => {
    const l = latestRef.current;
    return l.source === "visual"
      ? {
          name: l.name,
          subject: l.subject,
          source: "visual",
          bodyJson: l.visualBodyJson,
        }
      : {
          name: l.name,
          subject: l.subject,
          source: "import",
          // Sanitized here, at the boundary right before it goes out — see
          // sanitize-html-source.ts for why that's still not a substitute
          // for the API sanitizing again on receipt.
          bodyHtmlImported: sanitizeHtmlSource(l.importedHtml),
        };
  }, []);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const saveNow = useCallback(async () => {
    clearTimeout(timeoutRef.current);
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
  }, [campaignId, buildPayload]);

  // Skips the very first run — nothing has changed yet at that point, it's
  // just the initial load's own values flowing through.
  const skipFirstRef = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    if (skipFirstRef.current) {
      skipFirstRef.current = false;
      return;
    }
    timeoutRef.current = setTimeout(() => {
      saveNow().catch(() => {
        // Best-effort — there's no dedicated resume UI yet to surface a
        // retry into, so this is a head start for when one exists, not
        // something the user needs to babysit today. The manual Save
        // button (which does surface its own error) is the fallback.
      });
    }, delayMs);
    return () => clearTimeout(timeoutRef.current);
  }, [
    enabled,
    delayMs,
    name,
    subject,
    source,
    visualBodyJson,
    importedHtml,
    saveNow,
  ]);

  return { saving, dirty, saveNow };
}
