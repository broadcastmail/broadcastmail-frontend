"use client";

import { useState } from "react";

interface SchemaSqlPreviewProps {
  password: string;
  userIdColumn: string;
  authColumns: string[];
  grantsTable: boolean;
  tableSchema: string;
  tableName: string;
}

// Best-effort *preview* of the grant script the backend runs on your
// behalf — POST /schema/confirm executes this server-side via the Supabase
// Management API and never returns the exact statements it ran, so this is
// reconstructed client-side from the same fields the confirm request sends.
// It is not guaranteed to be byte-identical to what actually executes.
export function SchemaSqlPreview({
  password,
  userIdColumn,
  authColumns,
  grantsTable,
  tableSchema,
  tableName,
}: SchemaSqlPreviewProps) {
  const [copied, setCopied] = useState(false);
  const authColumnList = [userIdColumn, "email", ...authColumns].join(", ");

  const plainText = [
    `CREATE ROLE broadcastmail_reader`,
    `  NOINHERIT LOGIN PASSWORD '${password}';`,
    ``,
    `GRANT USAGE ON SCHEMA auth`,
    `  TO broadcastmail_reader;`,
    `GRANT SELECT (${authColumnList})`,
    `  ON auth.users TO broadcastmail_reader;`,
    ...(grantsTable
      ? [
          ``,
          `GRANT USAGE ON SCHEMA ${tableSchema}`,
          `  TO broadcastmail_reader;`,
          `GRANT SELECT ON ${tableSchema}.${tableName}`,
          `  TO broadcastmail_reader;`,
        ]
      : []),
  ].join("\n");

  function copy() {
    navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="relative bg-[#0E0E13] border border-[#1E1E26] rounded-lg p-[14px]">
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 flex items-center gap-[5px] bg-[#17171D] border border-[#26262F] hover:border-[#3A3A46] rounded-md px-2 py-1 text-[11px] text-[#B9B9C2] cursor-pointer transition-colors"
      >
        <svg width="11" height="11" viewBox="0 0 14 14" aria-hidden="true">
          <rect x="4.5" y="1.5" width="8" height="8" rx="2" stroke="#B9B9C2" fill="none" />
          <rect x="1.5" y="4.5" width="8" height="8" rx="2" stroke="#B9B9C2" fill="#17171D" />
        </svg>
        {copied ? "Copied" : "Copy SQL"}
      </button>

      <pre className="font-mono text-[11.5px] leading-[1.7] text-[#CBCBD4] whitespace-pre overflow-x-auto">
        <span className="text-orange">CREATE ROLE</span> broadcastmail_reader{"\n"}
        {"  "}NOINHERIT LOGIN <span className="text-orange">PASSWORD</span>{" "}
        <span className="text-[#4ADE80]">{`'${password}'`}</span>;{"\n\n"}
        <span className="text-orange">GRANT USAGE ON SCHEMA</span> auth{"\n"}
        {"  "}
        <span className="text-orange">TO</span> broadcastmail_reader;{"\n"}
        <span className="text-orange">GRANT SELECT</span> ({authColumnList}){"\n"}
        {"  "}
        <span className="text-orange">ON</span> auth.users{" "}
        <span className="text-orange">TO</span> broadcastmail_reader;
      </pre>

      {grantsTable && (
        <pre className="font-mono text-[11.5px] leading-[1.7] text-[#CBCBD4] whitespace-pre overflow-x-auto mt-3">
          <span className="text-orange">GRANT USAGE ON SCHEMA</span> {tableSchema}{"\n"}
          {"  "}
          <span className="text-orange">TO</span> broadcastmail_reader;{"\n"}
          <span className="text-orange">GRANT SELECT ON</span> {tableSchema}.{tableName}{"\n"}
          {"  "}
          <span className="text-orange">TO</span> broadcastmail_reader;
        </pre>
      )}
    </div>
  );
}
