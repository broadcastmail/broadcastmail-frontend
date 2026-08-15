"use client";

import { usePathname } from "next/navigation";
import { Mail, Settings, CreditCard, ChevronDown, LogOut } from "lucide-react";
import { NavItem } from "./nav-item";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Campaigns", icon: <Mail size={14} /> },
  { href: "/settings", label: "Settings", icon: <Settings size={14} /> },
  { href: "/billing", label: "Billing", icon: <CreditCard size={14} /> },
];

interface TopNavProps {
  email: string;
  connectionName: string | null;
}
export function TopNav({ email, connectionName }: TopNavProps) {
  const pathname = usePathname();

  return (
    <header className="flex-shrink-0 h-[52px] flex items-stretch gap-8 px-6 bg-surface border-b border-(--color-border)">
      <div
        className="flex items-center gap-2 flex-shrink-0"
        aria-label="BroadcastMail"
      >
        <div
          className="w-[18px] h-[18px] rounded-[5px] bg-orange flex items-center justify-center font-mono text-[11px] font-semibold text-[#120C06]"
          aria-hidden="true"
        >
          b
        </div>
        <span className="font-mono text-[12.5px] font-medium text-text-primary">
          broadcastmail
        </span>
      </div>

      <nav
        className="flex items-stretch gap-[26px]"
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={pathname === item.href}
          />
        ))}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-4 flex-shrink-0">
        <div
          className="flex items-center gap-[7px] text-[12.5px] text-text-muted"
          aria-label="Connected project"
        >
          <div
            className="w-[5px] h-[5px] rounded-full bg-status-sent flex-shrink-0"
            aria-hidden="true"
          />
          <span className="font-mono text-[12px]">
            {connectionName || "Unnamed Project"}
          </span>
        </div>
        <div className="w-px h-[18px] bg-white/[0.08]" role="separator" />
        <UserMenu email={email} />
      </div>
    </header>
  );
}

function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initial = email.charAt(0).toUpperCase();

  async function handleLogout() {
    await apiClient.post("/api/v1/auth/logout");
    // Already on "/" — refresh so the root Server Component re-checks auth
    // against the now-cleared cookie and swaps in the landing page.
    router.refresh();
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-[7px] cursor-pointer"
          aria-label="User menu"
        >
          <div className="w-[22px] h-[22px] rounded-full bg-white/[0.08] flex items-center justify-center text-[10.5px] font-semibold text-[#B9B9C2]">
            {initial}
          </div>
          <span className="text-[12.5px] text-[#B9B9C2]">{email}</span>
          <ChevronDown size={9} color="#7A7A85" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="!bg-surface !border-border rounded-[8px] p-1 min-w-0"
      >
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2 px-[9px] py-[7px] text-[13px] text-text-muted hover:text-text-primary rounded-[5px] cursor-pointer whitespace-nowrap"
        >
          <LogOut size={12} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
