import { useEffect, useSyncExternalStore } from "react";
import { pickVoice, splitForSpeech } from "@/lib/speech";

// About fourteen seconds of speech at an unhurried pace.
const UTTERANCE_MAX_LENGTH = 180;

const hasSynthesis = () => "speechSynthesis" in window;

// Voices load after the page does, and the list is a new array on every read:
// the snapshot is their languages as one string, which compares by value.
function subscribeToVoices(listener: () => void) {
  if (!hasSynthesis()) {
    return () => {};
  }

  window.speechSynthesis.addEventListener("voiceschanged", listener);

  return () =>
    window.speechSynthesis.removeEventListener("voiceschanged", listener);
}

const voiceLanguages = () =>
  hasSynthesis()
    ? window.speechSynthesis
        .getVoices()
        .map((voice) => voice.lang)
        .join(",")
    : "";

// Reads text aloud in a locale with one of the browser's voices. `available`
// is false until a voice for the locale is known to exist, and on the server.
export function useSpeechSynthesis(locale: string) {
  const languages = useSyncExternalStore(
    subscribeToVoices,
    voiceLanguages,
    () => "",
  );
  const available =
    pickVoice(
      languages
        .split(",")
        .filter(Boolean)
        .map((lang) => ({ lang, localService: false })),
      locale,
    ) !== null;

  function cancel() {
    if (hasSynthesis()) {
      window.speechSynthesis.cancel();
    }
  }

  // Replaces whatever is being said.
  function speak(text: string) {
    if (!hasSynthesis()) {
      return;
    }

    const voice = pickVoice(window.speechSynthesis.getVoices(), locale);

    if (!voice) {
      return;
    }

    window.speechSynthesis.cancel();

    for (const chunk of splitForSpeech(text, UTTERANCE_MAX_LENGTH)) {
      const utterance = new SpeechSynthesisUtterance(chunk);

      utterance.voice = voice;
      utterance.lang = voice.lang;
      window.speechSynthesis.speak(utterance);
    }
  }

  // Nothing goes on talking after the page that asked for it is gone.
  useEffect(
    () => () => {
      if (hasSynthesis()) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  return { available, speak, cancel };
}
