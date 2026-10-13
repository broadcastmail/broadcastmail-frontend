"use client";

import {useState} from "react";
import type {Campaign} from "@/lib/types/campaigns";
import type {EmailBody} from "@/features/campaigns/new/compose/ui/editor/email-editor";
import {EMPTY_DOC} from "@/features/campaigns/new/compose/lib/editor-extensions";

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

export function useCampaignDraft(campaign: Campaign): CampaignDraft {
  const [name, setName] = useState(campaign.name);
  const [subject, setSubject] = useState(campaign.subject);
  const [source, setSource] = useState<ContentSource>("visual");
  const [visualBody, setVisualBody] = useState<EmailBody>(() => ({
    html: campaign.bodyHtml ?? "",
    json: EMPTY_DOC,
  }));
  const [importedHtml, setImportedHtml] = useState("");

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
