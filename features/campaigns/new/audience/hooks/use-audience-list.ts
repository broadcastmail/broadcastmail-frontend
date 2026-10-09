"use client";

import {useCallback, useRef, useState} from "react";
import {type AudienceListResponse, type AudienceRecipient, listAudience} from "@/features/campaigns/api/audience";
import type {AudienceFilterPayload} from "@/features/campaigns/new/audience/audience";

type Sort = { key: string; direction: "asc" | "desc" };

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
  const [recipients, setRecipients] = useState<AudienceRecipient[]>(initialPage.recipients);
  const [cursor, setCursor] = useState<string | null>(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [total, setTotal] = useState(initialPage.total);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<Sort>({ key: "created_at", direction: "desc" });

  const sortRef = useRef(sort);
  sortRef.current = sort;

  const filterPayloadsRef = useRef(filterPayloads);
  filterPayloadsRef.current = filterPayloads;

  const fetch = useCallback(
    async (nextCursor: string | null = null, activeSort?: Sort) => {
      setLoading(true);
      const s = activeSort ?? sortRef.current;
      try {
        const page = await listAudience({
          cursor: nextCursor,
          limit: 50,
          filters: filterPayloadsRef.current,
          sortKey: s.key,
          sortDirection: s.direction,
        });
        setRecipients((current) =>
          nextCursor ? [...current, ...page.recipients] : page.recipients,
        );
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
        setTotal(page.total);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  function toggleSort(key: string) {
    const next: Sort = {
      key,
      direction: sortRef.current.key === key && sortRef.current.direction === "asc" ? "desc" : "asc",
    };
    setSort(next);
    void fetch(null, next);
  }

  return {
    recipients,
    loadedCount: recipients.length,
    total,
    loading,
    hasMore,
    sort,
    loadMore: () => void fetch(cursor),
    reload: () => void fetch(null),
    toggleSort,
  };
}
