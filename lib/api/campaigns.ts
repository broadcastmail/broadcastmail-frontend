import { apiClient } from "@/lib/api/client";
import type { Campaign, CampaignRecipient, RecipientStatus } from "@/mocks/fixtures";
import type { JSONContent } from "@tiptap/core";

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

// Client-safe: no next/headers in this module's graph, so it's fine to
// import straight from the "use client" campaign composer (see the note
// on lib/api/email-provider.ts for why that split matters here).

// Two distinct shapes, not one `body: string` — deliberately, so a
// visually-composed body (bodyJson: schema-safe by construction, nothing
// in it can be markup the schema didn't produce — see
// lib/campaigns/editor-extensions.ts) is never indistinguishable at rest
// from an imported one (bodyHtmlImported: someone's own coded HTML,
// sanitized client-side but only actually safe once the API sanitizes it
// again on receipt — see lib/campaigns/sanitize-html-source.ts). Keeping
// them as separate fields means the API can apply the right validation to
// each rather than guessing which kind of string it received.
export type CreateCampaignPayload =
  | { name: string; subject: string; source: "visual"; bodyJson: JSONContent }
  | { name: string; subject: string; source: "import"; bodyHtmlImported: string };

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
  payload: Partial<CreateCampaignPayload>,
): Promise<Campaign> {
  const res = await apiClient.patch<Campaign>(`/api/v1/campaigns/${id}`, payload);
  return res.data;
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


export async function retryCampaign(id: string): Promise<void> {
  await apiClient.post(`/api/v1/campaigns/${id}/retry`);
}

/** Re-attempts delivery to just the recipients currently FAILED/BOUNCED on
 *  an otherwise-terminal campaign (SENT or PARTIALLY_FAILED). */
export async function retryFailedRecipients(id: string): Promise<void> {
  await apiClient.post(`/api/v1/campaigns/${id}/recipients/retry-failed`);
}
