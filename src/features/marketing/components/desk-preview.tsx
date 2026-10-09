import { cn } from "@/lib/utils";

const SHEET =
  "relative flex flex-col gap-1.5 rounded-lg border bg-card p-4 transition duration-300 hover:z-10 hover:rotate-0 hover:shadow-md motion-reduce:transition-none";

function Sheet({
  kind,
  className,
  children,
}: {
  kind: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(SHEET, className)}>
      <p className="text-xs text-muted-foreground">{kind}</p>
      {children}
    </div>
  );
}

// Made-up notes, laid out like sheets on a desk: the one under the pointer
// straightens and lifts. To a screen reader it is one image.
export function DeskPreview() {
  return (
    <div
      role="img"
      aria-label="Contoh catatan untuk satu lamaran: perusahaan, kontak recruiter, dan pertanyaan interview."
      className="grid grid-cols-6 px-2 py-3"
    >
      <Sheet kind="Perusahaan" className="col-span-4 -rotate-2">
        <p className="font-medium">Arunika Labs</p>
        <p className="text-sm text-muted-foreground">
          Tim kecil, kerja remote. Produknya dipakai gudang dan kurir.
        </p>
      </Sheet>
      <Sheet
        kind="Kontak"
        className="col-span-4 col-start-3 -mt-4 rotate-[1.5deg]"
      >
        <p className="font-medium">Rani Wulandari</p>
        <p className="text-sm text-muted-foreground">
          Talent Acquisition. Paling cepat membalas lewat LinkedIn.
        </p>
      </Sheet>
      <Sheet kind="Pertanyaan interview" className="col-span-5 -mt-3 -rotate-1">
        <p className="font-medium text-pretty">
          Ceritakan bug tersulit yang pernah kamu perbaiki.
        </p>
        <p className="font-figure text-xs text-muted-foreground">
          Interview teknis · CV Frontend v3
        </p>
      </Sheet>
    </div>
  );
}
