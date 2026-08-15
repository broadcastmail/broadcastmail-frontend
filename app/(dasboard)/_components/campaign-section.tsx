import { Campaign } from "@/mocks/fixtures";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CampaignTable } from "@/components/dashboard/campaign-table";

interface CampaignSectionProps {
  campaigns: Campaign[];
}

export function CampaignSection({ campaigns }: CampaignSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-semibold text-text-primary">
          Recent
        </div>
        <div className="font-mono text-[11.5px] text-text-dim">
          {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
        </div>
      </div>
      <div className="bg-[rgba(255,255,255,0.025)] border border-(--color-border) rounded-xl overflow-hidden">
        {campaigns.length === 0 ? (
          <EmptyState />
        ) : (
          <CampaignTable campaigns={campaigns} />
        )}
      </div>
    </div>
  );
}
