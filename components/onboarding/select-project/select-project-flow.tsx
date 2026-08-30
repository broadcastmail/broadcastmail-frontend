"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/onboarding/spinner";

interface Project {
  ref: string;
  name: string;
}

export function SelectProjectFlow({ partialToken }: { partialToken: string }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [picked, setPicked] = useState(0);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetch("/api/v1/oauth/supabase/mock-projects")
      .then((res) => res.json())
      .then(setProjects);
  }, []);

  async function handleContinue() {
    if (!projects || connecting) return;
    const project = projects[picked];
    setConnecting(true);
    // The real endpoint 302s to the next onboarding step. fetch() follows
    // same-origin redirects by default, so response.url ends up as the
    // final destination — we just navigate there ourselves.
    const res = await fetch("/api/v1/oauth/supabase/select-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectRef: project.ref,
        partialSessionToken: partialToken,
      }),
    });
    window.location.href = new URL(res.url).pathname;
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-semibold text-[#ECECF1] tracking-[-0.02em]">
          Which project has your users?
        </h1>
        <div className="flex items-center gap-2 bg-[#0F1A15] border border-[#1E3A2E] text-[#3ECF8E] text-[13px] font-medium rounded-lg px-3 py-[10px]">
          <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M8 1 2.5 8.2h4L5.6 13 11.5 5.8h-4L8 1z" fill="#3ECF8E" />
          </svg>
          Connected to Supabase
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {!projects && (
          <div className="flex items-center gap-2 py-1">
            <Spinner size={13} className="border-[#26262F] border-t-orange" />
            <p className="text-[13.5px] text-[#8E8E9A]">Loading projects…</p>
          </div>
        )}
        {projects?.map((project, i) => {
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
        disabled={!projects || connecting}
        className="flex items-center justify-center bg-orange hover:bg-orange-hover text-[#120C06] text-[14px] font-semibold rounded-lg py-3 cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {connecting ? "Connecting…" : "Continue"}
      </button>
    </div>
  );
}
