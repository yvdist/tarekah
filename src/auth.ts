import "server-only";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { accounts, sessions, users } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
  }),
  providers: [GitHub, Google],
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  callbacks: {
    // The default callback drops the id, and every query filters on it.
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
