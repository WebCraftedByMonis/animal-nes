import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextAuthConfig } from "next-auth";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  // JWT strategy works correctly with both Google OAuth AND Credentials provider.
  // Database strategy does not reliably create sessions for Credentials in NextAuth v5 beta.
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Runs once at sign-in — enrich the JWT with extra fields and record the login
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;

        // Fetch phone & country from DB so they're available everywhere
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
          select: { PhoneNumber: true, country: true },
        });
        token.phoneNumber = dbUser?.PhoneNumber ?? null;
        token.country = dbUser?.country ?? null;

        // Manually write a Session row so the dashboard login-tracking still works
        try {
          await prisma.session.create({
            data: {
              sessionToken: randomUUID(),
              userId: user.id as string,
              expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        } catch {
          // Non-fatal — tracking failure should never block sign-in
        }
      }
      return token;
    },

    // Expose JWT fields to every useSession() / auth() call
    async session({ session, token }: { session: any; token: any }) {
      if (session.user && token) {
        session.user.id = (token.id ?? token.sub) as string;
        session.user.phoneNumber = token.phoneNumber ?? null;
        session.user.country = token.country ?? null;
      }
      return session;
    },
  },
  // The /login page is for admin-only (custom auth). This is the user-facing NextAuth config.
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);