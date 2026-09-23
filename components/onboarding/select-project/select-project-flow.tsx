"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ConnectionProject } from "@/lib/types/connection";

interface SelectProjectFlowProps {
  partialToken: string;
  /** Fetched server-side by the rendering page — no client fetch on mount. */
  projects: ConnectionProject[];
  /** Overrides the default "follow the real redirect" navigation. */
  onSelected?: (projectRef: string) => void;
  /** Persists the pick. Defaults to the OAuth select-project POST; reconnect callers override it. */
  onContinue?: (projectRef: string) => Promise<void>;
  /** Hides the post-OAuth badge — irrelevant for reconnect, which has no OAuth hop. */
  showConnectedBadge?: boolean;
}

async function defaultContinue(
  partialToken: string,
  projectRef: string,
  onSelected: ((projectRef: string) => void) | undefined,
): Promise<void> {
  // fetch() follows the redirect; response.url is the real next step.
  const res = await fetch("/api/v1/oauth/supabase/select-project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectRef, partialSessionToken: partialToken }),
  });
  if (onSelected) {
    onSelected(projectRef);
  } else {
    window.location.href = new URL(res.url).pathname;
  }
}

export function SelectProjectFlow({
  partialToken,
  projects,
  onSelected,
  onContinue,
  showConnectedBadge = true,
}: SelectProjectFlowProps) {
  const [picked, setPicked] = useState(0);
  const [connecting, setConnecting] = useState(false);

  async function handleContinue() {
    if (!projects.length || connecting) return;
    const project = projects[picked];
    setConnecting(true);
    try {
      if (onContinue) await onContinue(project.ref);
      else await defaultContinue(partialToken, project.ref, onSelected);
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold text-[#ECECF1] tracking-[-0.02em]">
          Which project has your users?
        </h1>
        {showConnectedBadge && (
          <div className="flex items-center gap-2 bg-[#0F1A15] border border-[#1E3A2E] text-[#3ECF8E] text-[13px] font-medium rounded-lg px-3 py-[10px]">
            <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M8 1 2.5 8.2h4L5.6 13 11.5 5.8h-4L8 1z" fill="#3ECF8E" />
            </svg>
            Connected to Supabase
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {projects.length === 0 && (
          <p className="text-[13.5px] text-[#8E8E9A]">
            No projects found on that Supabase account.
          </p>
        )}
        {projects.map((project, i) => {
          const active = i === picked;
          return (
            <button
              key={project.ref}
              type="button"
              onClick={() => setPicked(i)}
              className={cn(
                "flex items-center gap-3 box-border border rounded-lg p-3 cursor-pointer text-left transition-colors",
                active
                  ? "bg-[#18130E] border-[#F0973F]"
                  : "bg-[#101015] border-[#26262F]",
              )}
            >
              <span
                className={cn(
                  "w-[14px] h-[14px] rounded-full box-border border-[1.5px] flex items-center justify-center shrink-0",
                  active ? "border-[#F0973F]" : "border-[#3A3A46]",
                )}
              >
                <span
                  className={cn(
                    "w-[6px] h-[6px] rounded-full",
                    active ? "bg-[#F0973F]" : "bg-transparent",
                  )}
                />
              </span>
              <span
                className={cn(
                  "flex-1 font-mono text-[13px]",
                  active ? "text-[#ECECF1]" : "text-[#8E8E9A]",
                )}
              >
                {project.name}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!projects.length || connecting}
        className="flex items-center justify-center bg-orange hover:bg-orange-hover text-[#120C06] text-[14px] font-semibold rounded-lg py-3 cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {connecting ? "Connecting…" : "Continue"}
      </button>
    </div>
  );
}
