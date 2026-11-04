"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button variant="ghost" size="sm" className="hover:bg-chalk/15 hover:text-chalk" onClick={() => signOut({ callbackUrl: "/" })}>
      Sign out
    </Button>
  );
}
