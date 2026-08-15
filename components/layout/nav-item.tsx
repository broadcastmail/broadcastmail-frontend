import Link from "next/link";

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

export function NavItem({ href, label, icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-[7px] border-b-2 font-sans text-[13.5px] transition-colors ${
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
