import {apiClient} from "@/lib/api/client/client";
import type {AudienceMode, Campaign, CampaignRecipient, RecipientStatus} from "@/lib/types/campaigns";
import type {AudienceFilterPayload} from "@/features/campaigns/new/audience/audience";

// Spring's standard Page<T> envelope — matches what GET /campaigns already
// returns (see mocks/handlers/campaigns.ts), reused here for consistency
// since a real recipients endpoint would come back the same shape.
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface AudienceSelectionPayload {
  audienceMode?: AudienceMode;
  includedIds?: string[];
  excludedIds?: string[];
}

export type UpdateCampaignPayload = Partial<CreateCampaignPayload> & AudienceSelectionPayload;

export interface CreateCampaignPayload {
  name: string;
  subject: string;
  bodyHtml: string;
  filters?: AudienceFilterPayload[];
}

export async function createCampaign(
  payload: CreateCampaignPayload,
): Promise<Campaign> {
  const res = await apiClient.post<Campaign>("/api/v1/campaigns", payload);
  return res.data;
}

export async function getCampaign(id: string): Promise<Campaign> {
  const res = await apiClient.get<Campaign>(`/api/v1/campaigns/${id}`);
  return res.data;
}

export async function updateCampaign(
  id: string,
  payload: UpdateCampaignPayload,
): Promise<Campaign> {
  const res = await apiClient.patch<Campaign>(`/api/v1/campaigns/${id}`, payload);
  return res.data;
}

export async function previewRecipients(id: string): Promise<number> {
  const res = await apiClient.get<{ recipientCount: number }>(
    `/api/v1/campaigns/${id}/preview`,
  );
  return res.data.recipientCount;
}

export async function confirmCampaign(
  id: string,
  recipientCount?: number,
): Promise<void> {
  await apiClient.post(`/api/v1/campaigns/${id}/confirm`, { recipientCount });
}

export async function getCampaignRecipients(
  id: string,
  params: { status?: RecipientStatus; page?: number; size?: number } = {},
): Promise<PageResponse<CampaignRecipient>> {
  const res = await apiClient.get<PageResponse<CampaignRecipient>>(
    `/api/v1/campaigns/${id}/recipients`,
    { params },
  );
  return res.data;
}


export async function retryCampaign(id: string): Promise<Campaign> {
  const res = await apiClient.post<Campaign>(`/api/v1/campaigns/${id}/retry`);
  return res.data;
}

/** Re-attempts delivery to just the recipients currently FAILED/BOUNCED on
 *  an otherwise-terminal campaign (SENT or PARTIALLY_FAILED). */
export async function retryFailedRecipients(id: string): Promise<Campaign> {
  const res = await apiClient.post<Campaign>(`/api/v1/campaigns/${id}/recipients/retry-failed`);
  return res.data;
}
