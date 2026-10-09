"use client";

import {useState} from "react";
import {Pencil, RefreshCw} from "lucide-react";
import {toast} from "sonner";
import {SectionCard} from "@/components/layout/section-card";
import {FieldRow} from "@/components/layout/field-row";
import {Spinner} from "@/components/onboarding/spinner";
import {AlertDialog, AlertDialogContent, AlertDialogFooter,} from "@/components/ui/alert-dialog";
import {ChangeProjectDialog} from "./change-project-dialog";
import {EditTableAccessDialog} from "./edit-table-access-dialog";
import {EditColumnsDialog} from "./edit-columns-dialog";
import {navigateToBackendRedirect} from "@/lib/api/oauth-redirect";
import {getReconnectSchema, listReconnectProjects} from "@/lib/api/schema";
import type {ConnectionProject} from "@/lib/types/connection";
import type {SchemaIntrospectionResult} from "@/lib/types/onboarding";

interface SupabaseSectionProps {
  connectionName: string | null;
  schema: SchemaIntrospectionResult | null;
}

// "Change project" is a no-OAuth PATCH; "Reconfigure connection" is a real
// OAuth navigation via app/settings/reconfigure/*.
export function SupabaseSection({
  connectionName,
  schema,
}: Readonly<SupabaseSectionProps>) {
  const [confirmReconfigureOpen, setConfirmReconfigureOpen] = useState(false);
  const [reconfiguring, setReconfiguring] = useState(false);

  const [changeProjectOpen, setChangeProjectOpen] = useState(false);
  const [changeProjectLoading, setChangeProjectLoading] = useState(false);
  const [changeProjectList, setChangeProjectList] = useState<ConnectionProject[]>([]);

  const [tableAccessOpen, setTableAccessOpen] = useState(false);
  const [tableAccessLoading, setTableAccessLoading] = useState(false);
  const [tableAccessSchema, setTableAccessSchema] =
    useState<SchemaIntrospectionResult | null>(null);

  const [columnsOpen, setColumnsOpen] = useState(false);

  async function handleReconfigureConfirmed() {
    setReconfiguring(true);
    try {
      // Lands on app/settings/reconfigure/* once the OAuth round trip completes.
      await navigateToBackendRedirect(
        "/api/v1/oauth/supabase/authorize",
        "?intent=reconfigure",
      );
    } catch {
      setReconfiguring(false);
      toast.error("Couldn't reach Supabase — try again in a moment.");
    }
  }

  async function handleChangeProjectClick() {
    setChangeProjectLoading(true);
    try {
      setChangeProjectList(await listReconnectProjects());
      setChangeProjectOpen(true);
    } catch {
      toast.error("Couldn't load projects — try again.");
    } finally {
      setChangeProjectLoading(false);
    }
  }

  async function handleTableAccessClick() {
    setTableAccessLoading(true);
    try {
      setTableAccessSchema(await getReconnectSchema());
      setTableAccessOpen(true);
    } finally {
      setTableAccessLoading(false);
    }
  }

  const resolved = schema?.status === "DETECTED" ? schema : null;
  const tableConfigured = resolved !== null;
  const enabledColumns = resolved?.filterableColumns.filter((c) => c.enabled) ?? [];
  const columnsConfigured = enabledColumns.length > 0;
  const filterable = columnsConfigured
    ? enabledColumns.map((c) => c.columnName).join(" · ")
    : "Not configured";
  let userTableLabel = "Not configured";
  if (resolved) userTableLabel = `${resolved.userTableSchema}.${resolved.userTableName}`;
  else if (schema?.status === "MULTIPLE_CANDIDATES") userTableLabel = "Multiple tables found";

  return (
    <SectionCard title="Supabase">
      <div className="flex flex-col gap-3.5">
        <FieldRow label="Project">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[13.5px] text-text-primary">
                {connectionName ?? "Not connected"}
              </span>
              {connectionName && (
                <span className="font-mono text-[12px] text-text-muted overflow-hidden text-ellipsis">
                  {connectionName}.supabase.co
                </span>
              )}
            </div>
            <EditLink
              icon={RefreshCw}
              label="Change project"
              onClick={handleChangeProjectClick}
              disabled={changeProjectLoading}
            />
          </div>
        </FieldRow>
        <FieldRow label="User table">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={
                tableConfigured
                  ? "font-mono text-[13px] text-[#CBCBD4]"
                  : "font-mono text-[13px] text-orange"
              }
            >
              {userTableLabel}
            </span>
            <EditLink onClick={handleTableAccessClick} disabled={tableAccessLoading} />
          </div>
        </FieldRow>
        <FieldRow label="Filterable">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={
                columnsConfigured
                  ? "font-mono text-[13px] text-text-muted"
                  : "font-mono text-[13px] text-orange"
              }
            >
              {filterable}
            </span>
            <EditLink
              onClick={() => setColumnsOpen(true)}
              disabled={!tableConfigured}
            />
          </div>
        </FieldRow>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setConfirmReconfigureOpen(true)}
          className="flex items-center gap-1.75 bg-transparent border border-white/[0.13] text-[#B9B9C2] text-[12.5px] font-medium rounded-lg px-[13px] py-2 whitespace-nowrap transition-colors hover:border-white/[0.24] hover:text-text-primary cursor-pointer"
        >
          <RefreshCw size={12} />
          Reconfigure connection
        </button>
      </div>

      <AlertDialog
        open={confirmReconfigureOpen}
        onOpenChange={setConfirmReconfigureOpen}
      >
        <AlertDialogContent
          style={{ background: "#111116" }}
          className="border border-(--color-border) rounded-[14px] p-[22px] w-[400px] flex flex-col gap-4 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
        >
          <div className="flex flex-col gap-1">
            <div className="text-[11.5px] font-medium tracking-[0.04em] uppercase text-status-failed">
              Warning — this is a destructive operation
            </div>
            <div className="text-[16px] font-semibold text-text-primary tracking-[-0.01em]">
              Reconfigure connection
            </div>
          </div>
          <div className="text-[13.5px] leading-[1.55] text-[#B9B9C2]">
            Reconfiguring your connection will remove current settings. It
            will reset your table and filterable columns, and you&apos;ll
            need to re-confirm access for the new project. Your email
            provider connection stays intact.
          </div>
          <div className="text-[12.5px] leading-[1.55] text-text-muted">
            This is for connecting a completely different Supabase account
            — not for switching projects on the one you&apos;re already
            connected to. To do that instead, use{" "}
            <span className="text-[#CBCBD4]">Change project</span> next to
            the project name.
          </div>
          <AlertDialogFooter>
            <button
              onClick={() => setConfirmReconfigureOpen(false)}
              disabled={reconfiguring}
              className="flex items-center justify-center bg-transparent border border-white/[0.13] text-[#B9B9C2] text-[13px] font-medium rounded-lg px-[14px] py-2 hover:border-white/[0.24] hover:text-text-primary transition-colors cursor-pointer disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleReconfigureConfirmed}
              disabled={reconfiguring}
              className="flex items-center justify-center gap-1.75 bg-status-failed text-[#1A0B0A] text-[13px] font-semibold rounded-lg px-4 py-2 hover:not-disabled:bg-[#F0857D] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {reconfiguring && (
                <Spinner size={12} className="border-[rgba(26,11,10,0.3)] border-t-[#1A0B0A]" />
              )}
              {reconfiguring ? "Redirecting…" : "Reconfigure"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ChangeProjectDialog
        open={changeProjectOpen}
        onOpenChange={setChangeProjectOpen}
        projects={changeProjectList}
      />
      <EditTableAccessDialog
        open={tableAccessOpen}
        onOpenChange={setTableAccessOpen}
        schema={tableAccessSchema}
      />
      <EditColumnsDialog
        open={columnsOpen}
        onOpenChange={setColumnsOpen}
        schema={schema}
      />
    </SectionCard>
  );
}

function EditLink({
  onClick,
  disabled,
  label = "Edit",
  icon: Icon = Pencil,
}: Readonly<{
    onClick: () => void;
    disabled?: boolean;
    label?: string;
    icon?: typeof Pencil;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 text-[12px] text-orange hover:text-orange-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
    >
      <Icon size={10} />
      {label}
    </button>
  );
}
