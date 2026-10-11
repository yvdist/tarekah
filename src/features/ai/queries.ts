import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { parseEncryptionSecret } from "./crypto";
import { findAiSummary } from "./data";
import { pickTranscriptionProvider } from "./transcription";

// The AI panel of the settings page: which keys are saved (provider, model and
// the last four characters, nothing more), which one is active, and whether
// this server can store keys at all.
export async function getAiSettings() {
  const user = await requireUser();
  const summary = await findAiSummaryByUserId(user.id);

  return { ...summary, serverReady: isServerReady() };
}

// Whether practice can ask for feedback (a key is saved and active), and whose
// key turns a recording into text: any saved one that can, or null.
export async function getAiStatus() {
  const user = await requireUser();
  const { activeProvider, credentials } = await findAiSummaryByUserId(user.id);
  const serverReady = isServerReady();

  return {
    ready: activeProvider !== null && serverReady,
    transcriptionProvider: serverReady
      ? pickTranscriptionProvider(
          activeProvider,
          credentials.map((credential) => credential.provider),
        )
      : null,
  };
}

// Read outside the cached function: it depends on the environment, not on the
// user.
function isServerReady() {
  try {
    parseEncryptionSecret(env.AI_KEY_ENCRYPTION_KEY);

    return true;
  } catch {
    return false;
  }
}

// Unexported: taking a userId argument, it must only be reachable through the
// session-resolving functions above.
async function findAiSummaryByUserId(userId: string) {
  "use cache";
  cacheTag(`ai:${userId}`);
  cacheLife("hours");

  return findAiSummary(db, userId);
}
