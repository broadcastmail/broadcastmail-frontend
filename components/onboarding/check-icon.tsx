interface CheckIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

// The small checkmark glyph used throughout the onboarding flow's bullet
// lists (permissions, recap, completion).
export function CheckIcon({
  size = 10,
  color = "#4ADE80",
  strokeWidth = 2.5,
  className,
}: CheckIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className ?? "shrink-0"}
      aria-hidden="true"
    >
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
