"use client";

import { Mic, Square } from "lucide-react";
import Link from "next/link";
import { type Ref, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PracticeLanguage } from "@/db/schema/enum-values";
import { AI_PROVIDER_LABELS } from "@/features/ai/providers";
import type { TranscriptionProvider } from "@/features/ai/transcription";
import {
  useAudioRecorder,
  useAudioRecorderSupport,
} from "@/hooks/use-audio-recorder";
import { useLocalFlag } from "@/hooks/use-local-flag";
import {
  useSpeechRecognition,
  useSpeechRecognitionSupport,
} from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";
import { transcribeRecording } from "../actions";
import {
  ANSWER_MAX_LENGTH,
  RECORDING_MAX_BYTES,
  RECORDING_MAX_SECONDS,
} from "../schemas";
import {
  appendSpoken,
  describeRecorderError,
  describeSpeechError,
  pickVoicePath,
  RECORDING_NOTICE_KEY,
  SPEECH_LOCALES,
  VOICE_NOTICE_KEY,
  type VoicePath,
} from "../voice";

const STOPPED_MESSAGE =
  "Berhenti mendengarkan. Transkrip bisa disunting sebelum dikirim.";
const SILENCE_MESSAGE =
  "Tidak terdengar suara, jadi mikrofon dimatikan. Nyalakan lagi saat kamu siap.";
const FULL_MESSAGE = `Jawaban sudah mencapai ${ANSWER_MAX_LENGTH} karakter, jadi mikrofon dimatikan.`;
const TRANSCRIBED_MESSAGE =
  "Transkrip sudah masuk. Sunting dulu sebelum dikirim.";
const RECORDING_LIMIT_MINUTES = RECORDING_MAX_SECONDS / 60;

// What the status line says once the microphone is off. A problem is something
// the user has to act on, and reads at full strength.
type Message = { text: string; problem: boolean };

type VoiceProps = {
  language: PracticeLanguage;
  disabled?: boolean;
  // The answer as it stands, and the way to replace it.
  read: () => string;
  write: (text: string) => void;
  // True while the answer box belongs to the microphone.
  onListening: (listening: boolean) => void;
  // How long an answer was spoken for, each time some of it has become text.
  onSpoken: (seconds: number) => void;
  onStart?: () => void;
};

const focusOnMount = (node: HTMLButtonElement | null) => {
  node?.focus();
};

// How an answer can be spoken here: null until the browser is known, which is
// after mount, so the server's render and hydration agree.
export function useVoicePath(
  transcriptionProvider: TranscriptionProvider | null,
): VoicePath | null {
  const speechRecognition = useSpeechRecognitionSupport();
  const recorder = useAudioRecorderSupport();

  return speechRecognition === null || recorder === null
    ? null
    : pickVoicePath({
        speechRecognition,
        recorder,
        transcription: transcriptionProvider !== null,
      });
}

// The microphone next to an answer box. What is said goes into the same field
// typing does, after what is already there, so it is edited and sent like any
// other answer. Where the browser can listen, its own recognition does it;
// where it cannot, the answer is recorded and transcribed with a saved key
// that can. Either way the user is told where the audio goes before the first
// use, and this app keeps none of it.
export function VoiceInput({
  transcriptionProvider,
  ...props
}: VoiceProps & {
  // Whose key transcribes a recording; null when no saved key can.
  transcriptionProvider: TranscriptionProvider | null;
}) {
  const recorder = useAudioRecorderSupport();
  const path = useVoicePath(transcriptionProvider);

  // Holds the button's place until the browser is known.
  if (path === null) {
    return <div className="h-8" />;
  }

  if (path === "speech") {
    return <SpokenInput {...props} />;
  }

  if (path === "record" && transcriptionProvider) {
    return <RecordedInput {...props} provider={transcriptionProvider} />;
  }

  return (
    <p className="text-xs text-muted-foreground">
      Browser ini belum bisa mengenali ucapan. Buka Tarékah di Chrome atau
      Safari untuk menjawab dengan suara
      {recorder ? (
        <>
          , atau simpan key Google atau OpenAI di{" "}
          <Link
            href="/settings#ai"
            className="text-foreground underline underline-offset-4"
          >
            Pengaturan
          </Link>{" "}
          supaya rekamanmu bisa diubah jadi teks
        </>
      ) : null}
      . Kamu tetap bisa mengetik.
    </p>
  );
}

// The note shown before a microphone is used for the first time on this
// device, and whether it has been accepted.
function useFirstUseNotice(key: string) {
  const [seen, setSeen] = useLocalFlag(key);
  const [asking, setAsking] = useState(false);

  return {
    seen,
    asking,
    ask: () => setAsking(true),
    dismiss: () => setAsking(false),
    accept: () => {
      setSeen(true);
      setAsking(false);
    },
  };
}

// The browser listens and the words arrive as they are said.
function SpokenInput({
  language,
  disabled = false,
  read,
  write,
  onListening,
  onSpoken,
  onStart,
}: VoiceProps) {
  const notice = useFirstUseNotice(VOICE_NOTICE_KEY);
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
    } else if (notice.asking) {
      notice.dismiss();
    } else if (notice.seen) {
      begin();
    } else {
      notice.ask();
    }
  }

  return (
    <VoiceControl
      buttonRef={micButton}
      on={listening}
      disabled={disabled}
      onToggle={toggle}
      status={
        listening
          ? "Mendengarkan. Tekan Berhenti untuk menyunting jawabanmu."
          : null
      }
      message={message}
      notice={
        notice.asking
          ? {
              label: "Sebelum mikrofon menyala",
              text: "Saat mikrofon menyala, suaramu diubah jadi teks oleh layanan pengenal ucapan browser-mu (di Chrome: server Google). Tarékah tidak menerima dan tidak menyimpan audionya.",
              confirm: "Nyalakan mikrofon",
              onAccept: () => {
                notice.accept();
                begin();
                micButton.current?.focus();
              },
              onCancel: () => {
                notice.dismiss();
                micButton.current?.focus();
              },
            }
          : null
      }
    />
  );
}

// The browser cannot listen, so the answer is recorded here and turned into
// text by the provider whose key is saved. The recording stays in memory until
// it has become text, so a provider that fails does not cost the answer.
function RecordedInput({
  language,
  disabled = false,
  read,
  write,
  onListening,
  onSpoken,
  onStart,
  provider,
}: VoiceProps & { provider: TranscriptionProvider }) {
  const notice = useFirstUseNotice(RECORDING_NOTICE_KEY);
  const [transcribing, setTranscribing] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  // A recording that could not be transcribed, to try again with.
  const [kept, setKept] = useState<{ audio: Blob; seconds: number } | null>(
    null,
  );
  const micButton = useRef<HTMLButtonElement>(null);
  const recorder = useAudioRecorder({
    maxSeconds: RECORDING_MAX_SECONDS,
    maxBytes: RECORDING_MAX_BYTES,
    onStop: ({ reason, error, audio, seconds }) => {
      if (audio) {
        void transcribe(audio, seconds, reason === "limit");
        return;
      }

      onListening(false);

      if (reason === "error") {
        setMessage({ text: describeRecorderError(error ?? ""), problem: true });
      }
    },
  });
  const { recording } = recorder;

  async function transcribe(audio: Blob, seconds: number, cutShort: boolean) {
    const form = new FormData();
    // Whether trying the same recording again could help.
    let again = true;
    let problem: string | null = null;

    form.set("language", language);
    form.set("seconds", String(seconds));
    form.set("audio", audio);
    setTranscribing(true);
    setKept(null);
    setMessage(null);
    onListening(true);

    try {
      const result = await transcribeRecording(form);

      if (!result.ok) {
        problem = result.message;
      } else if (result.data.status === "not_configured") {
        problem =
          "Key untuk transkripsi sudah tidak tersimpan. Simpan lagi di Pengaturan, atau lanjutkan dengan mengetik.";
      } else if (result.data.text === "") {
        again = false;
        problem =
          "Tidak ada ucapan yang terbaca dari rekaman itu. Coba rekam lagi, atau lanjutkan dengan mengetik.";
      } else {
        write(appendSpoken(read(), result.data.text, ANSWER_MAX_LENGTH));
        onSpoken(seconds);
        setMessage({
          text: cutShort
            ? `Rekaman berhenti di ${RECORDING_LIMIT_MINUTES} menit. ${TRANSCRIBED_MESSAGE}`
            : TRANSCRIBED_MESSAGE,
          problem: false,
        });
      }
    } catch {
      problem =
        "Rekaman gagal dikirim. Coba lagi, atau lanjutkan dengan mengetik.";
    }

    if (problem) {
      setMessage({ text: problem, problem: true });
      setKept(again ? { audio, seconds } : null);
    }

    setTranscribing(false);
    onListening(false);
  }

  function begin() {
    setMessage(null);
    setKept(null);
    onStart?.();
    onListening(true);
    void recorder.start();
  }

  function toggle() {
    if (recording) {
      recorder.stop();
    } else if (notice.asking) {
      notice.dismiss();
    } else if (notice.seen) {
      begin();
    } else {
      notice.ask();
    }
  }

  return (
    <VoiceControl
      buttonRef={micButton}
      on={recording}
      disabled={disabled || transcribing}
      onToggle={toggle}
      status={
        recording
          ? `Merekam, paling lama ${RECORDING_LIMIT_MINUTES} menit. Tekan Berhenti untuk mengubahnya jadi teks.`
          : transcribing
            ? "Mengubah rekaman jadi teks…"
            : null
      }
      message={message}
      retry={
        kept && !recording && !transcribing
          ? () => void transcribe(kept.audio, kept.seconds, false)
          : null
      }
      notice={
        notice.asking
          ? {
              label: "Sebelum merekam",
              text: `Browser ini belum bisa mengenali ucapan, jadi jawabanmu direkam lalu dikirim ke ${AI_PROVIDER_LABELS[provider]} dengan key-mu sendiri untuk diubah jadi teks. Tarékah tidak menyimpan rekamannya.`,
              confirm: "Mulai merekam",
              onAccept: () => {
                notice.accept();
                begin();
                micButton.current?.focus();
              },
              onCancel: () => {
                notice.dismiss();
                micButton.current?.focus();
              },
            }
          : null
      }
    />
  );
}

// What both ways of speaking look like: the button, one line of status that
// is announced as it changes, and the note before the first use.
function VoiceControl({
  buttonRef,
  on,
  disabled,
  onToggle,
  status,
  message,
  retry = null,
  notice,
}: {
  buttonRef: Ref<HTMLButtonElement>;
  // The microphone is on.
  on: boolean;
  disabled: boolean;
  onToggle: () => void;
  // What is happening now; when nothing is, the last message shows.
  status: string | null;
  message: Message | null;
  retry?: (() => void) | null;
  notice: {
    label: string;
    text: string;
    confirm: string;
    onAccept: () => void;
    onCancel: () => void;
  } | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          ref={buttonRef}
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={on}
          disabled={disabled}
          onClick={onToggle}
        >
          {on ? <Square /> : <Mic />}
          {on ? "Berhenti" : "Jawab dengan suara"}
        </Button>
        <p
          role="status"
          className={cn(
            "flex min-w-0 flex-1 basis-56 items-center gap-2",
            message?.problem && !status
              ? "text-sm"
              : "text-xs text-muted-foreground",
          )}
        >
          {status ? (
            <>
              {on ? (
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full bg-primary motion-safe:animate-pulse"
                />
              ) : null}
              {status}
            </>
          ) : (
            message?.text
          )}
        </p>
        {retry ? (
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            Coba transkripsi lagi
          </Button>
        ) : null}
      </div>

      {notice ? (
        <div
          role="group"
          aria-label={notice.label}
          className="flex flex-col items-start gap-3 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground"
        >
          <p>{notice.text}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              ref={focusOnMount}
              type="button"
              variant="outline"
              size="sm"
              onClick={notice.onAccept}
            >
              {notice.confirm}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={notice.onCancel}
            >
              Batal
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
