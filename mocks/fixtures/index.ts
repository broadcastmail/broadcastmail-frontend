import { faker } from "@faker-js/faker";

export type CampaignStatus =
  | "DRAFT"
  | "RESOLVING"
  | "SENDING"
  | "SENT"
  | "FAILED"
  | "PARTIALLY_FAILED";

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  recipientCount: number | null;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  sentAt: string | null;
  createdAt: string;
}

export interface DashboardData {
  audience: number;
  audienceSource: string;
  campaignsSentThisMonth: number;
  totalDeliveredThisMonth: number;
  deliveryRate: number;
  recipientsUsedThisPeriod: number;
  recipientsLimit: number;
  campaigns: Campaign[];
}

export const fakeCampaign = (overrides?: Partial<Campaign>): Campaign => {
  const status = faker.helpers.arrayElement<CampaignStatus>([
    "DRAFT",
    "RESOLVING",
    "SENDING",
    "SENT",
    "FAILED",
    "PARTIALLY_FAILED",
  ]);

  const hasRecipients = !["DRAFT", "RESOLVING"].includes(status);

  return {
    id: faker.string.uuid(),
    name: faker.lorem.words(3),
    status,
    recipientCount: hasRecipients
      ? faker.number.int({ min: 10, max: 500 })
      : null,
    sentCount: hasRecipients ? faker.number.int({ min: 0, max: 500 }) : 0,
    deliveredCount: hasRecipients ? faker.number.int({ min: 0, max: 450 }) : 0,
    failedCount: hasRecipients ? faker.number.int({ min: 0, max: 10 }) : 0,
    sentAt: hasRecipients
      ? faker.date.recent({ days: 30 }).toISOString()
      : null,
    createdAt: faker.date.recent({ days: 60 }).toISOString(),
    ...overrides,
  };
};

export const fakeCampaigns = (count = 8): Campaign[] =>
  Array.from({ length: count }, () => fakeCampaign());

export const fakeDashboard = (): DashboardData => {
  const campaigns = fakeCampaigns();
  const sent = campaigns.filter((c) => c.status === "SENT");

  return {
    audience: faker.number.int({ min: 100, max: 5000 }),
    audienceSource: "auth.users",
    campaignsSentThisMonth: sent.length,
    totalDeliveredThisMonth: sent.reduce((sum, c) => sum + c.deliveredCount, 0),
    deliveryRate: faker.number.float({ min: 95, max: 100, fractionDigits: 1 }),
    recipientsUsedThisPeriod: faker.number.int({ min: 0, max: 500 }),
    recipientsLimit: 500,
    campaigns,
  };
};
