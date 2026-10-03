import { apiClient } from "@/lib/api/client";
import { forwardedCookieHeader } from "@/lib/api/server-cookies";
import { getReconnectSchema, getAccountEmailProvider } from "@/lib/api/account";
import type { Campaign } from "@/mocks/fixtures";
import {
  type AudienceColumn,
  type CampaignFilterResponse,
} from "@/lib/campaigns/audience";
import type { SchemaIntrospectionResult } from "@/lib/types/onboarding";

export interface ComposerData {
  campaign: Campaign;
  audienceColumns: AudienceColumn[];
  resendConfigured: boolean;
  initialFilters: CampaignFilterResponse[];
  initialRecipientCount: number;
}

export async function getCampaignServerSide(id: string): Promise<Campaign> {
  const res = await apiClient.get<Campaign>(`/api/v1/campaigns/${id}`, {
    headers: { Cookie: await forwardedCookieHeader() },
  });
  return res.data;
}

async function previewRecipientsServerSide(id: string): Promise<number> {
  const res = await apiClient.get<{ recipientCount: number }>(
    `/api/v1/campaigns/${id}/preview`,
    { headers: { Cookie: await forwardedCookieHeader() } },
  );
  return res.data.recipientCount;
}

function buildAudienceColumns(
  schema: SchemaIntrospectionResult | null,
): AudienceColumn[] {
  if (schema?.status !== "DETECTED") return [];
  return [
    ...schema.filterableColumns
      .filter((c) => c.enabled)
      .map((c) => ({
        name: c.columnName,
        type: c.columnType as AudienceColumn["type"],
        source: "PROFILE_TABLE" as const,
      })),
    ...schema.authColumns
      .filter((c) => c.enabled)
      .map((c) => ({
        name: c.columnName,
        type: c.columnType as AudienceColumn["type"],
        source: "AUTH_METADATA" as const,
      })),
  ];
}

export async function getComposerExtras(
  campaign: Campaign,
): Promise<ComposerData> {
  const [schema, emailProvider, initialRecipientCount] = await Promise.all([
    getReconnectSchema(),
    getAccountEmailProvider(),
    previewRecipientsServerSide(campaign.id),
  ]);
  return {
    campaign,
    audienceColumns: buildAudienceColumns(schema),
    resendConfigured: !!emailProvider?.fromAddress,
    initialFilters: campaign.filters,
    initialRecipientCount,
  };
}
