import type {JSONContent} from "@tiptap/core";
import type {CampaignFilterResponse} from "@/features/campaigns/new/audience/audience";

export type AudienceMode = "manual" | "filter" | "all";

export type CampaignStatus =
  | "DRAFT"
  | "RESOLVING"
  | "SENDING"
  | "SENT"
  | "FAILED"
  | "PARTIALLY_FAILED";

export const CAMPAIGN_STATUSES = [
  "DRAFT",
  "RESOLVING",
  "SENDING",
  "SENT",
  "FAILED",
  "PARTIALLY_FAILED",
] as const satisfies readonly CampaignStatus[];

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: CampaignStatus;
  source: "visual" | "import";
  bodyJson: JSONContent | null;
  bodyHtmlImported: string | null;
  recipientCount: number | null;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  bouncedCount: number;
  failedCount: number;
  sentAt: string | null;
  createdAt: string;
  filters: CampaignFilterResponse[];
  audienceMode: AudienceMode | null;
  includedIds: string[] | null;
  excludedIds: string[] | null;
}

export type RecipientStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "OPENED"
  | "BOUNCED"
  | "FAILED"
  | "UNSUBSCRIBED";

export interface CampaignRecipient {
  id: string;
  email: string;
  status: RecipientStatus;
  deliveredAt: string | null;
  openedAt: string | null;
  bouncedAt: string | null;
  failedReason: string | null;
}

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
