import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getLmsClient } from "@/features/lms";
import { prisma } from "@/lib/db";

export const SIGN_IN_ERRORS = {
  invalid: "InvalidCredentials",
  unavailable: "LmsUnavailable",
} as const;

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

        const { lmsId, name, email } = result.identity;
        const user = await prisma.user.upsert({
          where: { lmsId },
          update: { name, email, lastLoginAt: new Date() },
          create: { lmsId, name, email, lastLoginAt: new Date() },
        });
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
};
