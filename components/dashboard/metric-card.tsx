import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  limit?: number;
  supporting?: string;
  progress?: number;
  progressColor?: "orange" | "danger";
}

export function MetricCard({
  label,
  value,
  limit,
  supporting,
  progress,
  progressColor = "orange",
}: MetricCardProps) {
  return (
    <div
      style={{ background: "rgba(255,255,255,0.035)" }}
      className="backdrop-blur-sm border border-(--color-border) rounded-xl p-4.5 flex flex-col gap-2.5"
    >
      <div className="text-[11.5px] font-medium tracking-[0.04em] uppercase text-text-muted">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <div className="font-mono text-[28px] font-medium text-text-primary tabular-nums tracking-[-0.02em]">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {limit !== undefined && (
          <div className="font-mono text-[13px] text-text-dim tabular-nums">
            / {limit.toLocaleString()}
          </div>
        )}
      </div>
      {supporting && (
        <div className="text-[12px] text-text-dim">{supporting}</div>
      )}
      {progress !== undefined && (
        <div className="h-1 rounded-xs bg-white/8 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-xs transition-all duration-700 ease-out",
              progressColor === "danger" ? "bg-status-failed" : "bg-orange",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
