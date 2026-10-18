import {DashboardHero} from "./dashboard-hero";
import {CampaignSection} from "./campaign-section";
import {NewCampaignButton} from "@/components/dashboard/new-campaign-button";
import {ConnectRequiredEmptyState} from "@/components/dashboard/connect-required-empty-state";
import {createServerApiClient} from "@/lib/api/client/server-client";
import type {SchemaIntrospectionResult} from "@/lib/types/onboarding";

export async function DashboardContent() {
    let schema: SchemaIntrospectionResult | null = null;
    try {
        const serverApiClient = await createServerApiClient();
        const res = await serverApiClient.get<SchemaIntrospectionResult>("/api/v1/connections/schema/reconnect");
        schema = res.data;
    } catch { /* ignore */ }

    const configured = schema?.status === "DETECTED";

    return (
        <div className="flex-1 overflow-y-auto px-8 py-9 flex flex-col gap-7">
            <header className="flex items-end justify-between gap-6">
                <div className="flex flex-col gap-[5px]">
                    <h1 className="text-[24px] font-semibold text-text-primary tracking-[-0.02em]">
                        Campaigns
                    </h1>
                    <p className="text-[13.5px] text-text-muted">
                        Send to segments of your Supabase users.
                    </p>
                </div>
                <NewCampaignButton configured={configured}/>
            </header>
            {configured ? (
                <>
                    <DashboardHero />
                    <CampaignSection />
                </>
            ) : (
                <ConnectRequiredEmptyState/>
            )}
        </div>
    );
}
