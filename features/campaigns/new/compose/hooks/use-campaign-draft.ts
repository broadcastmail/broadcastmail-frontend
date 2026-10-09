"use client";

import {useState} from "react";
import type {Campaign} from "@/lib/types/campaigns";
import type {EmailBody} from "@/features/campaigns/new/compose/ui/editor/email-editor";
import {EMPTY_DOC, jsonToHtml} from "@/features/campaigns/new/compose/lib/editor-extensions";

export type ContentSource = "visual" | "import";

export interface CampaignDraft {
  name: string;
  setName: (name: string) => void;
  subject: string;
  setSubject: (subject: string) => void;
  source: ContentSource;
  setSource: (source: ContentSource) => void;
  visualBody: EmailBody;
  setVisualBody: (body: EmailBody) => void;
  importedHtml: string;
  setImportedHtml: (html: string) => void;
}

function initialVisualBody(campaign: Campaign): EmailBody {
  return campaign.source === "visual" && campaign.bodyJson
    ? { html: jsonToHtml(campaign.bodyJson), json: campaign.bodyJson }
    : { html: "", json: EMPTY_DOC };
}

export function useCampaignDraft(campaign: Campaign): CampaignDraft {
  const [name, setName] = useState(campaign.name);
  const [subject, setSubject] = useState(campaign.subject);
  const [source, setSource] = useState<ContentSource>(campaign.source);
  const [visualBody, setVisualBody] = useState(() => initialVisualBody(campaign));
  const [importedHtml, setImportedHtml] = useState(
    campaign.source === "import" ? (campaign.bodyHtmlImported ?? "") : "",
  );

  return {
    name,
    setName,
    subject,
    setSubject,
    source,
    setSource,
    visualBody,
    setVisualBody,
    importedHtml,
    setImportedHtml,
  };
}
