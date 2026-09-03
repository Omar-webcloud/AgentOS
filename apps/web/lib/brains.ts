export type BrainId = "chatgpt" | "gemini" | "grok";

export interface BrainMeta {
  id: BrainId;
  name: string;
  tag: string;
  blurb: string;
  googleHint: string;
  swatch: string;
}

export const BRAINS: BrainMeta[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    tag: "OpenAI",
    blurb: "Trigger agents through your ChatGPT account.",
    googleHint: "Sign in with the Google account you use for ChatGPT.",
    swatch: "#10a37f",
  },
  {
    id: "gemini",
    name: "Gemini",
    tag: "Google",
    blurb: "Trigger agents through Gemini on the same Google account.",
    googleHint: "Sign in with Google to connect Gemini.",
    swatch: "#4b64e8",
  },
  {
    id: "grok",
    name: "Grok",
    tag: "xAI",
    blurb: "Trigger agents through Grok.",
    googleHint: "Sign in with the Google account you use for Grok.",
    swatch: "#e8e4dc",
  },
];

export function brainMeta(id: string | null | undefined): BrainMeta | undefined {
  return BRAINS.find((b) => b.id === id);
}
