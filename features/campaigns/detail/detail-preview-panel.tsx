"use client";

import {useState} from "react";
import {Monitor, Smartphone} from "lucide-react";
import {cn} from "@/lib/utils";

interface DetailPreviewPanelProps {
  previewDoc: string;
  subject: string;
}

export function DetailPreviewPanel({
  previewDoc,
  subject,
}: Readonly<DetailPreviewPanelProps>) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const mobile = device === "mobile";

  return (
    <div className="box-border bg-white/2 border border-(--color-border) rounded-xl overflow-hidden flex flex-col">
      <div className="shrink-0 flex items-center justify-between gap-4 px-4 py-2.5 border-b border-white/6">
        <div className="flex items-center gap-0.5 bg-[#101015] border border-[#1E1E26] rounded-[7px] p-0.5">
          <button
            type="button"
            aria-label="Desktop preview"
            onClick={() => setDevice("desktop")}
            className={cn(
              "w-7 h-6 rounded-[5px] flex items-center justify-center cursor-pointer transition-colors",
              !mobile && "bg-[#232329]",
            )}
          >
            <Monitor
              size={14}
              className={!mobile ? "text-[#ECECF1]" : "text-[#5C5C66]"}
              strokeWidth={1.5}
            />
          </button>
          <button
            type="button"
            aria-label="Mobile preview"
            onClick={() => setDevice("mobile")}
            className={cn(
              "w-7 h-6 rounded-[5px] flex items-center justify-center cursor-pointer transition-colors",
              mobile && "bg-[#232329]",
            )}
          >
            <Smartphone
              size={14}
              className={mobile ? "text-[#ECECF1]" : "text-[#5C5C66]"}
              strokeWidth={1.5}
            />
          </button>
        </div>
        <div className="font-mono text-[11.5px] text-text-dim whitespace-nowrap overflow-hidden text-ellipsis">
          Subject: <span className="text-[#B9B9C2]">{subject}</span>
        </div>
      </div>
      <div
        className="flex-1 min-h-0 max-h-115 overflow-y-auto bm-scrollbar p-5 flex justify-center bg-[radial-gradient(circle,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:20px_20px]"
      >
        <div
          className={cn(
            "max-w-full shrink-0 bg-white rounded-[10px] overflow-hidden shadow-[0_18px_44px_rgba(0,0,0,0.5)]",
            mobile ? "w-[375px]" : "w-[600px]",
          )}
        >
          <iframe
            srcDoc={previewDoc}
            sandbox=""
            title="Email preview"
            className={cn("block w-full border-0 bg-white", mobile ? "h-[520px]" : "h-[420px]")}
          />
        </div>
      </div>
    </div>
  );
}
