"use client";

import {useState} from "react";
import {useInfiniteQuery, useQueryClient} from "@tanstack/react-query";
import {listAudience} from "@/lib/api/generated/campaigns/campaigns";
import type {AudienceListResponse, AudienceRecipient} from "@/lib/api/generated/openAPIDefinition.schemas";
import {ListAudienceSortDirection} from "@/lib/api/generated/openAPIDefinition.schemas";
import type {AudienceFilterPayload} from "@/features/campaigns/new/audience/audience";

type Sort = { key: string; direction: "asc" | "desc" };

const audienceListKey = (filters: AudienceFilterPayload[], sort: Sort) =>
  ["audience", "list", filters, sort] as const;

interface UseAudienceListOptions {
  initialPage: AudienceListResponse;
  filterPayloads: AudienceFilterPayload[];
}

export interface UseAudienceListResult {
  recipients: AudienceRecipient[];
  loadedCount: number;
  total: number;
  loading: boolean;
  hasMore: boolean;
  sort: Sort;
  loadMore: () => void;
  reload: () => void;
  toggleSort: (key: string) => void;
}

export function useAudienceList({
  initialPage,
  filterPayloads,
}: UseAudienceListOptions): UseAudienceListResult {
  const [sort, setSort] = useState<Sort>({ key: "created_at", direction: "desc" });
  const queryClient = useQueryClient();
  const queryKey = audienceListKey(filterPayloads, sort);

  const { data, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      listAudience(filterPayloads, {
        cursor: pageParam,
        limit: 50,
        sortKey: sort.key,
        sortDirection:
          sort.direction === "asc"
            ? ListAudienceSortDirection.ASCENDING
            : ListAudienceSortDirection.DESCENDING,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: Infinity,
    initialData: { pages: [initialPage], pageParams: [undefined] },
    select: (d) => ({
      recipients: d.pages.flatMap((p) => p.recipients ?? []),
      total: d.pages.at(-1)?.total ?? 0,
      hasMore: d.pages.at(-1)?.hasMore ?? false,
    }),
  });

  const recipients = data?.recipients ?? [];

  function toggleSort(key: string) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  return {
    recipients,
    loadedCount: recipients.length,
    total: data?.total ?? 0,
    loading: isFetchingNextPage,
    hasMore: data?.hasMore ?? false,
    sort,
    loadMore: () => { void fetchNextPage(); },
    reload: () => { void queryClient.resetQueries({ queryKey }); },
    toggleSort,
  };
}
