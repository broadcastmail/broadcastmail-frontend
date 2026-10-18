"use client";

import {useState} from "react";
import {useInfiniteQuery} from "@tanstack/react-query";
import {X} from "lucide-react";
import {listFilterValues} from "@/lib/api/generated/campaigns/campaigns";
import type {AudienceColumn, AudienceFilter} from "@/features/campaigns/new/audience/audience";
import {AUDIENCE_OPS, columnFor, columnKey} from "@/features/campaigns/new/audience/audience";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {audiencePillClass} from "@/lib/utils";

interface AudienceFiltersProps {
  columns: AudienceColumn[];
  filters: AudienceFilter[];
  filterError: string | null;
  onAdd: () => AudienceFilter | null;
  onPatch: (id: string, patch: Partial<AudienceFilter>) => void;
  onRemove: (id: string) => void;
}

const controlClass = "h-[34px] bg-[#101015] border-[#26262F] rounded-lg px-2 font-mono text-[12px] text-[#ECECF1]";

export function AudienceFilters({
  columns,
  filters,
  filterError,
  onAdd,
  onPatch,
  onRemove,
}: Readonly<AudienceFiltersProps>) {
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleAdd() {
    const filter = onAdd();
    if (filter) setEditingId(filter.id);
  }

  return (
    <aside className="w-[240px] h-full shrink-0 overflow-y-auto bm-scrollbar px-[18px] py-6 border-l border-white/[0.07] bg-surface/60 flex flex-col gap-4 pb-20">
      <div className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-[#7A7A85]">Filters</div>
      {filters.map((filter) => (
        <AppliedAudienceFilter
          key={filter.id}
          columns={columns}
          filter={filter}
          editing={editingId === filter.id}
          onEditStart={() => setEditingId(filter.id)}
          onEditEnd={() => setEditingId(null)}
          onPatch={onPatch}
          onRemove={onRemove}
        />
      ))}
      <div className="flex flex-col items-start gap-1">
        <button type="button" onClick={handleAdd} className="text-left text-[12.5px] text-[#8E8E9A] hover:text-[#CBCBD4]">
          + Add filter
        </button>
        {filterError && <span className="text-[11px] text-[#E5726A]">{filterError}</span>}
      </div>
    </aside>
  );
}

function AppliedAudienceFilter({
  columns,
  filter,
  editing,
  onEditStart,
  onEditEnd,
  onPatch,
  onRemove,
}: Readonly<{
  columns: AudienceColumn[];
  filter: AudienceFilter;
  editing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onPatch: (id: string, patch: Partial<AudienceFilter>) => void;
  onRemove: (id: string) => void;
}>) {
  const definition = columnFor(columns, filter.column);
  const label = AUDIENCE_OPS[definition.type].find(([value]) => value === filter.op)?.[1] ?? filter.op;

  if (editing || !filter.value.trim()) {
    return (
      <AudienceFilterEditor
        columns={columns}
        filter={filter}
        onPatch={onPatch}
        onRemove={onRemove}
        onDone={onEditEnd}
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-orange/10 border border-orange/30 rounded-[7px] px-2 py-1.5">
      <button type="button" onClick={onEditStart} className="flex-1 min-w-0 text-left font-mono text-[12px] text-[#ECECF1] truncate">
        <span className="text-orange">{definition.name}</span> {label} {filter.value}
      </button>
      <button type="button" onClick={() => onRemove(filter.id)} aria-label="Remove filter" className="text-orange hover:text-orange-hover">
        <X size={11} />
      </button>
    </div>
  );
}

type FilterValueItem = { value: string; count: number };

function useFilterValues(columnName: string) {
  const { data, isFetching, isFetchingNextPage, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["filterValues", columnName],
    queryFn: ({ pageParam }) =>
      listFilterValues({ column: columnName, cursor: pageParam }),
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
  const definition = columnFor(columns, filter.column);
  const { values, hasMore, loading, loadMore } = useFilterValues(definition.name);

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
          <SelectTrigger className={`${controlClass} flex-1`}><SelectValue /></SelectTrigger>
          <SelectContent className="bg-[#0C0C0F] border border-white/10 rounded-lg p-1 shadow-[0_12px_28px_rgba(0,0,0,0.55)]">
            {columns.map((column) => (
              <SelectItem key={columnKey(column.source, column.name)} value={columnKey(column.source, column.name)} className="px-[9px] py-[7px] rounded-[5px] font-mono text-[12px] text-[#CBCBD4] focus:bg-white/[0.055] focus:text-[#ECECF1]">
                {column.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button type="button" onClick={() => onRemove(filter.id)} aria-label="Remove filter" className="p-1 text-orange">
          <X size={13} />
        </button>
      </div>
      <Select value={filter.op} onValueChange={(op) => onPatch(filter.id, { op: op as AudienceFilter["op"] })}>
        <SelectTrigger className={controlClass}><SelectValue /></SelectTrigger>
        <SelectContent className="bg-[#0C0C0F] border border-white/10 rounded-lg p-1 shadow-[0_12px_28px_rgba(0,0,0,0.55)]">
          {AUDIENCE_OPS[definition.type].map(([value, label]) => (
            <SelectItem key={value} value={value} className="px-[9px] py-[7px] rounded-[5px] font-mono text-[12px] text-[#CBCBD4] focus:bg-white/[0.055] focus:text-[#ECECF1]">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <AudienceFilterValueSelect
        value={filter.value}
        values={values}
        loading={loading}
        hasMore={hasMore}
        onChange={(value) => {
          onPatch(filter.id, { value });
          onDone();
        }}
        onLoadMore={() => { void loadMore(); }}
      />
      <AudienceFilterValuePills
        values={values}
        hasMore={hasMore}
        loading={loading}
        onLoadMore={() => loadMore()}
        onSelect={(value) => {
          onPatch(filter.id, { value });
          onDone();
        }}
      />
    </div>
  );
}

function AudienceFilterValueSelect({
  value,
  values,
  loading,
  hasMore,
  onChange,
  onLoadMore,
}: Readonly<{
  value: string;
  values: FilterValueItem[];
  loading: boolean;
  hasMore: boolean;
  onChange: (value: string) => void;
  onLoadMore: () => void;
}>) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`${controlClass} w-full`}>
        <SelectValue placeholder={loading ? "Loading..." : "Value"} />
      </SelectTrigger>
      <SelectContent className="bg-[#0C0C0F] border border-white/10 rounded-lg p-1 shadow-[0_12px_28px_rgba(0,0,0,0.55)]">
        {values.map((item) => (
          <SelectItem key={item.value} value={item.value} className="px-[9px] py-[7px] rounded-[5px] font-mono text-[12px] text-[#CBCBD4] focus:bg-white/[0.055] focus:text-[#ECECF1]">
            <span className="flex items-center gap-2">{item.value}<span className="text-[#5C5C66]">{item.count}</span></span>
          </SelectItem>
        ))}
        {hasMore && (
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onLoadMore} disabled={loading} className="w-full px-[9px] py-[7px] text-left font-mono text-[11px] text-[#8E8E9A] hover:text-[#CBCBD4] disabled:opacity-50">
            {loading ? "Loading..." : "Show 3 more"}
          </button>
        )}
      </SelectContent>
    </Select>
  );
}

function AudienceFilterValuePills({
  values,
  hasMore,
  loading,
  onLoadMore,
  onSelect,
}: Readonly<{
  values: FilterValueItem[];
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => Promise<unknown>;
  onSelect: (value: string) => void;
}>) {
  const [visibleCount, setVisibleCount] = useState(3);

  if (!values.length) return null;
  const visibleValues = values.slice(0, visibleCount);
  const canShowMore = visibleCount < values.length || hasMore;

  async function handleShowMore() {
    if (loading) return;
    if (visibleCount >= values.length && hasMore) {
      await onLoadMore();
    }
    setVisibleCount((current) => current + 3);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleValues.map((item) => (
        <button type="button" key={item.value} onClick={() => onSelect(item.value)} className={`inline-flex items-center gap-1 rounded-[5px] border border-white/[0.08] px-2 py-1 font-mono text-[11px] ${audiencePillClass(item.value, values.map((v) => v.value))} hover:border-white/[0.2]`}>
          {item.value}<span className="text-[#5C5C66]">{item.count}</span>
        </button>
      ))}
      {canShowMore && (
        <button
          type="button"
          onClick={() => void handleShowMore()}
          disabled={loading}
          className="basis-full pt-0.5 text-left font-mono text-[11px] text-[#8E8E9A] hover:text-[#CBCBD4] disabled:opacity-50"
        >
          {loading ? "Loading..." : "Show more"}
        </button>
      )}
    </div>
  );
}
