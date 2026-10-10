import Link from "next/link";
import { StateMessage } from "@/components/state-message";
import { buttonVariants } from "@/components/ui/button";

export default function StoryNotFound() {
  return (
    <StateMessage
      title="Cerita tidak ditemukan"
      description="Cerita ini sudah dihapus atau tautannya salah."
    >
      <Link href="/stories" className={buttonVariants({ variant: "outline" })}>
        Kembali ke daftar cerita
      </Link>
    </StateMessage>
  );
}
