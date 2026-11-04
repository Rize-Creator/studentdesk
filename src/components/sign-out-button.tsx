"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button variant="ghost" size="sm" className="text-white hover:bg-white/15 hover:text-white" onClick={() => signOut({ callbackUrl: "/" })}>
      Sign out
    </Button>
  );
}
