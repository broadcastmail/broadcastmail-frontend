import {apiClient} from "@/lib/api/client/client";
import type {AudienceFilterPayload} from "@/features/campaigns/new/audience/audience";

export interface AudienceRecipient {
  id: string;
  email: string;
  attributes: Record<string, string | number | boolean | null>;
}

export interface AudienceListResponse {
  recipients: AudienceRecipient[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
}

export interface AudienceFilterValue {
  value: string;
  count: number;
}

export interface AudienceFilterValuesResponse {
  column: string;
  values: AudienceFilterValue[];
  nextCursor: string | null;
  hasMore: boolean;
}

export async function listAudience(params: {
  cursor?: string | null;
  limit?: number;
  filters?: AudienceFilterPayload[];
  sortKey?: string;
  sortDirection?: "asc" | "desc";
} = {}): Promise<AudienceListResponse> {
  const query: Record<string, unknown> = {
    cursor: params.cursor ?? undefined,
    limit: params.limit ?? 50,
  };
  if (params.filters?.length) {
    query.filters = JSON.stringify(params.filters);
  }
  if (params.sortKey) {
    query.sortKey = params.sortKey;
    query.sortDirection = params.sortDirection ?? "asc";
  }
  const res = await apiClient.get<AudienceListResponse>("/api/v1/audience/list", { params: query });
  return res.data;
}

export async function getAudienceFilterValues(
  column: string,
  cursor?: string | null,
): Promise<AudienceFilterValuesResponse> {
  const res = await apiClient.get<AudienceFilterValuesResponse>(
    "/api/v1/audience/filters",
    { params: { column, cursor: cursor ?? undefined } },
  );
  return res.data;
}
