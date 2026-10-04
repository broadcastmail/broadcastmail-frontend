export type ColumnType = "text" | "boolean" | "timestamptz";

export type FilterSource = "PROFILE_TABLE" | "AUTH_METADATA" | "AUTH_METADATA_JSON";


export type AudienceColumnSource = Exclude<FilterSource, "AUTH_METADATA_JSON">;

export interface AudienceColumn {
  name: string;
  type: ColumnType;
  source: AudienceColumnSource;
}

export type FilterOperator = "EQ" | "NEQ" | "GT" | "LT" | "CONTAINS";

export const AUDIENCE_OPS: Record<ColumnType, [FilterOperator, string][]> = {
  text: [
    ["EQ", "="],
    ["NEQ", "≠"],
    ["CONTAINS", "contains"],
  ],
  boolean: [
    ["EQ", "="],
    ["NEQ", "≠"],
  ],
  timestamptz: [
    ["GT", ">"],
    ["LT", "<"],
    ["EQ", "="],
  ],
};

export interface AudienceFilter {
  id: string;
  column: string;
  op: FilterOperator;
  value: string;
}

export function columnKey(source: FilterSource, name: string): string {
  return `${source}:${name}`;
}

export function columnFor(
  columns: AudienceColumn[],
  key: string,
): AudienceColumn {
  return (
    columns.find((c) => columnKey(c.source, c.name) === key) ??
    columns[0] ?? { name: key, type: "text", source: "PROFILE_TABLE" }
  );
}


export interface AudienceFilterPayload {
  columnName: string;
  operator: FilterOperator;
  filterValue: string;
  source: AudienceColumnSource;
}

export interface CampaignFilterResponse {
  columnName: string;
  operator: FilterOperator;
  filterValue: string;
  source: FilterSource;
  jsonKey: string | null;
}

export function fromFilterResponses(
  responses: CampaignFilterResponse[],
  nextId: () => string,
): AudienceFilter[] {
  return responses.map((r) => ({
    id: nextId(),
    column: columnKey(r.source, r.columnName),
    op: r.operator,
    value: r.filterValue,
  }));
}

export function toFilterPayloads(
  filters: AudienceFilter[],
  columns: AudienceColumn[],
): AudienceFilterPayload[] {
  return filters.map((f) => {
    const col = columnFor(columns, f.column);
    return {
      columnName: col.name,
      operator: f.op,
      filterValue: f.value,
      source: col.source,
    };
  });
}
