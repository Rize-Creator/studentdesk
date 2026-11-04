import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">This page doesn&apos;t exist, or you aren&apos;t a member of this project.</p>
      <Link href="/" className="underline underline-offset-4">Go to the home page</Link>
    </main>
  );
}
