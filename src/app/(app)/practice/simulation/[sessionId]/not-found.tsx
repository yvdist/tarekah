import Link from "next/link";
import { StateMessage } from "@/components/state-message";
import { buttonVariants } from "@/components/ui/button";

export default function SimulationNotFound() {
  return (
    <StateMessage
      title="Simulasi tidak ditemukan"
      description="Sesi ini tidak ada, atau bukan milik akunmu."
    >
      <Link href="/practice" className={buttonVariants({ variant: "outline" })}>
        Kembali ke Latihan
      </Link>
    </StateMessage>
  );
}
