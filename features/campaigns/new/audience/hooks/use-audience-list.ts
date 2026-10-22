"use client";

import {useRef, useState} from "react";
import {keepPreviousData, useInfiniteQuery, useQueryClient} from "@tanstack/react-query";
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
  reloading: boolean;
  loadTimeMs: number | null;
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
  const queryKeyStr = JSON.stringify({ f: filterPayloads, s: sort });
  const lastIdleKeyRef = useRef(queryKeyStr);

  // Seed only the initial key's cache — not every key the hook ever sees
  const seededRef = useRef(false);
  const prevQueryKeyStrRef = useRef(queryKeyStr);
  const fetchStartRef = useRef<number | null>(null);
  const fetchWasRealRef = useRef(false);
  const loadTimesRef = useRef(new Map<string, number>());

  if (!seededRef.current) {
    seededRef.current = true;
    queryClient.setQueryData(queryKey, { pages: [initialPage], pageParams: [undefined] });
    loadTimesRef.current.set(queryKeyStr, Math.round(performance.now()));
  }

  const { data, isFetching, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, queryKey: key }) => {
      const [, , keyFilters, keySort] = key as [unknown, unknown, AudienceFilterPayload[], Sort];
      return listAudience(keyFilters, {
        cursor: pageParam,
        limit: 50,
        sortKey: keySort.key,
        sortDirection:
          keySort.direction === "asc"
            ? ListAudienceSortDirection.ASCENDING
            : ListAudienceSortDirection.DESCENDING,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    select: (d) => ({
      recipients: d.pages.flatMap((p) => p.recipients ?? []),
      total: d.pages.at(-1)?.total ?? 0,
      hasMore: d.pages.at(-1)?.hasMore ?? false,
    }),
  });

  if (!isFetching) lastIdleKeyRef.current = queryKeyStr;

  const reloading = queryKeyStr !== lastIdleKeyRef.current;

  if (queryKeyStr !== prevQueryKeyStrRef.current) {
    prevQueryKeyStrRef.current = queryKeyStr;
    fetchStartRef.current = Date.now();
    fetchWasRealRef.current = false;
  }
  if (isFetching && fetchStartRef.current !== null) {
    fetchWasRealRef.current = true;
  }
  if (!isFetching && fetchStartRef.current !== null) {
    if (fetchWasRealRef.current) {
      loadTimesRef.current.set(queryKeyStr, Date.now() - fetchStartRef.current);
    }
    fetchStartRef.current = null;
  }

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
    reloading,
    loadTimeMs: loadTimesRef.current.get(queryKeyStr) ?? null,
    hasMore: data?.hasMore ?? false,
    sort,
    loadMore: () => { void fetchNextPage(); },
    reload: () => { void queryClient.resetQueries({ queryKey }); },
    toggleSort,
  };
}
