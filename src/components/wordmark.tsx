import Link from "next/link";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="font-heading text-lg font-bold tracking-tight">
      StudentDesk
    </Link>
  );
}
