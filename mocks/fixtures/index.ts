import {faker} from "@faker-js/faker";
import {type Campaign, CAMPAIGN_STATUSES,} from "@/lib/types/campaigns";

export const fakeCampaign = (overrides?: Partial<Campaign>): Campaign => {
  const status = faker.helpers.arrayElement(CAMPAIGN_STATUSES);

  const hasRecipients = !["DRAFT", "RESOLVING"].includes(status);

  return {
    id: faker.string.uuid(),
    name: faker.lorem.words(3),
    subject: faker.lorem.sentence(),
    status,
    source: "visual",
    bodyJson: null,
    bodyHtmlImported: null,
    recipientCount: hasRecipients
      ? faker.number.int({ min: 10, max: 500 })
      : null,
    sentCount: hasRecipients ? faker.number.int({ min: 0, max: 500 }) : 0,
    deliveredCount: hasRecipients ? faker.number.int({ min: 0, max: 450 }) : 0,
    openedCount: hasRecipients ? faker.number.int({ min: 0, max: 200 }) : 0,
    bouncedCount: hasRecipients ? faker.number.int({ min: 0, max: 8 }) : 0,
    failedCount: hasRecipients ? faker.number.int({ min: 0, max: 10 }) : 0,
    sentAt: hasRecipients
      ? faker.date.recent({ days: 30 }).toISOString()
      : null,
    createdAt: faker.date.recent({ days: 60 }).toISOString(),
    filters: [],
    audienceMode: null,
    includedIds: null,
    excludedIds: null,
    ...overrides,
  };
};

export const fakeCampaigns = (count = 8): Campaign[] =>
  Array.from({ length: count }, () => fakeCampaign());

export interface AccountEmailProviderInfo {
  // Null for an account that never connected Resend — no demo-data
  // fallback here (see mocks/handlers/dashboard.ts), so Settings can show
  // "Not configured" honestly instead of a fake address.
  fromAddress: string | null;
}

export const fakeDashboard = () => {
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
