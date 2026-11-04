import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { googleIdentity, isGoogleEnabled, type GoogleProfile } from "@/features/auth/google";
import { getLmsClient } from "@/features/lms";
import type { LmsIdentity } from "@/features/lms/types";
import { prisma } from "@/lib/db";

export const SIGN_IN_ERRORS = {
  invalid: "InvalidCredentials",
  unavailable: "LmsUnavailable",
} as const;

function saveUser({ lmsId, name, email }: LmsIdentity) {
  return prisma.user.upsert({
    where: { lmsId },
    update: { name, email, lastLoginAt: new Date() },
    create: { lmsId, name, email, lastLoginAt: new Date() },
  });
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/sign-in" },
  providers: [
    CredentialsProvider({
      name: "LMS",
      credentials: {
        username: { label: "LMS username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username?.trim();
        const password = credentials?.password;
        if (!username || !password) throw new Error(SIGN_IN_ERRORS.invalid);

        // The password goes only to the LMS client. It is never saved or logged.
        const result = await getLmsClient().verifyCredentials(username, password);
        if (!result.ok) throw new Error(SIGN_IN_ERRORS[result.reason]);

        const user = await saveUser(result.identity);
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
    ...(isGoogleEnabled(process.env)
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      return googleIdentity(profile as GoogleProfile) !== null;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google") {
        // Google's own ID isn't our user ID, so swap it for the saved user's.
        const saved = await saveUser(googleIdentity(profile as GoogleProfile)!);
        token.sub = saved.id;
        token.name = saved.name;
        token.email = saved.email;
      } else if (user) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
};
