"use client";

import type {RefObject} from "react";
import {useLayoutEffect, useRef, useState} from "react";
import {toast} from "sonner";
import {listAudience} from "@/lib/api/generated/campaigns/campaigns";
import {useDebounceController} from "@/lib/hooks/use-debounced-callback";
import {
    AUDIENCE_OPS,
    type AudienceColumn,
    type AudienceFilter,
    audienceFilterKey,
    type AudienceFilterPayload,
    type CampaignFilterResponse,
    columnFor,
    columnKey,
    fromFilterResponses,
    toFilterPayloads,
} from "@/features/campaigns/new/audience/audience";

let filterIdSeq = 0;
const nextFilterId = () => `filter-${++filterIdSeq}`;

function findNextFilterCandidate(
  columns: AudienceColumn[],
  existingKeys: Set<string>,
): Pick<AudienceFilter, "column" | "op" | "value"> | null {
  return columns
    .map((column) => ({
      column: columnKey(column.source, column.name),
      op: AUDIENCE_OPS[column.type][0][0],
      value: column.type === "boolean" ? "true" : "",
    } satisfies Pick<AudienceFilter, "column" | "op" | "value">))
    .find((filter) => !existingKeys.has(audienceFilterKey(filter))) ?? null;
}

function toActiveFilterColumns(
  filters: AudienceFilter[],
  columns: AudienceColumn[],
): FilterColumn[] {
  return Array.from(
    new Map(
      filters.map((f) => [f.column, { key: f.column, name: columnFor(columns, f.column).name }]),
    ).values(),
  ).filter((col) => col.name !== "created_at");
}

function useRecipientCount(
  initialCount: number,
  filtersRef: RefObject<AudienceFilter[]>,
  columnsRef: RefObject<AudienceColumn[]>,
  onAppliedRef: RefObject<(() => void) | undefined>,
) {
  const [counting, setCounting] = useState(false);
  const [recipientCount, setRecipientCount] = useState(initialCount);
  const requestRef = useRef(0);
  const { schedule } = useDebounceController();

  async function run(requestId: number) {
    if (filtersRef.current.some((f) => !f.value.trim())) { setCounting(false); return; }
    try {
      const page = await listAudience(toFilterPayloads(filtersRef.current, columnsRef.current), { limit: 1 });
      if (requestId !== requestRef.current) return;
      setRecipientCount(page.total ?? 0);
      onAppliedRef.current?.();
    } catch {
      toast.error("Couldn't update recipient count — try again.");
    } finally {
      if (requestId === requestRef.current) setCounting(false);
    }
  }

  function trigger() {
    setCounting(true);
    schedule(() => run(++requestRef.current), 500);
  }

  return { counting, recipientCount, trigger };
}

interface UseAudienceFilterEditorOptions {
  campaignId: string;
  audienceColumns: AudienceColumn[];
  initialFilters: CampaignFilterResponse[];
  initialRecipientCount: number;
  onFiltersApplied?: () => void;
}

export interface FilterColumn { key: string; name: string }

export interface AudienceFilterEditor {
  filters: AudienceFilter[];
  filterPayloads: AudienceFilterPayload[];
  activeFilterColumns: FilterColumn[];
  counting: boolean;
  recipientCount: number;
  filterError: string | null;
  addFilter: () => AudienceFilter | null;
  patchFilter: (id: string, patch: Partial<AudienceFilter>) => void;
  removeFilter: (id: string) => void;
}

export function useAudienceFilterEditor({
  audienceColumns,
  initialFilters,
  initialRecipientCount,
  onFiltersApplied,
}: UseAudienceFilterEditorOptions): AudienceFilterEditor {
  const [filters, setFilters] = useState(() => fromFilterResponses(initialFilters, nextFilterId));
  const [filterError, setFilterError] = useState<string | null>(null);

  const filtersRef = useRef(filters);
  const columnsRef = useRef(audienceColumns);
  const onAppliedRef = useRef(onFiltersApplied);

  useLayoutEffect(() => { filtersRef.current = filters; });
  useLayoutEffect(() => { columnsRef.current = audienceColumns; });
  useLayoutEffect(() => { onAppliedRef.current = onFiltersApplied; });

  const { counting, recipientCount, trigger: recount } = useRecipientCount(
    initialRecipientCount, filtersRef, columnsRef, onAppliedRef,
  );

  function addFilter(): AudienceFilter | null {
    setFilterError(null);
    if (!audienceColumns.length) return null;
    const existingKeys = new Set(filtersRef.current.map(audienceFilterKey));
    const candidate = findNextFilterCandidate(audienceColumns, existingKeys);
    if (!candidate) { setFilterError("That filter already exists."); return null; }
    const filter = { id: nextFilterId(), ...candidate };
    setFilters((prev) => [...prev, filter]);
    recount();
    return filter;
  }

  function patchFilter(id: string, patch: Partial<AudienceFilter>) {
    setFilters((prev) => {
      const next = prev.map((f) => f.id === id ? { ...f, ...patch } : f);
      const keys = next.map(audienceFilterKey);
      if (new Set(keys).size !== keys.length) { setFilterError("That filter already exists."); return prev; }
      setFilterError(null);
      return next;
    });
    recount();
  }

  function removeFilter(id: string) {
    setFilters((prev) => prev.filter((f) => f.id !== id));
    setFilterError(null);
    recount();
  }

  const activeFilters = filters.filter((f) => f.value.trim());

  return {
    filters,
    filterPayloads: toFilterPayloads(activeFilters, audienceColumns),
    activeFilterColumns: toActiveFilterColumns(activeFilters, audienceColumns),
    counting,
    recipientCount,
    filterError,
    addFilter,
    patchFilter,
    removeFilter,
  };
}
