export type ColumnSource = "profile" | "auth";

export function columnKey(source: ColumnSource, name: string): string {
  return `${source}:${name}`;
}

export function columnNameFromKey(key: string): string {
  return key.slice(key.indexOf(":") + 1);
}
