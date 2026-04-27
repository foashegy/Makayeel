import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/nodemailer';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@makayeel/db';

const providers: NonNullable<NextAuthConfig['providers']> = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
  providers.push(
    EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: 'database' },
  pages: {
    signIn: '/ar/login',
    verifyRequest: '/ar/login?verify=1',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Attach role + locale for convenience.
        // @ts-expect-error — extending session user shape.
        session.user.role = (user as unknown as { role?: 'USER' | 'ADMIN' }).role ?? 'USER';
        // @ts-expect-error
        session.user.locale = (user as unknown as { locale?: 'ar' | 'en' }).locale ?? 'ar';
      }
      return session;
    },
  },
  trustHost: true,
});

// Helper for server components / route handlers.
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error('UNAUTHORIZED');
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  // @ts-expect-error — extended session user has `role`.
  if (session.user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  return session;
}
