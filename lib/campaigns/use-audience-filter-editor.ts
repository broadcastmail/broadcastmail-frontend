"use client";

import { useRef, useState } from "react";
import { previewRecipients } from "@/lib/api/campaigns";
import { useDebounceController } from "@/lib/campaigns/use-debounced-callback";
import {
  AUDIENCE_OPS,
  columnKey,
  fromFilterResponses,
  type AudienceColumn,
  type AudienceFilter,
  type CampaignFilterResponse,
} from "@/lib/campaigns/audience";

let filterIdSeq = 0;
const nextFilterId = () => `filter-${++filterIdSeq}`;

interface UseAudienceFilterEditorOptions {
  campaignId: string;
  audienceColumns: AudienceColumn[];
  initialFilters: CampaignFilterResponse[];
  initialRecipientCount: number;
}

export interface AudienceFilterEditor {
  filters: AudienceFilter[];
  filtersTouched: boolean;
  counting: boolean;
  recipientCount: number;
  addFilter: () => void;
  patchFilter: (id: string, patch: Partial<AudienceFilter>) => void;
  removeFilter: (id: string) => void;
  recount: (saveNow: () => Promise<void>) => void;
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

  const countRequestRef = useRef(0);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const { schedule: scheduleRecount } = useDebounceController();

  function recount(saveNow: () => Promise<void>) {
    setCounting(true);
    scheduleRecount(() => runRecount(++countRequestRef.current, saveNow), 500);
  }

  async function runRecount(requestId: number, saveNow: () => Promise<void>) {
    if (filtersRef.current.some((f) => !f.value.trim())) {
      setCounting(false);
      return;
    }
    try {
      await saveNow();
      const count = await previewRecipients(campaignId);
      if (requestId === countRequestRef.current) setRecipientCount(count);
    } catch (err) {
      console.error(`Recipient recount failed for campaign ${campaignId}`, err);
    } finally {
      if (requestId === countRequestRef.current) setCounting(false);
    }
  }

  function addFilter() {
    if (!audienceColumns.length) return;
    const first = audienceColumns[0];
    setFilters((prev) => [
      ...prev,
      {
        id: nextFilterId(),
        column: columnKey(first.source, first.name),
        op: AUDIENCE_OPS[first.type][0][0],
        value: first.type === "boolean" ? "true" : "",
      },
    ]);
  }

  function patchFilter(id: string, patch: Partial<AudienceFilter>) {
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeFilter(id: string) {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }

  return {
    filters,
    filtersTouched: true,
    counting,
    recipientCount,
    addFilter,
    patchFilter,
    removeFilter,
    recount,
  };
}
