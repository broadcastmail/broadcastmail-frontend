// Audience-filter columns and the recipient-count simulation. There's no
// backend endpoint yet for "which columns are filterable" or "how many
// rows match these filters" (the mocked /campaigns/:id/preview route
// returns a flat 42 regardless of input) — this mirrors the same
// deterministic client-side estimate the design mock used, so the filter
// builder still feels alive. Swap for a real column list + preview call
// once that contract exists.

export type ColumnType = "text" | "boolean" | "timestamptz";

export interface AudienceColumn {
  name: string;
  type: ColumnType;
}

export const AUDIENCE_COLUMNS: AudienceColumn[] = [
  { name: "plan", type: "text" },
  { name: "created_at", type: "timestamptz" },
  { name: "is_verified", type: "boolean" },
];

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

export function columnFor(name: string): AudienceColumn {
  return (
    AUDIENCE_COLUMNS.find((c) => c.name === name) ?? AUDIENCE_COLUMNS[0]
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
