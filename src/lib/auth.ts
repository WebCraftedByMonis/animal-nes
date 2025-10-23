import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: "database" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    updateAge: 24 * 60 * 60, // Update session in DB every 24 hours
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 // 30 days in seconds
      }
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      checks: [],
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, user }: { session: any; user: any }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }: { user: any }) {
      // Send welcome email when a new user signs up for the first time
      console.log('🎉 New user created:', user.email);

      // Import the email service
      const { sendUserWelcomeEmail } = await import('./email-service');

      // Send welcome email in the background (non-blocking)
      sendUserWelcomeEmail(user).catch((error) => {
        console.error('Failed to send welcome email to user:', error);
      });
    },
  },
  // Note: No custom signIn page for regular users (Google OAuth)
  // The /login page is reserved for admin authentication only
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);