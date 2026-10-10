"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AiProvider } from "@/db/schema/enum-values";
import {
  deleteAiCredential,
  setActiveAiProvider,
  testAiCredential,
} from "../actions";
import { AI_PROVIDER_LABELS } from "../providers";

export type SavedCredential = {
  provider: AiProvider;
  model: string;
  keyLast4: string;
};

export function AiCredentialList({
  credentials,
  activeProvider,
}: {
  credentials: ReadonlyArray<SavedCredential>;
  activeProvider: AiProvider | null;
}) {
  return (
    <ul className="divide-y rounded-md border">
      {credentials.map((credential) => (
        <CredentialRow
          key={credential.provider}
          credential={credential}
          active={credential.provider === activeProvider}
        />
      ))}
    </ul>
  );
}

type TestResult = { ok: boolean; message: string };

function CredentialRow({
  credential,
  active,
}: {
  credential: SavedCredential;
  active: boolean;
}) {
  const { provider, model, keyLast4 } = credential;
  const label = AI_PROVIDER_LABELS[provider];
  const [testing, startTest] = useTransition();
  const [switching, startSwitch] = useTransition();
  const [result, setResult] = useState<TestResult | null>(null);

  function test() {
    setResult(null);
    startTest(async () => {
      try {
        const outcome = await testAiCredential(provider);

        setResult(
          outcome.ok
            ? { ok: true, message: "Key berfungsi." }
            : { ok: false, message: outcome.message },
        );
      } catch {
        setResult({ ok: false, message: "Tes gagal dijalankan. Coba lagi." });
      }
    });
  }

  function activate() {
    startSwitch(async () => {
      try {
        const outcome = await setActiveAiProvider(provider);

        if (outcome.ok) {
          toast.success(`${label} sekarang aktif`);
        } else {
          toast.error(outcome.message);
        }
      } catch {
        toast.error("Provider gagal diganti. Coba lagi.");
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{label}</span>
            {active ? <Badge variant="secondary">Aktif</Badge> : null}
          </div>
          <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            <span className="font-mono break-all">{model}</span>
            <span className="font-figure">
              <span aria-hidden>•••• </span>
              <span className="sr-only">Key berakhiran </span>
              {keyLast4}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {active ? null : (
            <Button
              variant="outline"
              size="sm"
              disabled={switching}
              aria-label={`Jadikan ${label} aktif`}
              onClick={activate}
            >
              Jadikan aktif
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={testing}
            aria-label={`Tes key ${label}`}
            onClick={test}
          >
            {testing ? "Mengetes…" : "Tes key"}
          </Button>
          <DeleteButton
            action={deleteAiCredential.bind(null, provider)}
            label={`Hapus key ${label}`}
            title={`Hapus key ${label}?`}
            description="Key dihapus dari Tarékah, dan masukan AI berhenti sampai kamu menyimpan key lagi. Key di akun provider-mu tidak ikut terhapus."
            successMessage="Key dihapus"
          />
        </div>
      </div>
      <p
        role="status"
        className={
          result?.ok === false
            ? "text-xs text-destructive"
            : "text-xs text-muted-foreground"
        }
      >
        {result?.message}
      </p>
    </li>
  );
}
