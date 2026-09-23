export type ColumnType = "text" | "boolean" | "timestamptz";

export interface AudienceColumn {
  name: string;
  type: ColumnType;
}

export const AUDIENCE_OPS: Record<ColumnType, [string, string][]> = {
  text: [
    ["eq", "="],
    ["neq", "≠"],
    ["contains", "contains"],
  ],
  boolean: [
    ["eq", "="],
    ["neq", "≠"],
  ],
  timestamptz: [
    ["gt", ">"],
    ["lt", "<"],
    ["eq", "="],
  ],
};

export const TOTAL_AUDIENCE = 4960;

export interface AudienceFilter {
  id: string;
  column: string;
  op: string;
  value: string;
}

export function columnFor(
  columns: AudienceColumn[],
  name: string,
): AudienceColumn {
  return (
    columns.find((c) => c.name === name) ?? columns[0] ?? { name, type: "text" }
  );
}

export function estimateRecipientCount(filters: AudienceFilter[]): number {
  if (!filters.length) return TOTAL_AUDIENCE;
  const n = filters.reduce(
    (acc, f) => Math.round(acc * (f.value ? 0.42 : 0.71)),
    TOTAL_AUDIENCE,
  );
  return Math.max(n, 3);
}
