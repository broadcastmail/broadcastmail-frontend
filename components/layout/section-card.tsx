import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, children, className }: SectionCardProps) {
  return (
    <div
      className={cn(
        "box-border bg-white/[0.035] backdrop-blur-sm border border-(--color-border) rounded-xl p-5.5 flex flex-col gap-4",
        className,
      )}
    >
      <div className="text-[11.5px] font-medium tracking-[0.04em] uppercase text-text-muted">
        {title}
      </div>
      <div className="h-px bg-white/6" />
      {children}
    </div>
  );
}
