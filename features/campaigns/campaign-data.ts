import {createServerApiClient} from "@/lib/api/client/server-client";
import type {Campaign} from "@/lib/types/campaigns";
import type {AudienceColumn} from "@/features/campaigns/new/audience/audience";
import type {SchemaIntrospectionResult} from "@/lib/types/onboarding";
import type {AudienceListResponse} from "@/lib/api/generated/openAPIDefinition.schemas";
import type {AccountEmailProviderInfo} from "@/mocks/fixtures";

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
  const seen = new Set<string>();
  return [
    ...schema.filterableColumns
      .filter((c) => c.enabled)
      .map((c) => ({ name: c.columnName, type: c.columnType as AudienceColumn["type"], source: "PROFILE_TABLE" as const })),
    ...schema.authColumns
      .filter((c) => c.enabled)
      .map((c) => ({ name: c.columnName, type: c.columnType as AudienceColumn["type"], source: "AUTH_METADATA" as const })),
  ].filter((c) => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
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
    serverApiClient.get<SchemaIntrospectionResult>("/api/v1/connections/schema/reconnect").then((r) => r.data).catch(() => null),
    serverApiClient.get<AccountEmailProviderInfo>("/api/v1/account/email-provider").then((r) => r.data).catch(() => null),
    serverApiClient.post<AudienceListResponse>("/api/v1/campaigns/audience/list", savedFilterPayloads, {
      params: { limit: 50 },
    }),
  ]);

  return {
    campaign,
    audienceColumns: buildAudienceColumns(schema),
    resendConfigured: !!emailProvider?.fromAddress,
    initialAudience: initialAudienceRes.data,
  };
}
