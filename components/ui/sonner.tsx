"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";
function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "#111116",
          "--normal-border": "var(--color-border)",
          "--normal-text": "var(--color-text-primary)",
          "--success-bg": "#111116",
          "--success-border": "var(--color-border)",
          "--success-text": "var(--color-status-sent)",
          "--error-bg": "#111116",
          "--error-border": "rgba(229,114,106,0.32)",
          "--error-text": "var(--color-status-failed)",
          "--border-radius": "10px",
          "--font-family": "var(--font-sans)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "shadow-[0_24px_60px_rgba(0,0,0,0.6)] text-[13px]",
          description: "text-text-muted",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
