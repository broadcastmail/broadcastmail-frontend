import type { CampaignStatus } from "@/mocks/fixtures";


export interface CampaignStatusEvent {
  id: string;
  status: CampaignStatus;
  recipientsCount: number | null;
  sentCount: number;
  openedCount: number;
  deliveredCount: number;
  bouncedCount: number;
  failedCount: number;
}

export const TERMINAL_CAMPAIGN_STATUSES = new Set<CampaignStatus>([
  "SENT",
  "FAILED",
  "PARTIALLY_FAILED",
]);
