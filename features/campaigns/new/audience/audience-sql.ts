import type {AudienceColumn, AudienceFilter, ColumnType, FilterOperator} from "./audience";
import {columnFor} from "./audience";

export type SqlLine = { kw: string; rest: string; lit: string };

const SQL_OP: Record<FilterOperator, string> = {
  EQ: "=", NEQ: "<>", GT: ">", LT: "<", CONTAINS: "ILIKE",
};

function colExpr(col: AudienceColumn): string {
  if (col.source === "AUTH_METADATA") return `u.raw_user_meta_data->>'${col.name}'`;
  if (col.type === "timestamptz") return "u.created_at";
  return `p.${col.name}`;
}

export function buildSql(
  filters: AudienceFilter[],
  columns: AudienceColumn[],
  selectionMode: "all" | "none",
  includedIds: Set<string>,
  excludedIds: Set<string>,
): SqlLine[] {
  const hasProfile = filters.some((f) => columnFor(columns, f.column).source === "PROFILE_TABLE");
  const lines: SqlLine[] = [
    { kw: "SELECT", rest: " u.email", lit: "" },
    { kw: "FROM", rest: " auth.users u", lit: "" },
  ];
  if (hasProfile) lines.push({ kw: "JOIN", rest: " profiles p USING (id)", lit: "" });

  let whereAdded = false;
  for (const f of filters) {
    const col = columnFor(columns, f.column);
    const expr = colExpr(col);
    const val = f.op === "CONTAINS" ? `%${f.value}%` : f.value;
    lines.push({
      kw: whereAdded ? "  AND" : "WHERE",
      rest: ` ${expr} ${SQL_OP[f.op]} `,
      lit: `'${val.replaceAll('\'', "''")}'`,
    });
    whereAdded = true;
  }

  if (selectionMode === "none" && includedIds.size > 0) {
    lines.push({ kw: whereAdded ? "  AND" : "WHERE", rest: " u.id IN ", lit: `(…${includedIds.size} ids)` });
  } else if (selectionMode === "all" && excludedIds.size > 0) {
    lines.push({ kw: whereAdded ? "  AND" : "WHERE", rest: " u.id NOT IN ", lit: `(…${excludedIds.size} ids)` });
  }

  return lines;
}

export function buildSqlText(
  lines: SqlLine[],
  selectionMode: "all" | "none",
  includedIds: Set<string>,
  excludedIds: Set<string>,
): string {
  return lines.map((l) => {
    if (l.lit.startsWith("(…")) {
      const ids = selectionMode === "none" ? includedIds : excludedIds;
      return l.kw + l.rest + `(${Array.from(ids).map((id) => `'${id}'`).join(", ")})`;
    }
    return l.kw + l.rest + l.lit;
  }).join("\n");
}

export function fmtDateVal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function displayValue(value: string, type: ColumnType): string {
  return type === "timestamptz" ? fmtDateVal(value) : value;
}
