import type { NextAuthConfig } from "next-auth";

// Edge-safe slice of the Auth.js config. The middleware imports this
// (not auth.ts) so the Edge bundle never pulls in the database client,
// the Drizzle adapter, or bcrypt. auth.ts spreads this and adds those.
export const authConfig = {
  session: { strategy: "jwt" },
  providers: [],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present on initial sign-in; persist role/id
      // onto the token so every later request has it without a DB lookup.
      if (user) {
        // @ts-expect-error -- role is a custom field, see next-auth.d.ts
        token.role = user.role;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        // @ts-expect-error -- role is a custom field, see next-auth.d.ts
        session.user.role = token.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
