import {createServerApiClient} from "@/lib/api/client/server-client";
import {getAccountEmailProvider, getReconnectSchema} from "@/lib/api/account";
import type {Campaign} from "@/lib/types/campaigns";
import type {AudienceColumn} from "@/features/campaigns/new/audience/audience";
import type {SchemaIntrospectionResult} from "@/lib/types/onboarding";
import type {AudienceListResponse} from "@/features/campaigns/api/audience";

export interface ComposerData {
  campaign: Campaign;
  audienceColumns: AudienceColumn[];
  resendConfigured: boolean;
  initialAudience: AudienceListResponse;
}

export async function getCampaign(id: string): Promise<Campaign> {
  const serverApiClient = await createServerApiClient();
  const res = await serverApiClient.get<Campaign>(`/api/v1/campaigns/${id}`);
  return res.data;
}

function buildAudienceColumns(schema: SchemaIntrospectionResult | null): AudienceColumn[] {
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

export async function getComposerData(campaign: Campaign): Promise<ComposerData> {
  const serverApiClient = await createServerApiClient();

  const savedFilterPayloads = campaign.filters.map(
    ({ columnName, operator, filterValue, source }) => ({
      columnName,
      operator,
      filterValue,
      source,
    }),
  );

  const [schema, emailProvider, initialAudienceRes] = await Promise.all([
    getReconnectSchema(),
    getAccountEmailProvider(),
    serverApiClient.get<AudienceListResponse>("/api/v1/audience/list", {
      params: {
        limit: 50,
        ...(savedFilterPayloads.length ? { filters: JSON.stringify(savedFilterPayloads) } : {}),
      },
    }),
  ]);

  return {
    campaign,
    audienceColumns: buildAudienceColumns(schema),
    resendConfigured: !!emailProvider?.fromAddress,
    initialAudience: initialAudienceRes.data,
  };
}
