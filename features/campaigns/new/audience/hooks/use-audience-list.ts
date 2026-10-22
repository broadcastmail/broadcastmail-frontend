"use client";

import {startTransition, useLayoutEffect, useRef, useState} from "react";
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

  const seededRef = useRef<true | null>(null);
  if (seededRef.current == null) {
    seededRef.current = true;
    queryClient.setQueryData(queryKey, { pages: [initialPage], pageParams: [undefined] });
  }

  const prevQueryKeyStrRef = useRef(queryKeyStr);
  const fetchStartRef = useRef<number | null>(null);
  const fetchWasRealRef = useRef(false);
  const loadTimesRef = useRef(new Map<string, number>());

  const [lastIdleKey, setLastIdleKey] = useState(queryKeyStr);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);

  const reloading = queryKeyStr !== lastIdleKey;

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

  // Track per-filter load times and reloading state
  useLayoutEffect(() => {
    if (!isFetching) startTransition(() => setLastIdleKey(queryKeyStr));

    const keyChanged = queryKeyStr !== prevQueryKeyStrRef.current;
    prevQueryKeyStrRef.current = queryKeyStr;

    if (keyChanged) {
      fetchWasRealRef.current = false;
      startTransition(() => setLoadTimeMs(loadTimesRef.current.get(queryKeyStr) ?? null));
      fetchStartRef.current = isFetching ? Date.now() : null;
    }

    if (isFetching && fetchStartRef.current !== null) {
      fetchWasRealRef.current = true;
    }

    if (!isFetching && fetchStartRef.current !== null && fetchWasRealRef.current) {
      const elapsed = Date.now() - fetchStartRef.current;
      loadTimesRef.current.set(queryKeyStr, elapsed);
      startTransition(() => setLoadTimeMs(elapsed));
      fetchStartRef.current = null;
      fetchWasRealRef.current = false;
    }
  }, [queryKeyStr, isFetching]);

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
    loadTimeMs,
    hasMore: data?.hasMore ?? false,
    sort,
    loadMore: () => { void fetchNextPage(); },
    reload: () => { void queryClient.resetQueries({ queryKey }); },
    toggleSort,
  };
}
