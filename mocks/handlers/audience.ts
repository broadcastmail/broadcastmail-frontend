import {http, HttpResponse} from "msw";
import {faker} from "@faker-js/faker";
import type {AudienceRecipient} from "@/features/campaigns/api/audience";
import type {AudienceFilterPayload} from "@/features/campaigns/new/audience/audience";

const TOTAL = 4960;
function planFor(index: number) {
  const slot = index % 13;
  if (slot < 8) return "free";
  if (slot < 12) return "pro";
  return "team";
}

const USERS: AudienceRecipient[] = Array.from({ length: TOTAL }, (_, index) => {
  const first = ["alex", "sara", "dmitri", "priya", "jonas", "mei", "omar", "lucia"][
    index % 8
  ];
  const plan = planFor(index);
  const country = ["US", "UK", "DE", "IN", "FR", "BR", "CA", "NL"][index % 8];
  return {
    id: faker.string.uuid(),
    email: `${first}.${index + 10}@${["company.io", "startup.co", "acme.dev"][index % 3]}`,
    attributes: {
      plan,
      country,
      joined: `2026-${String((index % 9) + 1).padStart(2, "0")}-01`,
      created_at: new Date(2026, index % 9, (index % 28) + 1).toISOString(),
    },
  };
});

function applyPredicates(user: AudienceRecipient, predicates: AudienceFilterPayload[]): boolean {
  return predicates.every((p) => {
    const value = String(user.attributes[p.columnName] ?? "").toLowerCase();
    const target = p.filterValue.trim().toLowerCase();
    if (!target) return true;
    switch (p.operator) {
      case "EQ": return value === target;
      case "NEQ": return value !== target;
      case "CONTAINS": return value.includes(target);
      case "GT": return value > target;
      case "LT": return value < target;
      default: return true;
    }
  });
}

export const audienceHandlers = [
  http.get("*/api/v1/audience/list", ({ request }) => {
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 100);
    const rawFilters = url.searchParams.get("filters");
    const sortKey = url.searchParams.get("sortKey") ?? "created_at";
    const sortDirection = url.searchParams.get("sortDirection") ?? "desc";
    const predicates: AudienceFilterPayload[] = rawFilters ? (JSON.parse(rawFilters) as AudienceFilterPayload[]) : [];
    const filtered = predicates.length ? USERS.filter((u) => applyPredicates(u, predicates)) : USERS;
    const sorted = [...filtered].sort((a, b) => {
      const left = String(a.attributes[sortKey] ?? a.email);
      const right = String(b.attributes[sortKey] ?? b.email);
      const result = left.localeCompare(right, undefined, { numeric: true });
      return sortDirection === "asc" ? result : -result;
    });
    const start = cursor ? Number(cursor) : 0;
    const recipients = sorted.slice(start, start + limit);
    const nextOffset = start + recipients.length;
    const nextCursor = nextOffset < sorted.length ? String(nextOffset) : null;
    return HttpResponse.json({
      recipients,
      nextCursor,
      hasMore: nextOffset < sorted.length,
      total: sorted.length,
    });
  }),

  http.get("*/api/v1/audience/filters", ({ request }) => {
    const url = new URL(request.url);
    const column = url.searchParams.get("column") ?? "plan";
    const cursor = url.searchParams.get("cursor");
    const counts = new Map<string, number>();
    for (const recipient of USERS) {
      const value = String(recipient.attributes[column] ?? "");
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const values = [...counts.entries()]
      .filter(([value]) => value)
      .map(([value, count]) => ({ value, count }))
      .sort((left, right) => left.value.localeCompare(right.value));
    const start = cursor ? values.findIndex((item) => item.value > cursor) : 0;
    const pageStart = start < 0 ? values.length : start;
    const page = values.slice(pageStart, pageStart + 3);
    return HttpResponse.json({
      column,
      values: page,
      nextCursor: page.at(-1)?.value ?? null,
      hasMore: pageStart + page.length < values.length,
    });
  }),
];
