import Link from "next/link";

// Shown where the AI's part would be when the user has no key. An invitation,
// not an error. `simulation` words it for a session that cannot start without
// one; the default is for feedback on an answer that is saved either way.
export function AiInvite({ simulation = false }: { simulation?: boolean }) {
  const settings = (
    <Link
      href="/settings#ai"
      className="text-foreground underline underline-offset-4"
    >
      Pengaturan
    </Link>
  );

  return (
    <p className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
      {simulation ? (
        <>
          Simulasi memakai key AI-mu sendiri sebagai interviewer. Simpan dulu
          key-nya di {settings}, lalu kembali ke sini. Latihan singkat tetap
          bisa dipakai tanpa key.
        </>
      ) : (
        <>
          Masukan atas jawabanmu muncul di sini setelah kamu menyimpan key AI-mu
          sendiri di {settings}. Tanpa key pun latihanmu tetap tercatat.
        </>
      )}
    </p>
  );
}
