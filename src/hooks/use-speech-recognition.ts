import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  afterRun,
  findSpeechRecognition,
  joinSpoken,
  readParts,
} from "@/lib/speech";

// TypeScript's DOM types stop short of the recognizer itself: only its result
// lists are declared. This is the part of the interface used here.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type RecognitionConstructor = new () => Recognition;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

export type SpeechStop = {
  reason: "requested" | "silence" | "error";
  // The recognizer's error code, when that is why it stopped.
  error: string | null;
  // How long the microphone was on, and whether it heard anything.
  seconds: number;
  heard: boolean;
};

// One stretch of listening, from the user turning the microphone on to it
// going off. The recognizer may be started several times within it.
type Session = {
  recognition: Recognition | null;
  stopRequested: boolean;
  // What the runs that already ended heard.
  committed: string;
  silentRuns: number;
  startedAt: number;
};

const subscribeToNothing = () => () => {};

// Whether this browser can listen. Null on the server and while hydrating, so
// what depends on it appears after mount and never differs from the server's
// render.
export function useSpeechRecognitionSupport(): boolean | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => findSpeechRecognition(window) !== null,
    () => null,
  );
}

// Listens through the browser's own speech recognition. `onHeard` gets all
// that was heard since `start`, the words still being worked out included;
// `onStop` says why listening ended. Unmounting turns the microphone off.
export function useSpeechRecognition({
  lang,
  onHeard,
  onStop,
}: {
  lang: string;
  onHeard: (text: string) => void;
  onStop: (stop: SpeechStop) => void;
}) {
  const [listening, setListening] = useState(false);
  const session = useRef<Session | null>(null);
  const handlers = useRef({ onHeard, onStop });

  // The recognizer's events outlive the render that started it.
  useEffect(() => {
    handlers.current = { onHeard, onStop };
  });

  function finish(
    current: Session,
    reason: SpeechStop["reason"],
    error: string | null,
  ) {
    if (session.current !== current) {
      return;
    }

    session.current = null;
    setListening(false);
    handlers.current.onStop({
      reason,
      error,
      seconds: (Date.now() - current.startedAt) / 1000,
      heard: current.committed !== "",
    });
  }

  function run(current: Session, Recognizer: RecognitionConstructor) {
    const recognition = new Recognizer();
    let heard = { finals: "", interim: "" };
    let error: string | null = null;

    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      heard = readParts(
        Array.from(event.results, (result) => ({
          text: result[0]?.transcript ?? "",
          final: result.isFinal,
        })),
      );
      handlers.current.onHeard(
        joinSpoken([current.committed, heard.finals, heard.interim]),
      );
    };
    recognition.onerror = (event) => {
      error = event.error;
    };
    recognition.onend = () => {
      // Words shown are kept, even ones the recognizer never settled on.
      current.committed = joinSpoken([
        current.committed,
        heard.finals,
        heard.interim,
      ]);

      const after = afterRun({
        stopRequested: current.stopRequested,
        error,
        heard: heard.finals !== "" || heard.interim !== "",
        silentRuns: current.silentRuns,
      });

      if (after.next === "restart" && session.current === current) {
        current.silentRuns = after.silentRuns;
        run(current, Recognizer);
      } else if (after.next === "stop") {
        finish(current, after.reason, error);
      }
    };
    current.recognition = recognition;

    try {
      recognition.start();
    } catch {
      finish(current, "error", "start-failed");
    }
  }

  function start() {
    const Recognizer = findSpeechRecognition(window);

    if (!Recognizer || session.current) {
      return;
    }

    const current: Session = {
      recognition: null,
      stopRequested: false,
      committed: "",
      silentRuns: 0,
      startedAt: Date.now(),
    };

    session.current = current;
    setListening(true);
    run(current, Recognizer);
  }

  // The recognizer settles the words it is still working on, then ends.
  function stop() {
    const current = session.current;

    if (current) {
      current.stopRequested = true;
      current.recognition?.stop();
    }
  }

  useEffect(
    () => () => {
      const current = session.current;

      if (current?.recognition) {
        current.recognition.onresult = null;
        current.recognition.onend = null;
        current.recognition.abort();
        finish(current, "requested", null);
      }
    },
    [],
  );

  return { listening, start, stop };
}
