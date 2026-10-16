"use client";

import {useState} from "react";
import {toast} from "sonner";
import {X} from "lucide-react";
import type {AudienceFilterValuesResponse} from "@/features/campaigns/api/audience";
import {getAudienceFilterValues} from "@/features/campaigns/api/audience";
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
  const [valuesByFilterId, setValuesByFilterId] = useState<
    Record<string, AudienceFilterValuesResponse>
  >({});
  const [loadingFilterId, setLoadingFilterId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);


  // Template method pattern
  async function loadFilterValues(filterId: string, columnKeyVal: string, onLoaded?: () => void) {
    setLoadingFilterId(filterId);
    try {
      const response = await getAudienceFilterValues(columnFor(columns, columnKeyVal).name);
      setValuesByFilterId((current) => ({ ...current, [filterId]: response }));
      onLoaded?.();
    } catch {
      toast.error("Couldn't load filter values — try again.");
    } finally {
      setLoadingFilterId(null);
    }
  }

  async function handleAdd() {
    const filter = onAdd();
    if (!filter) return;
    await loadFilterValues(filter.id, filter.column, () => setEditingId(filter.id));
  }

  async function handleEditStart(id: string, column: string) {
    setEditingId(id);
    if (valuesByFilterId[id]) return;
    await loadFilterValues(id, column);
  }

  async function handlePatchFilter(id: string, patch: Partial<AudienceFilter>) {
    onPatch(id, patch);
    if (!patch.column) return;
    setValuesByFilterId((current) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = current;
      return rest;
    });
    await loadFilterValues(id, patch.column);
  }

  return (
    <aside className="w-[240px] h-full shrink-0 overflow-y-auto bm-scrollbar px-[18px] py-6 border-l border-white/[0.07] bg-surface/60 flex flex-col gap-4 pb-20">
      <div className="text-[11.5px] font-medium uppercase tracking-[0.04em] text-[#7A7A85]">Filters</div>
      {filters.map((filter) => (
        <AppliedAudienceFilter
          key={`${filter.id}-${valuesByFilterId[filter.id] ? "loaded" : "empty"}`}
          columns={columns}
          filter={filter}
          initialPage={valuesByFilterId[filter.id]}
          editing={editingId === filter.id}
          onEditStart={() => void handleEditStart(filter.id, filter.column)}
          onEditEnd={() => setEditingId(null)}
          onPatch={handlePatchFilter}
          onRemove={onRemove}
        />
      ))}
      <div className="flex flex-col items-start gap-1">
        <button type="button" onClick={() => void handleAdd()} className="text-left text-[12.5px] text-[#8E8E9A] hover:text-[#CBCBD4]">
          {loadingFilterId ? "Loading..." : "+ Add filter"}
        </button>
        {filterError && <span className="text-[11px] text-[#E5726A]">{filterError}</span>}
      </div>
    </aside>
  );
}

function AppliedAudienceFilter({
  columns,
  filter,
  initialPage,
  editing,
  onEditStart,
  onEditEnd,
  onPatch,
  onRemove,
}: Readonly<{
    columns: AudienceColumn[];
    filter: AudienceFilter;
    initialPage?: AudienceFilterValuesResponse;
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
        key={filter.column}
        columns={columns}
        filter={filter}
        initialPage={initialPage}
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

function useFilterValues(columnName: string, initialPage?: AudienceFilterValuesResponse) {
  const [values, setValues] = useState(initialPage?.values ?? []);
  const [nextCursor, setNextCursor] = useState<string | null>(initialPage?.nextCursor ?? null);
  const [hasMore, setHasMore] = useState(initialPage?.hasMore ?? false);
  const [loading, setLoading] = useState(false);

  const uniqueValues = Array.from(
    new Map(values.map((v) => [v.value, v])).values(),
  );

  async function loadMore() {
    if (!hasMore || !nextCursor || loading) return;
    setLoading(true);
    try {
      const response = await getAudienceFilterValues(columnName, nextCursor);
      setValues((current) => [
        ...current,
        ...response.values.filter((v) => !current.some((item) => item.value === v.value)),
      ]);
      setNextCursor(response.nextCursor);
      setHasMore(response.hasMore);
    } finally {
      setLoading(false);
    }
  }

  return { uniqueValues, hasMore, loading, loadMore };
}

function AudienceFilterEditor({
  columns,
  filter,
  onPatch,
  onRemove,
  onDone,
  initialPage,
}: Readonly<{
    columns: AudienceColumn[];
    filter: AudienceFilter;
    onPatch: (id: string, patch: Partial<AudienceFilter>) => void;
    onRemove: (id: string) => void;
    onDone: () => void;
    initialPage?: AudienceFilterValuesResponse;
}>) {
  const definition = columnFor(columns, filter.column);
  const { uniqueValues, hasMore, loading: loadingValues, loadMore: loadMoreValues } = useFilterValues(definition.name, initialPage);

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
        values={uniqueValues}
        loading={loadingValues}
        hasMore={hasMore}
        onChange={(value) => {
          onPatch(filter.id, { value });
          onDone();
        }}
        onLoadMore={() => void loadMoreValues()}
      />
      <AudienceFilterValuePills
        values={uniqueValues}
        hasMore={hasMore}
        loading={loadingValues}
        onLoadMore={loadMoreValues}
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
    values: { value: string; count: number }[];
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
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onLoadMore} disabled={loading} className="w-full px-[9px] py-[7px] text-left font-mono text-[11px] text-[#8E8E9A] hover:text-[#CBCBD4] disabled:opacity-50">
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
    values: { value: string; count: number }[];
    hasMore: boolean;
    loading: boolean;
    onLoadMore: () => Promise<void>;
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
        <button type="button" key={item.value} onClick={() => onSelect(item.value)} className={`inline-flex items-center gap-1 rounded-[5px] border border-white/[0.08] px-2 py-1 font-mono text-[11px] ${audiencePillClass(item.value, values.map((value) => value.value))} hover:border-white/[0.2]`}>
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
