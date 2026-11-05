"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p>The page couldn&apos;t load. This can happen if the database is waking up. Please try again.</p>
      <Button onClick={reset} className="self-start">Try again</Button>
    </main>
  );
}
