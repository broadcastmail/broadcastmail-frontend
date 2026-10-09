"use client";

import {AlignLeft, Heading2, ImageIcon, Link2, Minus, MousePointerClick, UserRound,} from "lucide-react";
import type {EditorSnippet, SnippetIcon} from "@/features/campaigns/new/compose/lib/snippets";

const ICONS: Record<SnippetIcon, typeof AlignLeft> = {
  paragraph: AlignLeft,
  heading: Heading2,
  link: Link2,
  button: MousePointerClick,
  image: ImageIcon,
  divider: Minus,
  merge: UserRound,
};

interface EditorToolbarProps {
  snippets: EditorSnippet[];
  onPick: (snippet: EditorSnippet) => void;
}

export function EditorToolbar({ snippets, onPick }: Readonly<EditorToolbarProps>) {
  return (
    <div className="flex items-center gap-[5px] flex-wrap px-[9px] py-2 border-b border-[#1E1E26]">
      {snippets.map((sn) => {
        const Icon = ICONS[sn.icon];
        return (
          <button
            key={sn.id}
            type="button"
            title={sn.hint}
            onClick={() => onPick(sn)}
            className="flex items-center gap-[6px] rounded-md px-[9px] py-[5px] text-[12px] text-[#8E8E9A] whitespace-nowrap cursor-pointer transition-colors hover:bg-white/[0.06] hover:text-[#ECECF1]"
          >
            <Icon size={13} className="shrink-0" strokeWidth={1.75} />
            {sn.label}
          </button>
        );
      })}
    </div>
  );
}
