import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: number;
  className?: string;
}

// Small spinning ring used across every async onboarding action (connecting,
// running setup, testing a key, retesting a connection). `className` sets
// the two border colors — see call sites for the two palettes used in the
// design mock (on-orange vs. on-dark).
export function Spinner({ size = 13, className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-full animate-bmspin border-2",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
