"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {isAxiosError} from "axios";
import type {CampaignResponse} from "@/lib/api/generated/openAPIDefinition.schemas";
import {setLiveStatus} from "./live-status";

function parseRetryError(err: unknown): { message: string; isConflict: boolean } {
  return {
    message: isAxiosError(err) && err.response?.data?.error
      ? String(err.response.data.error)
      : "Couldn't complete the retry. Try again in a moment.",
    isConflict: isAxiosError(err) && err.response?.status === 409,
  };
}

interface RetryOptions {
  recipientsCount: number | null;
  campaignName: string;
  onSuccess?: (oldId: string) => void;
}

export function useRetryAction() {
  const router = useRouter();
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [retryErrors, setRetryErrors] = useState<Map<string, string>>(new Map());
  const [conflictIds, setConflictIds] = useState<Set<string>>(new Set());

  async function retry(campaignId: string, apiFn: () => Promise<CampaignResponse>, options: RetryOptions) {
    setRetryingIds((prev) => new Set(prev).add(campaignId));
    setRetryErrors((prev) => { const m = new Map(prev); m.delete(campaignId); return m; });
    try {
      const result = await apiFn();
      const newId = result.id ?? campaignId;
      setLiveStatus(
        { id: newId, name: options.campaignName, status: "RESOLVING", sentCount: 0,
          recipientsCount: options.recipientsCount, openedCount: 0, deliveredCount: 0, bouncedCount: 0, failedCount: 0 },
        options.campaignName,
      );
      options.onSuccess?.(campaignId);
      router.push(`/dashboard/campaigns/${newId}`);
    } catch (err) {
      const { message, isConflict } = parseRetryError(err);
      setRetryingIds((prev) => { const s = new Set(prev); s.delete(campaignId); return s; });
      setRetryErrors((prev) => new Map(prev).set(campaignId, message));
      if (isConflict) setConflictIds((prev) => new Set(prev).add(campaignId));
    }
  }

  function clearError(campaignId: string) {
    setRetryErrors((prev) => { const m = new Map(prev); m.delete(campaignId); return m; });
  }

  return {
    retry,
    isRetrying: (id: string) => retryingIds.has(id),
    retryError: (id: string) => retryErrors.get(id) ?? null,
    isConflict: (id: string) => conflictIds.has(id),
    clearError,
  };
}
