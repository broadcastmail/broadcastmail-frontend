"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {toast} from "sonner";
import {type CreateCampaignPayload, updateCampaign,} from "@/features/campaigns/api/campaigns";
import {updateSessionDraft} from "@/features/campaigns/shared/session-drafts";
import {sanitizeHtmlSource} from "@/features/campaigns/new/compose/lib/sanitize-html-source";
import {useDebounceController} from "@/lib/hooks/use-debounced-callback";
import type {CampaignDraft} from "./use-campaign-draft";

function useUnitOfWork<T extends object>() {
  const committedRef = useRef<T | null>(null);

  function begin(snapshot: T) {
    if (committedRef.current === null) committedRef.current = snapshot;
  }

  function isDirty(current: T): boolean {
    const committed = committedRef.current;
    if (!committed) return false;
    return (Object.keys(current) as Array<keyof T>).some((k) => current[k] !== committed[k]);
  }

  function commit(snapshot: T) {
    committedRef.current = Object.assign({}, snapshot);
  }

  return { begin, isDirty, commit };
}

interface CampaignSnapshot {
  name: string;
  subject: string;
  source: "visual" | "import";
  visualBodyHtml: string;
  importedHtml: string;
}

interface UseCampaignAutosaveOptions {
  campaignId: string;
  enabled: boolean;
  delayMs?: number;
}

interface UseCampaignAutosaveResult {
  saving: boolean;
  saved: boolean;
  dirty: boolean;
  saveNow: () => Promise<void>;
  draft: CampaignDraft;
}

export function useCampaignAutosave(
  draft: CampaignDraft,
  { campaignId, enabled, delayMs = 1000 }: UseCampaignAutosaveOptions,
): UseCampaignAutosaveResult {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashSaved() {
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 1500);
  }

  const snapshot: CampaignSnapshot = {
    name: draft.name,
    subject: draft.subject,
    source: draft.source,
    visualBodyHtml: draft.visualBody.html,
    importedHtml: draft.importedHtml,
  };

  const latestRef = useRef(snapshot);
  latestRef.current = snapshot;

  const uow = useUnitOfWork<CampaignSnapshot>();
  if (enabled) uow.begin(snapshot);
  const dirty = enabled && uow.isDirty(snapshot);

  const buildPayload = useCallback((): CreateCampaignPayload => {
    const l = latestRef.current;
    const bodyHtml = l.source === "visual" ? l.visualBodyHtml : sanitizeHtmlSource(l.importedHtml);
    return { name: l.name, subject: l.subject, bodyHtml };
  }, []);

  const { schedule, cancel } = useDebounceController();
  const autosaveErrorShownRef = useRef(false);

  const saveNow = useCallback(async () => {
    cancel();
    setSaving(true);
    try {
      await updateCampaign(campaignId, buildPayload());
      updateSessionDraft(campaignId, {
        name: latestRef.current.name,
        subject: latestRef.current.subject,
      });
      uow.commit({ ...latestRef.current });
      autosaveErrorShownRef.current = false;
      flashSaved();
    } finally {
      setSaving(false);
    }
  }, [campaignId, buildPayload, cancel]);

  const autoSave = useCallback(async () => {
    try {
      await saveNow();
    } catch {
      if (!autosaveErrorShownRef.current) {
        autosaveErrorShownRef.current = true;
        toast.error("Autosave failed — changes may not be saved.");
      }
    }
  }, [saveNow]);

  useEffect(() => () => cancel(), [cancel]);

  function wrap<T>(setter: (v: T) => void): (v: T) => void {
    return (v) => {
      setter(v);
      if (enabled) schedule(() => void autoSave(), delayMs);
    };
  }

  return {
    saving,
    saved,
    dirty,
    saveNow,
    draft: {
      ...draft,
      setName: wrap(draft.setName),
      setSubject: wrap(draft.setSubject),
      setSource: wrap(draft.setSource),
      setVisualBody: wrap(draft.setVisualBody),
      setImportedHtml: wrap(draft.setImportedHtml),
    },
  };
}
