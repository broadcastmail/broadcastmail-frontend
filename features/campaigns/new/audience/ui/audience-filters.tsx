"use client";

import {useState} from "react";
import {useInfiniteQuery} from "@tanstack/react-query";
import {listFilterValues} from "@/lib/api/generated/campaigns/campaigns";
import type {AudienceColumn, AudienceFilter, ColumnType, FilterOperator} from "@/features/campaigns/new/audience/audience";
import {AUDIENCE_OPS, columnFor, columnKey} from "@/features/campaigns/new/audience/audience";
import {buildSql, buildSqlText, displayValue} from "@/features/campaigns/new/audience/audience-sql";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {cn} from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface AudienceFiltersProps {
  columns: AudienceColumn[];
  filters: AudienceFilter[];
  filterError: string | null;
  filteredCount?: number;
  loadTimeMs?: number | null;
  selectionMode?: "all" | "none";
  includedIds?: Set<string>;
  excludedIds?: Set<string>;
  onAdd: () => AudienceFilter | null;
  onPatch: (id: string, patch: Partial<AudienceFilter>) => void;
  onRemove: (id: string) => void;
}

// ── Control style shared by shadcn SelectTrigger ──────────────────────────────

const controlClass =
  "h-[34px] bg-[#101015] border border-[#26262F] rounded-lg pl-3 pr-2 font-mono text-[12px] text-[#ECECF1] focus:border-orange/60 w-full";

// ── Main component ────────────────────────────────────────────────────────────

export function AudienceFilters({
  columns,
  filters,
  filterError,
  filteredCount,
  loadTimeMs,
  selectionMode = "all",
  includedIds = new Set(),
  excludedIds = new Set(),
  onAdd,
  onPatch,
  onRemove,
}: Readonly<AudienceFiltersProps>) {
  const [editingId, setEditingId] = useState<string | null>(() => filters.find((f) => !f.value.trim())?.id ?? null);
  const [sqlOpen, setSqlOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  function handleAdd() {
    const filter = onAdd();
    if (filter) setEditingId(filter.id);
  }

  const sqlLines = buildSql(filters, columns, selectionMode, includedIds, excludedIds);

  function handleCopySql() {
    const text = buildSqlText(sqlLines, selectionMode, includedIds, excludedIds);
    void navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <aside className="w-[240px] h-full shrink-0 flex flex-col overflow-y-auto bm-scrollbar px-[18px] pt-6 pb-20 gap-4 border-l border-white/[0.07] bg-surface/60">
      <div className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-[#7A7A85]">Filters</div>

      {/* Applied filter chips */}
      {filters.map((filter) =>
        editingId === filter.id || !filter.value.trim() ? (
          <AudienceFilterEditor
            key={filter.id}
            columns={columns}
            filter={filter}
            onPatch={onPatch}
            onRemove={(id) => { onRemove(id); setEditingId(null); }}
            onDone={() => setEditingId(null)}
          />
        ) : (
          <FilterChip
            key={filter.id}
            columns={columns}
            filter={filter}
            onEditStart={() => setEditingId(filter.id)}
            onRemove={() => onRemove(filter.id)}
          />
        ),
      )}

      {/* Add filter / add another */}
      {editingId === null && (
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center justify-center h-8 w-full rounded-[7px] border border-white/[0.18] text-[#ECECF1] text-[12.5px] font-medium cursor-pointer hover:border-white/[0.28] transition-colors"
          >
            {filters.length === 0 ? "Add filter" : "+ Add another"}
          </button>
          {filterError && <span className="text-[11px] text-[#E5726A]">{filterError}</span>}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* SQL section */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setSqlOpen((v) => !v)}
          className="flex items-center justify-between gap-2 border-none bg-transparent p-0 text-[11.5px] font-medium lowercase tracking-[0.04em] text-[#7A7A85] cursor-pointer hover:text-[#B9B9C2] transition-colors"
        >
          <span>segment.sql</span>
          <span className="font-mono text-[11px] normal-case tracking-normal">{sqlOpen ? "Hide" : "Show"}</span>
        </button>
        {sqlOpen && (
          <div className="relative flex flex-col bg-[#101015] border border-[#1E1E26] rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={handleCopySql}
              className="absolute top-[7px] right-[9px] font-mono text-[11px] whitespace-nowrap text-[#8E8E9A] hover:text-[#ECECF1] transition-colors bg-transparent border-none cursor-pointer"
            >
              {copied ? "Copied" : "Copy SQL"}
            </button>
            <div className="flex flex-col px-[11px] py-[10px] font-mono text-[11.5px] leading-[1.6] text-[#CBCBD4]">
              {sqlLines.map((line) => (
                <div key={`${line.kw}${line.rest}`} className="whitespace-pre-wrap break-all">
                  <span className="text-[#FFB067]">{line.kw}</span>
                  {line.rest}
                  <span className="text-[#D9C9A8]">{line.lit}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-[11px] py-[7px] border-t border-[#1E1E26] font-mono text-[11px] text-[#5C5C66]">
              <span className="whitespace-nowrap">
                {filteredCount != null ? `${filteredCount.toLocaleString()} rows` : "—"}
              </span>
              {loadTimeMs != null && (
                <span className="whitespace-nowrap">{loadTimeMs}ms</span>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Applied filter chip ───────────────────────────────────────────────────────

function FilterChip({
  columns,
  filter,
  onEditStart,
  onRemove,
}: Readonly<{
  columns: AudienceColumn[];
  filter: AudienceFilter;
  onEditStart: () => void;
  onRemove: () => void;
}>) {
  const col = columnFor(columns, filter.column);
  const opLabel = AUDIENCE_OPS[col.type].find(([v]) => v === filter.op)?.[1] ?? filter.op;
  const valDisplay = displayValue(filter.value, col.type);

  return (
    <div className="flex items-center gap-1.5 bg-orange/10 border border-orange/30 rounded-[7px] pl-2.5 pr-1.5 py-1.5">
      <button
        type="button"
        onClick={onEditStart}
        className="flex-1 min-w-0 text-left font-mono text-[12px] text-[#ECECF1] truncate"
      >
        <span className="text-orange">{col.name}</span> {opLabel} {valDisplay}
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove filter"
        className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0 text-orange hover:bg-orange/16 transition-colors"
      >
        <svg width="9" height="9" viewBox="0 0 12 12">
          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ── Filter editor ─────────────────────────────────────────────────────────────

function AudienceFilterEditor({
  columns,
  filter,
  onPatch,
  onRemove,
  onDone,
}: Readonly<{
  columns: AudienceColumn[];
  filter: AudienceFilter;
  onPatch: (id: string, patch: Partial<AudienceFilter>) => void;
  onRemove: (id: string) => void;
  onDone: () => void;
}>) {
  const col = columnFor(columns, filter.column);
  const { values, hasMore, loading, loadMore } = useFilterValues(col.name);
  const isDate = col.type === "timestamptz";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Select
          value={filter.column}
          onValueChange={(column) =>
            onPatch(filter.id, {
              column,
              op: AUDIENCE_OPS[columnFor(columns, column).type][0][0],
              value: "",
            })
          }
        >
          <SelectTrigger className={cn(controlClass, "flex-1 w-auto")}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#0C0C0F] border border-white/10 rounded-lg p-1 shadow-[0_12px_28px_rgba(0,0,0,0.55)]">
            {columns.map((c) => (
              <SelectItem
                key={columnKey(c.source, c.name)}
                value={columnKey(c.source, c.name)}
                className="px-[9px] py-[7px] rounded-[5px] font-mono text-[12px] text-[#CBCBD4] focus:bg-white/[0.055] focus:text-[#ECECF1]"
              >
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => onRemove(filter.id)}
          aria-label="Remove filter"
          className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0 text-orange hover:bg-orange/16 transition-colors"
        >
          <svg width="9" height="9" viewBox="0 0 12 12">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <Select value={filter.op} onValueChange={(op) => onPatch(filter.id, { op: op as FilterOperator })}>
        <SelectTrigger className={controlClass}><SelectValue /></SelectTrigger>
        <SelectContent className="bg-[#0C0C0F] border border-white/10 rounded-lg p-1 shadow-[0_12px_28px_rgba(0,0,0,0.55)]">
          {AUDIENCE_OPS[col.type].map(([value, label]) => (
            <SelectItem key={value} value={value} className="px-[9px] py-[7px] rounded-[5px] font-mono text-[12px] text-[#CBCBD4] focus:bg-white/[0.055] focus:text-[#ECECF1]">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isDate ? (
        <input
          type="text"
          value={filter.value}
          onChange={(e) => onPatch(filter.id, { value: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Enter" && filter.value.trim()) onDone(); }}
          placeholder="YYYY-MM-DD"
          className="h-[34px] w-full box-border bg-[#101015] border border-[#26262F] rounded-lg px-3 font-mono text-[12px] text-[#ECECF1] placeholder:text-[#4C4C58] focus:outline-none focus:border-orange/60 transition-colors"
        />
      ) : (
        <AudienceFilterValueSelect
          value={filter.value}
          values={values}
          hasMore={hasMore}
          loading={loading}
          onLoadMore={loadMore}
          onChange={(value) => onPatch(filter.id, { value })}
        />
      )}

      <AudienceFilterValuePills
        values={values}
        hasMore={hasMore}
        loading={loading}
        onLoadMore={() => loadMore()}
        onSelect={(value) => { onPatch(filter.id, { value }); onDone(); }}
        columnType={col.type}
      />

      <button
        type="button"
        onClick={() => { if (filter.value.trim()) onDone(); }}
        className={cn(
          "flex items-center justify-center h-8 w-full rounded-[7px] border text-[12.5px] font-medium transition-colors",
          filter.value.trim()
            ? "border-white/[0.18] text-[#ECECF1] cursor-pointer hover:border-white/[0.28]"
            : "border-[#1E1E26] text-[#4C4C58] cursor-default",
        )}
      >
        Add filter
      </button>
    </div>
  );
}

type FilterValueItem = { value: string; count: number };

function useFilterValues(columnName: string) {
  const { data, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["filterValues", columnName],
    queryFn: ({ pageParam }) => listFilterValues({ column: columnName, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: Infinity,
    select: (d) => ({
      values: d.pages.flatMap((p) =>
        (p.values ?? []).map((v): FilterValueItem => ({ value: v.value ?? "", count: v.count ?? 0 })),
      ),
      hasMore: d.pages.at(-1)?.hasMore ?? false,
    }),
  });

  return {
    values: data?.values ?? [],
    hasMore: hasNextPage ?? false,
    loading: isFetching || isFetchingNextPage,
    loadMore: () => fetchNextPage(),
  };
}

// ── Value select dropdown ─────────────────────────────────────────────────────

function AudienceFilterValueSelect({
  value,
  values,
  hasMore,
  loading,
  onLoadMore,
  onChange,
}: Readonly<{
  value: string;
  values: FilterValueItem[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  onChange: (v: string) => void;
}>) {
  const itemClass = "px-[9px] py-[7px] rounded-[5px] font-mono text-[12px] text-[#CBCBD4] focus:bg-white/[0.055] focus:text-[#ECECF1]";
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={controlClass}>
        <SelectValue placeholder={<span className="text-[#4C4C58]">value</span>} />
      </SelectTrigger>
      <SelectContent className="bg-[#0C0C0F] border border-white/10 rounded-lg p-1 shadow-[0_12px_28px_rgba(0,0,0,0.55)]">
        {loading && !values.length && (
          <div className="px-[9px] py-[7px] font-mono text-[12px] text-[#5C5C66]">Loading…</div>
        )}
        {values.map((item) => (
          <SelectItem key={item.value} value={item.value} className={itemClass}>
            <span>{item.value}</span>
            <span className="ml-2 text-[#5C5C66] text-[11px]">{item.count}</span>
          </SelectItem>
        ))}
        {hasMore && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onLoadMore(); }}
            className="w-full px-[9px] py-[7px] text-left font-mono text-[12px] text-[#8E8E9A] hover:text-[#CBCBD4] transition-colors"
          >
            {loading ? "Loading…" : "Load more…"}
          </button>
        )}
      </SelectContent>
    </Select>
  );
}

// ── Value pills (quick-select suggestions + load-more) ────────────────────────

function AudienceFilterValuePills({
  values,
  hasMore,
  loading,
  onLoadMore,
  onSelect,
  columnType,
}: Readonly<{
  values: FilterValueItem[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => Promise<unknown>;
  onSelect: (value: string) => void;
  columnType: ColumnType;
}>) {
  const [visibleCount, setVisibleCount] = useState(3);

  if (!values.length) return null;
  const visibleValues = values.slice(0, visibleCount);
  const canShowMore = visibleCount < values.length || hasMore;

  async function handleShowMore() {
    if (loading) return;
    if (visibleCount >= values.length && hasMore) await onLoadMore();
    setVisibleCount((n) => n + 3);
  }

  return (
    <div className="flex flex-wrap gap-[5px]">
      {visibleValues.map((item) => (
        <button
          type="button"
          key={item.value}
          onClick={() => onSelect(item.value)}
          className="inline-flex items-center gap-[5px] bg-[#101015] border border-[#1E1E26] rounded-[5px] px-[7px] py-[3px] font-mono text-[11px] text-[#B9B9C2] hover:border-[#3A3A46] hover:text-[#ECECF1] transition-colors cursor-pointer"
        >
          {displayValue(item.value, columnType)}
          <span className="text-[#5C5C66]">{item.count}</span>
        </button>
      ))}
      {canShowMore && (
        <button
          type="button"
          onClick={() => void handleShowMore()}
          disabled={loading}
          className="basis-full pt-0.5 text-left font-mono text-[11px] text-[#8E8E9A] hover:text-[#CBCBD4] disabled:opacity-50 transition-colors"
        >
          {loading ? "Loading…" : "Show more"}
        </button>
      )}
    </div>
  );
}
