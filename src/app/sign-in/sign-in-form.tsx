"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERROR_MESSAGES: Record<string, string> = {
  InvalidCredentials: "That username or password is wrong.",
  LmsUnavailable: "The LMS can't be reached right now. Please try again in a few minutes.",
};

type QuickPick = { label: string; username: string; name: string };

export function SignInForm({ demoPassword, quickPicks }: { demoPassword: string | null; quickPicks: QuickPick[] }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await signIn("credentials", { username, password, redirect: false });
    setPending(false);
    if (result?.ok) {
      router.push("/home");
      router.refresh();
      return;
    }
    setError(ERROR_MESSAGES[result?.error ?? ""] ?? "Something went wrong. Please try again.");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-board p-4">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-sm bg-card p-6 shadow-[6px_6px_0_rgb(0_0_0/0.25)] sm:p-8">
      <h1 className="text-3xl font-bold">Sign in with LMS</h1>
      {demoPassword && (
        <div className="rounded-sm bg-secondary p-3 text-sm">
          <p className="font-medium">Demo mode: LMS not yet connected</p>
          <p className="mb-2">These are sample accounts. Pick one to fill in the form.</p>
          <div className="flex flex-wrap gap-2">
            {quickPicks.map((pick) => (
              <Button
                key={pick.username}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setUsername(pick.username);
                  setPassword(demoPassword);
                }}
              >
                {pick.label}: {pick.name}
              </Button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="username">LMS username</Label>
          <Input id="username" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
      </form>
      </div>
    </main>
  );
}
