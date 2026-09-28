import { format } from "date-fns";
import type { Campaign } from "@/mocks/fixtures";
import { cn } from "@/lib/utils";

interface StatCardsProps {
  campaign: Campaign;
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="w-[76%] h-6.5 rounded-md bg-linear-to-r from-white/4 via-white/8.5 to-white/4 bg-size[220px_100%] animate-bmshimmer" />
      <div className="w-[42%] h-2.75 rounded-sm bg-linear-to-r from-white/3 via-white/[0.07] to-white/3 bg-size[220px_100%] animate-bmshimmer" />
    </div>
  );
}

export function StatCards({ campaign }: StatCardsProps) {
  const { status } = campaign;
  const resolving = status === "RESOLVING";
  const sending = status === "SENDING";
  const inProgress = resolving || sending;

  const total = campaign.recipientCount ?? 0;
  const pct = (n: number) =>
    total ? `${((n / total) * 100).toFixed(1)}%` : "—";

  const hotFailed =
    !inProgress &&
    status === "PARTIALLY_FAILED" &&
    total > 0 &&
    campaign.failedCount / total > 0.01;

  const stats = [
    {
      label: "Delivered",
      value: campaign.deliveredCount.toLocaleString(),
      sub: pct(campaign.deliveredCount),
      skeleton: resolving,
      hot: false,
    },
    {
      label: "Opens",
      value: campaign.openedCount.toLocaleString(),
      sub: pct(campaign.openedCount),
      skeleton: inProgress,
      hot: false,
    },
    {
      label: "Failed",
      value: campaign.failedCount.toLocaleString(),
      sub: pct(campaign.failedCount),
      skeleton: resolving,
      hot: hotFailed,
    },
    {
      label: "Sent",
      value: campaign.sentAt ? format(new Date(campaign.sentAt), "MMM d") : "—",
      sub: campaign.sentAt ? format(new Date(campaign.sentAt), "HH:mm") : "",
      skeleton: inProgress,
      hot: false,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            "box-border bg-white/[0.035] backdrop-blur-sm border rounded-xl p-4.5 flex flex-col gap-2.5",
            s.hot
              ? "border-[rgba(229,114,106,0.32)]"
              : "border-(--color-border)",
          )}
        >
          <div className="text-[11.5px] font-medium tracking-[0.04em] uppercase text-text-muted">
            {s.label}
          </div>
          {s.skeleton ? (
            <Skeleton />
          ) : (
            <div className="flex flex-col gap-2">
              <div
                className={cn(
                  "font-mono text-[28px] font-medium tabular-nums tracking-[-0.02em]",
                  s.hot ? "text-status-failed" : "text-text-primary",
                )}
              >
                {s.value}
              </div>
              <div className="text-[12px] text-text-dim">{s.sub}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
