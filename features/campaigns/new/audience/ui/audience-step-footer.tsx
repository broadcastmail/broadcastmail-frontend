"use client";

import type {ReactNode} from "react";
import type {AudienceMode} from "@/lib/types/campaigns";

interface AudienceStepFooterProps {
    initialAudienceMode: AudienceMode | null;
    selectedCount: number;
    isSaving: boolean;
    saveError: Error | null;
    hasPendingFilterChange: boolean;
    canSave: boolean;
    onWriteFirst: () => void;
    onSave: () => void;
    onKeepSelection: () => void;
    onClearSelection: () => void;
}

export function AudienceStepFooter({
    initialAudienceMode, selectedCount, isSaving, saveError,
    hasPendingFilterChange, canSave,
    onWriteFirst, onSave, onKeepSelection, onClearSelection,
}: Readonly<AudienceStepFooterProps>) {
    let saveLabel: ReactNode = "Save audience";
    if (isSaving) saveLabel = "Saving…";
    else if (initialAudienceMode === null) saveLabel = <>Continue to compose <span>→</span></>;

    return (
        <div className="absolute z-10 bottom-0 left-0 right-0 flex flex-col bg-surface border-t border-white/[0.07]">
            {hasPendingFilterChange && (
                <div className="px-6 py-3 border-b border-white/[0.07] bg-[#0D0D11]">
                    <p className="text-[12.5px] text-[#B9B9C2] mb-2.5">
                        Filters changed while you have recipients selected. Keep your current selection or clear it?
                    </p>
                    <div className="flex gap-2">
                        <button type="button" onClick={onKeepSelection} disabled={isSaving}
                            className="text-[12.5px] font-medium px-3 py-1.5 bg-orange hover:bg-orange-hover text-[#120C06] rounded-lg disabled:opacity-50">
                            Keep selection
                        </button>
                        <button type="button" onClick={onClearSelection} disabled={isSaving}
                            className="text-[12.5px] px-3 py-1.5 bg-[#17171D] text-[#B9B9C2] border border-[#26262F] rounded-lg hover:bg-white/[0.06] disabled:opacity-50">
                            Clear selection
                        </button>
                    </div>
                </div>
            )}
            {saveError && (
                <div className="px-6 py-2 text-[12.5px] text-[#E5726A] border-b border-white/[0.07]">
                    Failed to save audience: {saveError.message}. Try again.
                </div>
            )}
            <div className="h-[60px] flex items-center px-6">
                <div className="flex items-center gap-4 ml-auto">
                    {initialAudienceMode === null && (
                        <>
                            <button type="button" onClick={onWriteFirst} className="text-[13px] text-[#71717D] hover:text-[#B9B9C2]">
                                Write the email first →
                            </button>
                            <span className="w-px h-4 bg-white/[0.08]" />
                        </>
                    )}
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={!canSave}
                        className={`flex items-center gap-2 text-[13.5px] font-semibold rounded-lg px-4 py-2.5 transition-colors ${
                            canSave
                                ? "bg-orange hover:bg-orange-hover text-[#120C06] cursor-pointer"
                                : "bg-[#17171D] text-[#4C4C58] cursor-not-allowed"
                        }`}
                    >
                        {saveLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
