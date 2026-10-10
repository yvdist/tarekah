import { AI_PROVIDERS, type AiProvider } from "@/db/schema/enum-values";

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  google: "Google (Gemini)",
};

export const AI_PROVIDER_OPTIONS = AI_PROVIDERS.map((value) => ({
  value,
  label: AI_PROVIDER_LABELS[value],
}));

// Suggestions for the model field, the first one being the default. Any other
// id can be typed in, so a list that has gone stale never locks anyone out.
// Checked against each provider's model page on 2026-10-10:
// platform.claude.com/docs/en/about-claude/models/overview,
// developers.openai.com/api/docs/models, ai.google.dev/gemini-api/docs/models.
export const SUGGESTED_MODELS: Record<AiProvider, ReadonlyArray<string>> = {
  anthropic: [
    "claude-sonnet-5-5",
    "claude-opus-5-5",
    "claude-haiku-5-5",
    "claude-fable-5-1",
  ],
  openai: ["gpt-6.1-sol", "gpt-6-astra", "gpt-6-luna"],
  google: ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite"],
};

export const defaultModel = (provider: AiProvider) =>
  SUGGESTED_MODELS[provider][0];
