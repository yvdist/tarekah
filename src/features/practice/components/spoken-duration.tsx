import { describeSpokenDuration } from "../voice";

// How long a spoken answer ran, as information. The note about usual lengths
// is closed until asked for: a yardstick, not a target to be measured against.
export function SpokenDuration({
  seconds,
  earlier = false,
}: {
  seconds: number;
  // The answer is already behind the user, as in a simulation.
  earlier?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      <p>
        {earlier ? "Jawabanmu tadi" : "Jawabanmu"}{" "}
        {describeSpokenDuration(seconds)}.
      </p>
      <details>
        <summary className="w-fit cursor-pointer rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          Biasanya berapa lama?
        </summary>
        <p className="mt-1">
          Jawaban behavioral umumnya 1,5–2,5 menit. Ini patokan, bukan aturan.
        </p>
      </details>
    </div>
  );
}
