import Link from "next/link";

// Shown where feedback would be when the user has no AI key. An invitation,
// not an error: the answer is saved either way.
export function AiInvite() {
  return (
    <p className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
      Masukan atas jawabanmu muncul di sini setelah kamu menyimpan key AI-mu
      sendiri di{" "}
      <Link
        href="/settings#ai"
        className="text-foreground underline underline-offset-4"
      >
        Pengaturan
      </Link>
      . Tanpa key pun latihanmu tetap tercatat.
    </p>
  );
}
