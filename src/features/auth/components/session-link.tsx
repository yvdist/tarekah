import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";

type SessionLinkProps = {
  // What a visitor reads on the link to the sign-in page.
  guestLabel: string;
  // What someone who is already signed in reads on the link to the dashboard.
  userLabel: string;
  className?: string;
};

// A call to action on a public page. The session is read behind a boundary,
// so the page stays static and shows the visitor's link until the answer
// arrives.
export function SessionLink(props: SessionLinkProps) {
  return (
    <Suspense fallback={<GuestLink {...props} />}>
      <ResolvedLink {...props} />
    </Suspense>
  );
}

function GuestLink({ guestLabel, className }: SessionLinkProps) {
  return (
    <Link href="/login" className={className}>
      {guestLabel}
    </Link>
  );
}

async function ResolvedLink(props: SessionLinkProps) {
  const user = await getCurrentUser();

  if (!user) {
    return <GuestLink {...props} />;
  }

  return (
    <Link href="/dashboard" className={props.className}>
      {props.userLabel}
    </Link>
  );
}
