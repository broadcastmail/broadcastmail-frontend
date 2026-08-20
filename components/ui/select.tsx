"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

// Structural only, same spirit as ./checkbox.tsx — callers style the
// trigger/content/item to match their own design rather than shadcn's
// default look.
function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  children,
  showIcon = true,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  showIcon?: boolean;
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex items-center justify-between outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      {showIcon && (
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-[10px] shrink-0 opacity-60" />
        </SelectPrimitive.Icon>
      )}
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        className={cn(
          "z-50 max-h-(--radix-select-content-available-height) origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto",
          position === "popper" &&
            "w-full min-w-(--radix-select-trigger-width)",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn(
            position === "popper" && "w-full",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center justify-center">
        <Check className="size-3" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };
