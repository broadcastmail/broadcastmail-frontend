"use client";

import {useAudienceList} from "./use-audience-list";
import {useAudienceSelection} from "./use-audience-selection";
import type {AudienceListResponse} from "@/features/campaigns/api/audience";
import type {AudienceFilterPayload} from "@/features/campaigns/new/audience/audience";
import type {AudienceMode} from "@/lib/types/campaigns";

interface UseAudienceTableOptions {
  initialPage: AudienceListResponse;
  filterPayloads: AudienceFilterPayload[];
  initialAudienceMode: AudienceMode | null;
  initialIncludedIds: string[] | null;
  initialExcludedIds: string[] | null;
}

export function useAudienceTable({
  initialPage,
  filterPayloads,
  initialAudienceMode,
  initialIncludedIds,
  initialExcludedIds,
}: UseAudienceTableOptions) {
  const list = useAudienceList({ initialPage, filterPayloads });
  const selection = useAudienceSelection({
    initialAudienceMode,
    initialIncludedIds,
    initialExcludedIds,
    filterPayloads,
    total: list.total,
  });
  return { list, selection };
}
