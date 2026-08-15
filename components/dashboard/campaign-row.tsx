"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Campaign } from "@/mocks/fixtures";
import { TableRow, TableCell } from "@/components/ui/table";
import { format, isToday, isYesterday } from "date-fns";
import { Trash2 } from "lucide-react";
import { DeleteCampaignDialog } from "./delete-campaign-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CampaignRowProps {
  campaign: Campaign;
}

function formatSentDate(sentAt: string): string {
  const date = new Date(sentAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = diffMs / 1000 / 60;
  const diffHours = diffMins / 60;

  if (diffMins < 1) return "now";
  if (diffHours < 1) return `${Math.floor(diffMins)}m ago`;
  if (diffHours < 12) return `${Math.floor(diffHours)}h ago`;
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "yst";
  return format(date, "MMM d");
}

export function CampaignRow({ campaign }: CampaignRowProps) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [fading, setFading] = useState(false);

  if (deleted) return null;

  return (
    <>
      <TableRow
        className={`border-b border-white/[0.045] hover:bg-white/[0.035] cursor-pointer transition-all duration-[240ms] relative group ${fading ? "opacity-0" : "opacity-100"}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <TableCell className="py-[11px] px-[18px] text-[14px] text-text-primary w-full min-w-[140px]">
          {campaign.name}
        </TableCell>
        <TableCell className="py-3 px-4.5 w-24">
          <StatusBadge status={campaign.status} />
        </TableCell>
        <TableCell className="py-3 px-4.5 font-mono text-[13px] text-text-muted tabular-nums text-right w-[76px]">
          {campaign.recipientCount?.toLocaleString() ?? "—"}
        </TableCell>
        <TableCell className="py-3 px-4.5 font-mono text-[13px] text-text-muted tabular-nums text-right w-[60px]">
          {campaign.deliveredCount && campaign.recipientCount
            ? `${((campaign.deliveredCount / campaign.recipientCount) * 100).toFixed(1)}%`
            : "—"}
        </TableCell>
        <TableCell className="py-3 px-4.5 font-mono text-[12.5px] text-text-dim tabular-nums text-right w-[76px]">
          {campaign.sentAt ? formatSentDate(campaign.sentAt) : "—"}
        </TableCell>
        <TableCell className="w-8 px-2">
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className={`p-1.5 rounded-md transition-all text-text-muted hover:text-text-primary hover:bg-white/[0.06] ${hovered || menuOpen ? "opacity-100" : "opacity-0"}`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="currentColor"
                >
                  <circle cx="7" cy="3" r="1.2" />
                  <circle cx="7" cy="7" r="1.2" />
                  <circle cx="7" cy="11" r="1.2" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={4}
              className="bg-surface border border-(--color-border) rounded-[8px] p-1 shadow-lg min-w-0 w-auto"
            >
              {campaign.status === "DRAFT" && (
                <DropdownMenuItem
                  onClick={() => setDialogOpen(true)}
                  className="flex items-center gap-2 px-2.25 py-1.75 text-[13px] text-status-failed hover:bg-status-failed-bg rounded-[5px] cursor-pointer whitespace-nowrap"
                >
                  <Trash2 size={12} />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      <DeleteCampaignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        campaign={campaign}
        onDeleted={() => {
          setFading(true);
          setTimeout(() => setDeleted(true), 240);
        }}
      />
    </>
  );
}
