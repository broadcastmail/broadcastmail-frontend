import type { ReactNode } from "react";

interface FieldRowProps {
  label: string;
  children: ReactNode;
}

export function FieldRow({ label, children }: FieldRowProps) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-4 items-baseline">
      <div className="font-mono text-[11px] tracking-[0.04em] uppercase text-text-dim">
        {label}
      </div>
      {children}
    </div>
  );
}
