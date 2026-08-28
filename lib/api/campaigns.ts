import { apiClient } from "@/lib/api/client";
import type { Campaign } from "@/mocks/fixtures";
import type { JSONContent } from "@tiptap/core";

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

export async function updateCampaign(
  id: string,
  payload: Partial<CreateCampaignPayload>,
): Promise<Campaign> {
  const res = await apiClient.patch<Campaign>(`/api/v1/campaigns/${id}`, payload);
  return res.data;
}

export async function confirmCampaign(id: string): Promise<void> {
  await apiClient.post(`/api/v1/campaigns/${id}/confirm`);
}
