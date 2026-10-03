import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { accounts, sessions, users, verificationTokens } from "./db/schema";
import { verifyPassword } from "./lib/password";
import { authConfig } from "./auth.config";

// v1 auth: username + password only (Credentials provider). Email
// magic link is a planned follow-up, not built yet — the adapter is
// kept wired up now so adding it later (or an OAuth provider) is
// additive rather than a rework.
//
// Note: NextAuth requires JWT sessions (not database sessions) when
// Credentials is a provider, since a Credentials sign-in has no
// OAuth account for the adapter to link a database session to.
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Credentials({
      name: "Username and password",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!username || !password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user || !user.passwordHash) return null;

        const passwordMatches = await verifyPassword(
          password,
          user.passwordHash
        );
        if (!passwordMatches) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    // TODO (follow-up): add an email magic-link provider once
    // outbound email is set up.
  ],
});
