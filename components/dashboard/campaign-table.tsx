import { Campaign } from "@/mocks/fixtures";
import { CampaignRow } from "./campaign-row";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CampaignTableProps {
  campaigns: Campaign[];
}

export function CampaignTable({ campaigns }: CampaignTableProps) {
  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="border-b border-white/[0.07] hover:bg-transparent">
          <TableHead className="py-2.25 px-4.5 text-[11px] font-medium tracking-[0.04em] uppercase text-text-dim">
            Campaign
          </TableHead>
          <TableHead className="py-2.25 px-4.5 text-[11px] font-medium tracking-[0.04em] uppercase text-text-dim w-24">
            Status
          </TableHead>
          <TableHead className="py-2.25 px-4.5 text-[11px] font-medium tracking-[0.04em] uppercase text-text-dim w-[76px] text-right">
            Recipients
          </TableHead>
          <TableHead className="py-2.25 px-4.5 text-[11px] font-medium tracking-[0.04em] uppercase text-text-dim w-[60px] text-right">
            Opens
          </TableHead>
          <TableHead className="py-2.25 px-4.5 text-[11px] font-medium tracking-[0.04em] uppercase text-text-dim w-[76px] text-right">
            Sent
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((campaign) => (
          <CampaignRow key={campaign.id} campaign={campaign} />
        ))}
      </TableBody>
    </Table>
  );
}
