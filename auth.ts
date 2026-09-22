import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { accounts, sessions, users, verificationTokens } from "./db/schema";

// Skeleton config — no provider is wired up yet (that's an
// implementation decision for later: email magic links, Google,
// etc.). This just establishes the Drizzle adapter and makes each
// user's `role` (patient/physician/administrator) available on the
// session, since the whole app's access model depends on it.
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    // TODO: add a provider (e.g. Resend/email magic link, or an
    // OAuth provider) once decided.
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // @ts-expect-error -- role is a custom field, see next-auth.d.ts
        session.user.role = user.role;
        session.user.id = user.id;
      }
      return session;
    },
  },
});
