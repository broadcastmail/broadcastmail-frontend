import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
}

const AUDIENCE_PILL_PALETTE = [
  "bg-orange/13 text-orange",
  "bg-[#7AA2FF]/13 text-[#7AA2FF]",
  "bg-[#B78CFF]/14 text-[#C9ACFF]",
  "bg-[#55B8A8]/14 text-[#7DD8C9]",
  "bg-[#D477A8]/14 text-[#E6A2C5]",
  "bg-[#6D9FE8]/14 text-[#9BC0F4]",
  "bg-[#C49A5A]/14 text-[#E0BC7E]",
  "bg-[#D96F62]/14 text-[#EB9B91]",
] as const;

export function audiencePillClass(value: string, paletteValues?: string[]): string {
  if (paletteValues?.length) {
    const values = [...new Set(paletteValues.map((item) => item.trim().toLowerCase()))].sort((a, b) => a.localeCompare(b));
    const index = values.indexOf(value.trim().toLowerCase());
    if (index >= 0) return AUDIENCE_PILL_PALETTE[index % AUDIENCE_PILL_PALETTE.length];
  }

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.trunc(hash * 31 + (value.codePointAt(index) ?? 0));
  }
  return AUDIENCE_PILL_PALETTE[Math.abs(hash) % AUDIENCE_PILL_PALETTE.length];
}
