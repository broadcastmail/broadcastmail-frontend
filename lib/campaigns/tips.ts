export interface EditorTip {
  title: string;
  text: string;
  dot: "good" | "warn";
}

export const RENDER_TIPS: EditorTip[] = [
  {
    dot: "good",
    title: "Tables, not flexbox",
    text: "Outlook ignores flex and grid. Use table layouts for anything side by side.",
  },
  {
    dot: "good",
    title: "Inline your styles",
    text: "Gmail strips <style> blocks in some clients — put CSS on the element.",
  },
  {
    dot: "good",
    title: "One clear CTA",
    text: "A single primary link outperforms three competing ones.",
  },
  {
    dot: "warn",
    title: "Keep it under 102 KB",
    text: "Gmail clips longer emails and hides your unsubscribe link.",
  },
  {
    dot: "warn",
    title: "Alt text on every image",
    text: "Most clients block images by default — the alt text is what they read first.",
  },
];

// Deliverability
export const SPAM_TIPS: EditorTip[] = [
  {
    dot: "good",
    title: "Verify SPF, DKIM & DMARC",
    text: "An authenticated sending domain is the single biggest factor in inbox placement.",
  },
  {
    dot: "good",
    title: "Always include an unsubscribe link",
    text: "Missing it is a near-instant spam flag with Gmail and Outlook alike.",
  },
  {
    dot: "good",
    title: "Watch your text-to-image ratio",
    text: "An email that's almost entirely one big image reads as spam to most filters.",
  },
  {
    dot: "warn",
    title: "Avoid spam-trigger phrases",
    text: "\"Free\", \"Act now\", \"100% guaranteed\", and ALL CAPS subject lines get flagged.",
  },
  {
    dot: "warn",
    title: "Don't over-link or shorten URLs",
    text: "Too many links, or bit.ly-style shorteners, look like link-spam to filters.",
  },
  {
    dot: "warn",
    title: "Ramp up sending volume gradually",
    text: "A sudden spike from a new or low-volume domain can trip reputation-based filters.",
  },
];
