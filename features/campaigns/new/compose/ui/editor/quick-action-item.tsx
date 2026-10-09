"use client";

import type {ComponentProps, ReactNode} from "react";
import {ContextMenuItem} from "@/components/ui/context-menu";
import {cn} from "@/lib/utils";

interface QuickActionItemProps extends ComponentProps<typeof ContextMenuItem> {
  icon: ReactNode;
  label: string;
}

// One icon-only button in the editor's horizontal right-click quick-actions
// strip. There's no room for a visible label next to the icon, so `label`
// carries the hover tooltip and the screen-reader name instead.
export function QuickActionItem({
  icon,
  label,
  className,
  ...props
}: Readonly<QuickActionItemProps>) {
  return (
    <ContextMenuItem
      title={label}
      aria-label={label}
      className={cn("justify-center gap-0 rounded-lg p-2.5", className)}
      {...props}
    >
      {icon}
    </ContextMenuItem>
  );
}
