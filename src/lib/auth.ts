import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/db';
import type { UserRole } from '@prisma/client';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  // Use JWT sessions so we can embed role in the token
  session: { strategy: 'jwt' },

  callbacks: {
    // Called when a user signs in for the first time or on subsequent sign-ins
    async signIn({ user, account }) {
      if (!user.email) return false;

      // On first sign-in, set role from EmailRoleMapping or ADMIN_EMAIL env var
      const existing = await prisma.user.findUnique({ where: { email: user.email } });

      if (!existing) {
        // Determine role for new user
        let role: UserRole = 'EMPLOYEE';

        // Check admin bootstrap env var
        if (user.email === process.env.ADMIN_EMAIL) {
          role = 'ADMIN';
        } else {
          // Check email-role mapping table (pre-assigned by admin)
          const mapping = await prisma.emailRoleMapping.findUnique({
            where: { email: user.email },
          });
          if (mapping) role = mapping.role;
        }

        // NextAuth adapter creates the user record — we update role immediately after
        // (adapter runs after this callback, so we schedule an update)
        // We store role in the token via JWT callback below
        (user as any)._initialRole = role;
      }

      return true;
    },

    // Embed role (and our internal userId) into the JWT
    async jwt({ token, user, trigger }) {
      if (user) {
        // First sign-in: user object is available
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.department = dbUser.department ?? undefined;
          token.designation = dbUser.designation ?? undefined;
        } else {
          // User not yet created by adapter — will be on next request
          const initialRole = (user as any)._initialRole ?? 'EMPLOYEE';
          token.id = user.id;
          token.role = initialRole;
        }
      }

      if (trigger === 'update') {
        // Re-fetch latest role from DB on session update
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.department = dbUser.department ?? undefined;
          token.designation = dbUser.designation ?? undefined;
        }
      }

      return token;
    },

    // Expose role + id in the client-visible session object
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.department = token.department as string | undefined;
        session.user.designation = token.designation as string | undefined;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  events: {
    // After the adapter creates the user, apply the role from mapping
    async createUser({ user }) {
      if (!user.email) return;

      let role: UserRole = 'EMPLOYEE';

      if (user.email === process.env.ADMIN_EMAIL) {
        role = 'ADMIN';
      } else {
        const mapping = await prisma.emailRoleMapping.findUnique({
          where: { email: user.email },
        });
        if (mapping) role = mapping.role;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { role },
      });
    },

    async signIn({ user }) {
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => {}); // silently ignore if user not yet committed
      }
    },
  },
});

// Extend next-auth types to include our custom fields
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      department?: string;
      designation?: string;
    };
  }
}

