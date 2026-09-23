"use client";

import Link from "next/link";
import {
  useUnsavedChangesGuard,
  UNSAVED_CHANGES_MESSAGE,
} from "@/lib/navigation/unsaved-changes-guard";

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

export function NavItem({ href, label, icon, active }: NavItemProps) {
  const { hasUnsavedChanges } = useUnsavedChangesGuard();

  return (
    <Link
      href={href}
      onNavigate={(e) => {
        if (hasUnsavedChanges && !window.confirm(UNSAVED_CHANGES_MESSAGE)) {
          e.preventDefault();
        }
      }}
      className={`flex items-center gap-1.75 border-b-2 font-sans text-[13.5px] transition-colors ${
        active
          ? "border-orange text-orange"
          : "border-transparent text-text-muted hover:text-[#B9B9C2]"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
