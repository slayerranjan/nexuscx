import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getAgentByEmail, getAgentById } from "@/lib/db/queries";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const agent = getAgentByEmail(email.toLowerCase().trim());
        if (!agent) return null;

        const valid = await bcrypt.compare(password, agent.password_hash);
        if (!valid) return null;

        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          role: agent.role,
          organizationId: agent.organization_id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role: string }).role;
        token.organizationId = (user as unknown as { organizationId: string }).organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).id = token.sub;
        (session.user as unknown as Record<string, unknown>).role = token.role;
        (session.user as unknown as Record<string, unknown>).organizationId = token.organizationId;
      }
      return session;
    },
  },
});

export async function getCurrentAgent() {
  const session = await auth();
  if (!session?.user) return null;
  const u = session.user as unknown as { id: string };
  return getAgentById(u.id) ?? null;
}
