import type {ReactNode} from "react";

export function NativeSelect({
  value,
  onChange,
  label,
  children,
}: Readonly<{
    value: string;
    onChange: (v: string) => void;
    label: string;
    children: ReactNode;
}>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-[#8E8E9A]">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full h-[38px] box-border px-3 pr-[26px] bg-[#101015] border border-[#26262F] rounded-lg font-mono text-[13px] text-[#ECECF1] cursor-pointer focus:outline-none focus:border-orange/60 transition-colors"
        >
          {children}
        </select>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className="absolute right-2.5 top-[14px] pointer-events-none"
        >
          <path d="M2 3.5 5 6.5 8 3.5" stroke="#8E8E9A" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </label>
  );
}
