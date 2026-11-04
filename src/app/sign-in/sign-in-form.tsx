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
  AccessDenied: "That Google account can't be used here. It needs a verified email and must be on the project's test user list.",
};

type QuickPick = { label: string; username: string; name: string };

const GOOGLE_FAILED = "Google sign-in didn't finish. Try again, or use a demo account.";

type Props = {
  demoPassword: string | null;
  quickPicks: QuickPick[];
  googleEnabled: boolean;
  redirectError: string | null;
};

export function SignInForm({ demoPassword, quickPicks, googleEnabled, redirectError }: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(redirectError ? (ERROR_MESSAGES[redirectError] ?? GOOGLE_FAILED) : null);
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
    <main className="flex flex-1 items-center justify-center bg-navy p-4">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl bg-card p-6 shadow-2xl sm:p-8">
      <h1 className="text-3xl font-bold">Sign in with LMS</h1>
      {demoPassword && (
        <div className="rounded-lg bg-secondary p-3 text-sm">
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
      {googleEnabled && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => signIn("google", { callbackUrl: "/home" })}>
            Continue with Google
          </Button>
          <p className="text-xs text-muted-foreground">For the demo only, until the LMS is connected.</p>
        </div>
      )}
      </div>
    </main>
  );
}
