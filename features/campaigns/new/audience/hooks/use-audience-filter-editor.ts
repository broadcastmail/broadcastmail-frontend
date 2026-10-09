"use client";

import {useRef, useState} from "react";
import {previewRecipients, updateCampaign} from "@/features/campaigns/api/campaigns";
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

interface UseAudienceFilterEditorOptions {
  campaignId: string;
  audienceColumns: AudienceColumn[];
  initialFilters: CampaignFilterResponse[];
  initialRecipientCount: number;
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
  campaignId,
  audienceColumns,
  initialFilters,
  initialRecipientCount,
}: UseAudienceFilterEditorOptions): AudienceFilterEditor {
  const [filters, setFilters] = useState(() =>
    fromFilterResponses(initialFilters, nextFilterId),
  );
  const [counting, setCounting] = useState(false);
  const [recipientCount, setRecipientCount] = useState(initialRecipientCount);
  const [filterError, setFilterError] = useState<string | null>(null);

  const countRequestRef = useRef(0);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const audienceColumnsRef = useRef(audienceColumns);
  audienceColumnsRef.current = audienceColumns;

  const { schedule: scheduleRecount } = useDebounceController();

  function recount() {
    setCounting(true);
    scheduleRecount(() => runRecount(++countRequestRef.current), 500);
  }

  async function runRecount(requestId: number) {
    if (filtersRef.current.some((f) => !f.value.trim())) {
      setCounting(false);
      return;
    }
    try {
      await updateCampaign(campaignId, {
        filters: toFilterPayloads(filtersRef.current, audienceColumnsRef.current),
      });
      const count = await previewRecipients(campaignId);
      if (requestId === countRequestRef.current) setRecipientCount(count);
    } catch (err) {
      console.error(`Recipient recount failed for campaign ${campaignId}`, err);
    } finally {
      if (requestId === countRequestRef.current) setCounting(false);
    }
  }

  function addFilter(): AudienceFilter | null {
    setFilterError(null);
    if (!audienceColumns.length) return null;
    const existingKeys = new Set(filtersRef.current.map(audienceFilterKey));
    const candidate = audienceColumns
      .map((column) => {
        const filter = {
          column: columnKey(column.source, column.name),
          op: AUDIENCE_OPS[column.type][0][0],
          value: column.type === "boolean" ? "true" : "",
        } satisfies Pick<AudienceFilter, "column" | "op" | "value">;
        return filter;
      })
      .find((filter) => !existingKeys.has(audienceFilterKey(filter)));

    if (!candidate) {
      setFilterError("That filter already exists.");
      return null;
    }

    const filter = { id: nextFilterId(), ...candidate };
    setFilters((prev) => [...prev, filter]);
    setFilterError(null);
    recount();
    return filter;
  }

  function patchFilter(id: string, patch: Partial<AudienceFilter>) {
    setFilters((prev) => {
      const next = prev.map((filter) =>
        filter.id === id ? { ...filter, ...patch } : filter,
      );
      const keys = next.map(audienceFilterKey);
      if (new Set(keys).size !== keys.length) {
        setFilterError("That filter already exists.");
        return prev;
      }
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

  const filterPayloads = toFilterPayloads(activeFilters, audienceColumns);

  const activeFilterColumns = Array.from(
    new Map(
      activeFilters.map((f) => [f.column, { key: f.column, name: columnFor(audienceColumns, f.column).name }]),
    ).values(),
  ).filter((col) => col.name !== "created_at");

  return {
    filters,
    filterPayloads,
    activeFilterColumns,
    counting,
    recipientCount,
    filterError,
    addFilter,
    patchFilter,
    removeFilter,
  };
}
