import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { pickRecordingType } from "@/lib/speech";

// Speech needs little: a quarter of what browsers record at by default, which
// keeps three minutes well under a megabyte.
const AUDIO_BITS_PER_SECOND = 32_000;
// How often the recorder hands over what it has, so the size is known as it
// grows.
const CHUNK_MS = 1000;

const recordingType = () =>
  typeof MediaRecorder === "undefined"
    ? null
    : pickRecordingType((type) => MediaRecorder.isTypeSupported(type));

export type RecordingStop = {
  reason: "requested" | "limit" | "error";
  // The name of the exception, when that is why it stopped.
  error: string | null;
  // Null when there is nothing to transcribe.
  audio: Blob | null;
  seconds: number;
};

// One recording, from the microphone being asked for to it being released.
type Session = {
  stream: MediaStream | null;
  recorder: MediaRecorder | null;
  chunks: Blob[];
  bytes: number;
  startedAt: number;
  timer: ReturnType<typeof setTimeout> | null;
  reason: RecordingStop["reason"];
  // Set when the session ends before the microphone was granted.
  cancelled: boolean;
};

const subscribeToNothing = () => () => {};

// Whether this browser can record in a container the providers read. Null on
// the server and while hydrating, like useSpeechRecognitionSupport.
export function useAudioRecorderSupport(): boolean | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => !!navigator.mediaDevices?.getUserMedia && recordingType() !== null,
    () => null,
  );
}

// Records the microphone until `stop`, or until either limit is reached.
// `onStop` gets the recording, which is held in memory and nowhere else.
// Unmounting releases the microphone and drops what was recorded.
export function useAudioRecorder({
  maxSeconds,
  maxBytes,
  onStop,
}: {
  maxSeconds: number;
  maxBytes: number;
  onStop: (stop: RecordingStop) => void;
}) {
  const [recording, setRecording] = useState(false);
  const session = useRef<Session | null>(null);
  const handler = useRef(onStop);

  // The recorder's events outlive the render that started it.
  useEffect(() => {
    handler.current = onStop;
  });

  function finish(current: Session, error: string | null, keep: boolean) {
    if (session.current !== current) {
      return;
    }

    session.current = null;

    if (current.timer) {
      clearTimeout(current.timer);
    }

    // Turns the browser's recording indicator off.
    current.stream?.getTracks().forEach((track) => track.stop());
    setRecording(false);
    handler.current({
      reason: error ? "error" : current.reason,
      error,
      audio:
        keep && current.chunks.length > 0
          ? new Blob(current.chunks, { type: current.recorder?.mimeType })
          : null,
      seconds: current.startedAt ? (Date.now() - current.startedAt) / 1000 : 0,
    });
  }

  function end(current: Session, reason: RecordingStop["reason"]) {
    current.reason = reason;

    if (current.recorder?.state === "recording") {
      // Hands over the last piece, then fires `stop`.
      current.recorder.stop();
    } else {
      current.cancelled = true;
      finish(current, null, false);
    }
  }

  async function start() {
    const mimeType = recordingType();

    if (!mimeType || session.current) {
      return;
    }

    const current: Session = {
      stream: null,
      recorder: null,
      chunks: [],
      bytes: 0,
      startedAt: 0,
      timer: null,
      reason: "requested",
      cancelled: false,
    };

    session.current = current;
    setRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (current.cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
      });

      current.stream = stream;
      current.recorder = recorder;
      recorder.ondataavailable = (event) => {
        // The piece that would cross the limit is left out, so what is sent
        // always fits.
        if (current.bytes + event.data.size > maxBytes) {
          if (current.reason !== "limit") {
            end(current, "limit");
          }

          return;
        }

        current.chunks.push(event.data);
        current.bytes += event.data.size;
      };
      recorder.onerror = () => finish(current, "RecorderError", false);
      recorder.onstop = () => finish(current, null, true);
      recorder.start(CHUNK_MS);
      current.startedAt = Date.now();
      current.timer = setTimeout(
        () => end(current, "limit"),
        maxSeconds * 1000,
      );
    } catch (error) {
      finish(current, error instanceof Error ? error.name : "Error", false);
    }
  }

  function stop() {
    if (session.current) {
      end(session.current, "requested");
    }
  }

  useEffect(
    () => () => {
      const current = session.current;

      if (current) {
        current.cancelled = true;

        if (current.recorder) {
          current.recorder.ondataavailable = null;
          current.recorder.onstop = null;
          current.recorder.onerror = null;

          if (current.recorder.state === "recording") {
            current.recorder.stop();
          }
        }

        finish(current, null, false);
      }
    },
    [],
  );

  return { recording, start, stop };
}
