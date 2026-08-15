import { http, HttpResponse } from "msw";
import { fakeCampaign, fakeCampaigns } from "../fixtures";

export const campaignHandlers = [
  http.get("*/api/v1/campaigns", () => {
    return HttpResponse.json({
      content: fakeCampaigns(),
      totalElements: 8,
      totalPages: 1,
      number: 0,
      size: 20,
    });
  }),

  http.get("*/api/v1/campaigns/:id", ({ params }) => {
    return HttpResponse.json(fakeCampaign({ id: params.id as string }));
  }),

  http.post("*/api/v1/campaigns", () => {
    return HttpResponse.json(fakeCampaign({ status: "DRAFT" }), {
      status: 201,
    });
  }),

  http.patch("*/api/v1/campaigns/:id", ({ params }) => {
    return HttpResponse.json(
      fakeCampaign({ id: params.id as string, status: "DRAFT" }),
    );
  }),

  http.delete("*/api/v1/campaigns/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("*/api/v1/campaigns/:id/confirm", () => {
    return new HttpResponse(null, { status: 202 });
  }),

  http.get("*/api/v1/campaigns/:id/preview", () => {
    return HttpResponse.json({ recipientCount: 42 });
  }),
];
