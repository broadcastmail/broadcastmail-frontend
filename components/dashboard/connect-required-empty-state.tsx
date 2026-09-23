import Link from "next/link";
import { Database } from "lucide-react";

export function ConnectRequiredEmptyState() {
  return (
    <div className="flex-1 min-h-90 flex flex-col items-center justify-center gap-3 text-center">
      <div className="w-9 h-9 rounded-full bg-white/5 border border-(--color-border) flex items-center justify-center">
        <Database size={16} className="text-text-muted" />
      </div>
      <div className="text-[15px] font-medium text-text-primary">
        Connect Supabase to get started
      </div>
      <p className="text-[13px] leading-[1.55] text-text-muted max-w-90 text-pretty">
        A project, user table and email column all need to be configured before
        there&apos;s a real audience to send campaigns to.
      </p>
      <Link
        href="/settings"
        className="mt-1 text-[12.5px] font-medium text-orange hover:text-orange-hover"
      >
        Go to Settings →
      </Link>
    </div>
  );
}
