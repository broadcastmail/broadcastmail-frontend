"use client";

import type {CampaignData} from "@/features/campaigns/new/new-campaign-form";
import {useAudienceStepMediator} from "@/features/campaigns/new/audience/hooks/use-audience-step-mediator";
import {AudienceFilters} from "./audience-filters";
import {AudienceRecipientTable} from "./audience-recipient-table";
import {AudienceStepFooter} from "./audience-step-footer";

interface AudienceStepProps {
  data: CampaignData;
  onWriteFirst: () => void;
  onConfirm: (count: number) => void;
}

export function AudienceStep({ data, onWriteFirst, onConfirm }: Readonly<AudienceStepProps>) {
  const {
    columns, filterEditor, list, selection,
    isSaving, saveError, lastConfirmedMode,
    totalRecipients, canSave,
    handleSave, handleRecipientCountUpdate,
  } = useAudienceStepMediator(data, onConfirm);

  return (
    <div className="relative h-[calc(100vh-98px)] min-h-0 flex overflow-hidden">
      <div className="flex-1 min-w-0 h-full overflow-y-auto bm-scrollbar px-7 pt-7 pb-32 flex flex-col gap-[22px]">
        <div className="flex items-center gap-2 text-[13px] text-orange bg-orange/8 border border-orange/20 rounded-lg px-3 py-2.5">
          <span className="w-[5px] h-[5px] rounded-full bg-orange" />
          <span>Set your audience before sending</span>
        </div>
        {selection.limitExceeded && (
          <div className="flex items-center gap-2 text-[13px] text-[#E5726A] bg-[#E5726A]/8 border border-[#E5726A]/20 rounded-lg px-3 py-2.5">
            <span className="w-[5px] h-[5px] rounded-full bg-[#E5726A] shrink-0" />
            <span>5,000 recipient limit reached. Deselect recipients to add others.</span>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2.5">
            <span className="font-mono text-[36px] leading-tight font-medium tracking-[-0.03em]">
              {selection.selectedCount.toLocaleString()}
            </span>
            <span className="text-[15px] text-[#B9B9C2]">recipients</span>
            {filterEditor.counting && (
              <span className="w-3 h-3 rounded-full border-2 border-[#26262F] border-t-orange animate-bmspin" />
            )}
          </div>
          <div className="text-[13px] text-[#71717D]">
            out of <span className="font-mono text-[#8E8E9A]">{totalRecipients.toLocaleString()}</span> total users
          </div>
        </div>
        <AudienceRecipientTable
          recipients={list.recipients}
          loadedCount={list.loadedCount}
          total={list.total}
          loading={list.loading}
          hasMore={list.hasMore}
          allRecipientsSelected={selection.allRecipientsSelected}
          noRecipientsSelected={selection.noRecipientsSelected}
          limitExceeded={selection.limitExceeded}
          sort={list.sort}
          filterColumns={filterEditor.activeFilterColumns}
          isSelected={selection.isSelected}
          onToggle={selection.toggleRecipient}
          onToggleAll={selection.toggleAll}
          onSort={list.toggleSort}
          onLoadMore={() => list.loadMore()}
        />
      </div>
      <AudienceFilters
        columns={columns}
        filters={filterEditor.filters}
        filterError={filterEditor.filterError}
        onAdd={filterEditor.addFilter}
        onPatch={filterEditor.patchFilter}
        onRemove={filterEditor.removeFilter}
      />
      <AudienceStepFooter
        initialAudienceMode={lastConfirmedMode}
        selectedCount={selection.selectedCount}
        isSaving={isSaving}
        saveError={saveError}
        hasPendingFilterChange={selection.hasPendingFilterChange}
        canSave={canSave}
        onWriteFirst={onWriteFirst}
        onSave={handleSave}
        onKeepSelection={() => void handleRecipientCountUpdate("reapply")}
        onClearSelection={() => void handleRecipientCountUpdate("clear")}
      />
    </div>
  );
}
