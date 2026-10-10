import type { DeepSeekLanguageModelChatOptions } from "@ai-sdk/deepseek";

// Settings for one provider, passed with every call: each provider reads only
// its own entry, so this needs no knowledge of which one the user chose.
//
// DeepSeek's current models think at high effort unless told otherwise. The
// calls here are short and bounded (a key test of a few tokens, feedback with
// a time limit and a token limit), where that risks an answer cut off before
// it is written, so thinking is turned off.
export const AI_PROVIDER_OPTIONS = {
  deepseek: {
    thinking: { type: "disabled" },
  } satisfies DeepSeekLanguageModelChatOptions,
};
