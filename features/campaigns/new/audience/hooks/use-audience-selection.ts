"use client";

import {useCallback, useMemo, useState} from "react";
import type {AudienceFilterPayload} from "@/features/campaigns/new/audience/audience";
import type {AudienceMode} from "@/lib/types/campaigns";

const RECIPIENT_LIMIT = 5_000;

interface AudienceBaseline {
  mode: AudienceMode | null;
  includedIds: string[];
  excludedIds: string[];
}

interface UseAudienceSelectionOptions {
  initialAudienceMode: AudienceMode | null;
  initialIncludedIds: string[] | null;
  initialExcludedIds: string[] | null;
  filterPayloads: AudienceFilterPayload[];
  total: number;
}

export interface UseAudienceSelectionResult {
  mode: "all" | "none";
  includedIds: Set<string>;
  excludedIds: Set<string>;
  selectedCount: number;
  isSelected: (id: string) => boolean;
  toggleRecipient: (id: string, checked: boolean) => void;
  toggleAll: (checked: boolean) => void;
  allRecipientsSelected: boolean;
  noRecipientsSelected: boolean;
  limitExceeded: boolean;
  hasAudienceChanged: boolean;
  hasPendingFilterChange: boolean;
  audienceDefinition: { audienceMode: AudienceMode; includedIds: string[]; excludedIds: string[] };
  commitAudience: () => void;
  commitFilters: () => void;
  resolvePendingFilterChange: (resolution: "reapply" | "clear") => { audienceMode: AudienceMode; includedIds: string[]; excludedIds: string[] };
}

export function useAudienceSelection({
  initialAudienceMode,
  initialIncludedIds,
  initialExcludedIds,
  filterPayloads,
  total,
}: UseAudienceSelectionOptions): UseAudienceSelectionResult {
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() =>
    initialAudienceMode === "all" ? new Set(initialExcludedIds ?? []) : new Set(),
  );
  const [includedIds, setIncludedIds] = useState<Set<string>>(() =>
    initialAudienceMode === "manual" ? new Set(initialIncludedIds ?? []) : new Set(),
  );
  const [selectionMode, setSelectionMode] = useState<"all" | "none">(() =>
    initialAudienceMode === "all" ? "all" : "none",
  );
  const [savedFilterPayloads, setSavedFilterPayloads] = useState<AudienceFilterPayload[]>(
    () => filterPayloads,
  );

  // Tracks the last successfully saved audience — updated by commitAudience()
  // so hasAudienceChanged resets to false after each save.
  const [baseline, setBaseline] = useState<AudienceBaseline>({
    mode: initialAudienceMode,
    includedIds: initialIncludedIds ?? [],
    excludedIds: initialExcludedIds ?? [],
  });

  const selectedCount =
    selectionMode === "all" ? Math.max(0, total - excludedIds.size) : includedIds.size;
  const allRecipientsSelected = selectionMode === "all" && excludedIds.size === 0;
  const noRecipientsSelected = selectionMode === "none" && includedIds.size === 0;
  const limitExceeded = selectionMode === "none" && includedIds.size >= RECIPIENT_LIMIT;

  const isSelected = useCallback(
    (id: string) => (selectionMode === "all" ? !excludedIds.has(id) : includedIds.has(id)),
    [excludedIds, includedIds, selectionMode],
  );

  const hasPendingFilterChange = useMemo(() => {
    const hasIds = selectionMode === "none" ? includedIds.size > 0 : excludedIds.size > 0;
    if (!hasIds) return false;
    return JSON.stringify(filterPayloads) !== JSON.stringify(savedFilterPayloads);
  }, [filterPayloads, savedFilterPayloads, selectionMode, includedIds, excludedIds]);

  const hasAudienceChanged = useMemo(() => {
    if (baseline.mode === null) return true;
    const currentMode: AudienceMode = selectionMode === "all" ? "all" : "manual";
    const baselineMode: AudienceMode = baseline.mode === "all" ? "all" : "manual";
    if (currentMode !== baselineMode) return true;
    const [current, baseArr] = currentMode === "all"
      ? [excludedIds, baseline.excludedIds]
      : [includedIds, baseline.includedIds];
    const base = new Set(baseArr);
    return current.size !== base.size || [...current].some((id) => !base.has(id));
  }, [selectionMode, includedIds, excludedIds, baseline]);

  const audienceDefinition = useMemo(() => {
    if (selectionMode === "all") {
      return { audienceMode: "all" as AudienceMode, includedIds: [] as string[], excludedIds: [...excludedIds] };
    }
    return { audienceMode: "manual" as AudienceMode, includedIds: [...includedIds], excludedIds: [] as string[] };
  }, [selectionMode, includedIds, excludedIds]);

  function toggleRecipient(id: string, checked: boolean) {
    if (selectionMode === "all") {
      setExcludedIds((current) => {
        const next = new Set(current);
        if (checked) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      if (checked && limitExceeded) return;
      setIncludedIds((current) => {
        const next = new Set(current);
        if (checked) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  }

  function toggleAll(checked: boolean) {
    setSelectionMode(checked ? "all" : "none");
    setExcludedIds(new Set());
    setIncludedIds(new Set());
  }

  // Call after a successful PATCH to reset hasAudienceChanged to false.
  const commitAudience = useCallback(() => {
    if (selectionMode === "all") {
      setBaseline({ mode: "all", includedIds: [], excludedIds: [...excludedIds] });
    } else {
      setBaseline({ mode: "manual", includedIds: [...includedIds], excludedIds: [] });
    }
  }, [selectionMode, includedIds, excludedIds]);

  const commitFilters = useCallback(() => {
    setSavedFilterPayloads(filterPayloads);
  }, [filterPayloads]);

  const resolvePendingFilterChange = useCallback(
    (resolution: "reapply" | "clear"): { audienceMode: AudienceMode; includedIds: string[]; excludedIds: string[] } => {
      setSavedFilterPayloads(filterPayloads);
      if (resolution === "clear") {
        setSelectionMode("none");
        setIncludedIds(new Set());
        setExcludedIds(new Set());
        return { audienceMode: "manual", includedIds: [], excludedIds: [] };
      }
      if (selectionMode === "all") {
        return { audienceMode: "all", includedIds: [], excludedIds: [...excludedIds] };
      }
      return { audienceMode: "manual", includedIds: [...includedIds], excludedIds: [] };
    },
    [filterPayloads, selectionMode, includedIds, excludedIds],
  );

  return {
    mode: selectionMode,
    includedIds,
    excludedIds,
    selectedCount,
    isSelected,
    toggleRecipient,
    toggleAll,
    allRecipientsSelected,
    noRecipientsSelected,
    limitExceeded,
    hasAudienceChanged,
    hasPendingFilterChange,
    audienceDefinition,
    commitAudience,
    commitFilters,
    resolvePendingFilterChange,
  };
}
