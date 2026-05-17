import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getUserByEmail, createUser, initDb } from './db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' },
        action: { label: 'Action', type: 'text' },
      },
      async authorize(credentials) {
        initDb();
        const { email, password, name, action } = credentials as {
          email: string; password: string; name?: string; action?: string;
        };

        if (!email || !password) return null;

        if (action === 'register') {
          const existing = getUserByEmail(email);
          if (existing) return null;
          const hash = await bcrypt.hash(password, 10);
          const user = createUser(email, name || email.split('@')[0], hash);
          return { id: String(user.id), email: user.email, name: user.name };
        }

        // Login
        const user = getUserByEmail(email);
        if (!user || !user.password_hash) return null;
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;
        return { id: String(user.id), email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.email = user.email as string;
        token.name = user.name as string;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth',
  },
});
