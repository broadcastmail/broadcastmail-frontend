"use client";

import {ChevronDown} from "lucide-react";
import {Checkbox} from "@/components/ui/checkbox";
import {audiencePillClass} from "@/lib/utils";
import type {AudienceRecipient} from "@/features/campaigns/api/audience";

import type {FilterColumn} from "@/features/campaigns/new/audience/hooks/use-audience-filter-editor";

interface AudienceRecipientTableProps {
    recipients: AudienceRecipient[];
    loadedCount: number;
    total: number;
    loading: boolean;
    hasMore: boolean;
    allRecipientsSelected: boolean;
    noRecipientsSelected: boolean;
    limitExceeded: boolean;
    sort: { key: string; direction: "asc" | "desc" };
    filterColumns: FilterColumn[];
    isSelected: (id: string) => boolean;
    onToggle: (id: string, checked: boolean) => void;
    onToggleAll: (checked: boolean) => void;
    onSort: (key: string) => void;
    onLoadMore: () => void;
}

export function AudienceRecipientTable({
    recipients, loadedCount, total, loading, hasMore,
    allRecipientsSelected, noRecipientsSelected, limitExceeded,
    sort, filterColumns, isSelected, onToggle, onToggleAll, onSort, onLoadMore,
}: Readonly<AudienceRecipientTableProps>) {
    let headerChecked: boolean | "indeterminate" = "indeterminate";
    if (allRecipientsSelected) headerChecked = true;
    else if (noRecipientsSelected) headerChecked = false;

    return (
        <div className="border border-white/[0.09] rounded-xl overflow-hidden bg-[#101015] shrink-0">
            <div className="overflow-x-auto bm-scrollbar">
                <div className="flex min-w-max gap-3 px-4 py-2 border-b border-white/[0.07] text-[11px] font-medium uppercase tracking-[0.04em] text-[#7A7A85]">
                    <Checkbox
                        checked={headerChecked}
                        onCheckedChange={(checked) => onToggleAll(checked === true)}
                        aria-label={allRecipientsSelected ? "Deselect all recipients" : "Select all recipients"}
                        className="size-4 rounded-[4px] border border-[#3A3A46] text-[#120C06] data-[state=checked]:bg-orange data-[state=checked]:border-orange"
                    />
                    <SortHeader className="flex-1 min-w-[200px]" label="Email" active={sort.key === "email"} direction={sort.direction} onClick={() => onSort("email")} />
                    <SortHeader className="w-32 shrink-0" label="Created at" active={sort.key === "created_at"} direction={sort.direction} onClick={() => onSort("created_at")} />
                    {filterColumns.map((col) => (
                        <SortHeader className="w-28 shrink-0" key={col.key} label={col.name} active={sort.key === col.name} direction={sort.direction} onClick={() => onSort(col.name)} />
                    ))}
                </div>
                {recipients.map((recipient) => (
                    <div key={recipient.id} className="flex min-w-max gap-3 items-center px-4 py-2 border-b border-white/[0.045] hover:bg-white/[0.035]">
                        <Checkbox
                            checked={isSelected(recipient.id)}
                            disabled={limitExceeded && !isSelected(recipient.id)}
                            onCheckedChange={(checked) => onToggle(recipient.id, checked === true)}
                            aria-label={`Include ${recipient.email}`}
                            className="size-4 rounded-[4px] border border-[#3A3A46] text-[#120C06] data-[state=checked]:bg-orange data-[state=checked]:border-orange disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1 min-w-[200px] flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-orange/14 text-orange flex items-center justify-center text-[10px] font-semibold shrink-0">
                                {recipient.email[0].toUpperCase()}
                            </span>
                            <span className="font-mono text-[12.5px] text-[#CBCBD4] truncate">{recipient.email}</span>
                        </div>
                        <span className="w-32 shrink-0 font-mono text-[12px] text-[#7A7A85] truncate">
                            {formatAudienceDate(recipient.attributes.created_at)}
                        </span>
                        {filterColumns.map((col) => (
                            <div key={col.key} className="w-28 shrink-0 truncate font-mono text-[12px]">
                                {col.name === "plan" ? (
                                    <span className={`inline-flex max-w-full px-2 py-0.5 rounded ${audiencePillClass(
                                        String(recipient.attributes[col.name] ?? ""),
                                        recipients.map((r) => String(r.attributes[col.name] ?? "")),
                                    )}`}>
                                        {String(recipient.attributes[col.name] ?? "—")}
                                    </span>
                                ) : (
                                    <span className="text-[#7A7A85]">{String(recipient.attributes[col.name] ?? "—")}</span>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
                {!loading && recipients.length === 0 && (
                    <div className="py-9 text-center text-[13px] text-[#5C5C66]">No users match these filters.</div>
                )}
                {hasMore && (
                    <button
                        type="button"
                        onClick={onLoadMore}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-[12.5px] text-[#71717D] hover:bg-white/[0.03] hover:text-[#B9B9C2] disabled:opacity-50"
                    >
                        {loading ? "Loading..." : (
                            <>
                                <span className="font-mono">{Math.max(0, total - loadedCount).toLocaleString()} more</span>
                                <span className="text-[#5C5C66]">·</span>
                                <span>Show 50 more</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

function SortHeader({ label, active, direction, onClick, className }: Readonly<{
    label: string; active: boolean; direction: "asc" | "desc"; onClick: () => void; className?: string;
}>) {
    return (
        <button type="button" onClick={onClick} className={`flex items-center gap-1 text-left uppercase cursor-pointer ${className ?? ""} ${active ? "text-[#B9B9C2]" : ""}`}>
            {label}
            <ChevronDown size={10} strokeWidth={1.6} className={`transition-transform ${active && direction === "asc" ? "rotate-180" : ""}`} />
        </button>
    );
}

function formatAudienceDate(value: string | number | boolean | null | undefined): string {
    if (!value) return "—";
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}
