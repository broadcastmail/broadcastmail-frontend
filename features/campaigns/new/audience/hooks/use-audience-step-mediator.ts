"use client";

import {useLayoutEffect, useRef, useState} from "react";
import {useAudienceFilterEditor} from "./use-audience-filter-editor";
import {useAudienceTable} from "./use-audience-table";
import {updateCampaign} from "@/lib/api/generated/campaigns/campaigns";
import type {AudienceMode} from "@/lib/types/campaigns";
import type {CampaignData} from "@/features/campaigns/new/new-campaign-form";

function useSaveState() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setSaving(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, run };
}

export function useAudienceStepMediator(data: CampaignData, onConfirm: (count: number) => void) {
  const { campaign, audienceColumns: columns, initialFilters, initialRecipientCount, initialAudience } = data;
  const { id: campaignId, audienceMode: initialAudienceMode, includedIds: initialIncludedIds, excludedIds: initialExcludedIds } = campaign;
  const { saving: isSaving, error: saveError, run: withSave } = useSaveState();
  const [lastConfirmedMode, setLastConfirmedMode] = useState<AudienceMode | null>(initialAudienceMode);

  const listReloadRef = useRef<() => void>(() => {});

  const filterEditor = useAudienceFilterEditor({
    campaignId,
    audienceColumns: columns,
    initialFilters,
    initialRecipientCount,
    onFiltersApplied: () => listReloadRef.current(),
  });

  const { list, selection } = useAudienceTable({
    initialPage: initialAudience,
    filterPayloads: filterEditor.filterPayloads,
    initialAudienceMode,
    initialIncludedIds,
    initialExcludedIds,
  });

  useLayoutEffect(() => { listReloadRef.current = list.reload; });

  async function handleSave() {
    selection.commitFilters();
    list.reload();
    await withSave(async () => {
      const updated = await updateCampaign(campaignId, {
        ...selection.audienceDefinition,
        filters: filterEditor.filterPayloads,
      });
      selection.commitAudience();
      setLastConfirmedMode(updated.audienceMode?.toLowerCase() as AudienceMode ?? null);
      onConfirm(selection.selectedCount);
    });
  }

  async function handleRecipientCountUpdate(resolution: "reapply" | "clear") {
    const definition = selection.resolvePendingFilterChange(resolution);
    await withSave(() => updateCampaign(campaignId, definition));
  }

  const totalRecipients = initialFilters.length
    ? Math.max(initialRecipientCount, filterEditor.recipientCount)
    : initialRecipientCount;

  const canSave =
    selection.selectedCount > 0 &&
    !isSaving &&
    !selection.hasPendingFilterChange &&
    (lastConfirmedMode === null || selection.hasAudienceChanged);

  return {
    columns,
    filterEditor,
    list,
    selection,
    isSaving,
    saveError,
    lastConfirmedMode,
    totalRecipients,
    canSave,
    handleSave,
    handleRecipientCountUpdate,
  };
}
