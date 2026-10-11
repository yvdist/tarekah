"use client";

import { Mic, Square } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PracticeLanguage } from "@/db/schema/enum-values";
import { useLocalFlag } from "@/hooks/use-local-flag";
import {
  useSpeechRecognition,
  useSpeechRecognitionSupport,
} from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";
import { ANSWER_MAX_LENGTH } from "../schemas";
import {
  appendSpoken,
  describeSpeechError,
  pickVoicePath,
  SPEECH_LOCALES,
  VOICE_NOTICE_KEY,
} from "../voice";

const STOPPED_MESSAGE =
  "Berhenti mendengarkan. Transkrip bisa disunting sebelum dikirim.";
const SILENCE_MESSAGE =
  "Tidak terdengar suara, jadi mikrofon dimatikan. Nyalakan lagi saat kamu siap.";
const FULL_MESSAGE = `Jawaban sudah mencapai ${ANSWER_MAX_LENGTH} karakter, jadi mikrofon dimatikan.`;

// What the status line says once listening has ended. A problem is something
// the user has to act on, and reads at full strength.
type Message = { text: string; problem: boolean };

const focusOnMount = (node: HTMLButtonElement | null) => {
  node?.focus();
};

// The microphone next to an answer box. What is heard goes into the same
// field typing does, after what is already there, so it is edited and sent
// like any other answer. The audio goes to the browser's speech service and
// never to this app; the user is told so before the first use.
export function VoiceInput({
  language,
  disabled = false,
  read,
  write,
  onListening,
  onSpoken,
  onStart,
}: {
  language: PracticeLanguage;
  disabled?: boolean;
  // The answer as it stands, and the way to replace it.
  read: () => string;
  write: (text: string) => void;
  onListening: (listening: boolean) => void;
  // How long the microphone was on, each time it goes off after hearing
  // something.
  onSpoken: (seconds: number) => void;
  onStart?: () => void;
}) {
  const supported = useSpeechRecognitionSupport();
  const [noticeSeen, setNoticeSeen] = useLocalFlag(VOICE_NOTICE_KEY);
  const [asking, setAsking] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const base = useRef("");
  const full = useRef(false);
  const micButton = useRef<HTMLButtonElement>(null);
  const recognition = useSpeechRecognition({
    lang: SPEECH_LOCALES[language],
    onHeard: (heard) => {
      const text = appendSpoken(base.current, heard, ANSWER_MAX_LENGTH);

      write(text);

      if (text.length >= ANSWER_MAX_LENGTH) {
        full.current = true;
        recognition.stop();
      }
    },
    onStop: ({ reason, error, seconds, heard }) => {
      const problem =
        reason === "error" ? describeSpeechError(error ?? "") : null;

      onListening(false);

      // A microphone that was refused, or left on in silence, spoke no answer.
      if (heard) {
        onSpoken(seconds);
      }

      setMessage(
        problem
          ? { text: problem, problem: true }
          : {
              text: full.current
                ? FULL_MESSAGE
                : reason === "silence"
                  ? SILENCE_MESSAGE
                  : STOPPED_MESSAGE,
              problem: false,
            },
      );
    },
  });
  const { listening } = recognition;

  function begin() {
    base.current = read();
    full.current = false;
    setMessage(null);
    onStart?.();
    onListening(true);
    recognition.start();
  }

  function toggle() {
    if (listening) {
      recognition.stop();
    } else if (asking) {
      setAsking(false);
    } else if (noticeSeen) {
      begin();
    } else {
      setAsking(true);
    }
  }

  function accept() {
    setNoticeSeen(true);
    setAsking(false);
    begin();
    micButton.current?.focus();
  }

  function cancel() {
    setAsking(false);
    micButton.current?.focus();
  }

  // Holds the button's place until the browser is known.
  if (supported === null) {
    return <div className="h-8" />;
  }

  if (pickVoicePath({ speechRecognition: supported }) === "none") {
    return (
      <p className="text-xs text-muted-foreground">
        Input suara belum didukung di browser ini. Kamu tetap bisa mengetik.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          ref={micButton}
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={listening}
          disabled={disabled}
          onClick={toggle}
        >
          {listening ? <Square /> : <Mic />}
          {listening ? "Berhenti" : "Jawab dengan suara"}
        </Button>
        <p
          role="status"
          className={cn(
            "flex min-w-0 flex-1 basis-56 items-center gap-2",
            message?.problem && !listening
              ? "text-sm"
              : "text-xs text-muted-foreground",
          )}
        >
          {listening ? (
            <>
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full bg-primary motion-safe:animate-pulse"
              />
              Mendengarkan. Tekan Berhenti untuk menyunting jawabanmu.
            </>
          ) : (
            message?.text
          )}
        </p>
      </div>

      {asking ? (
        <div
          role="group"
          aria-label="Sebelum mikrofon menyala"
          className="flex flex-col items-start gap-3 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground"
        >
          <p>
            Saat mikrofon menyala, suaramu diubah jadi teks oleh layanan
            pengenal ucapan browser-mu (di Chrome: server Google). Tarékah tidak
            menerima dan tidak menyimpan audionya.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              ref={focusOnMount}
              type="button"
              variant="outline"
              size="sm"
              onClick={accept}
            >
              Nyalakan mikrofon
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancel}>
              Batal
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
