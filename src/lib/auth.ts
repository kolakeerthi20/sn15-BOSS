import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import type { Adapter, AdapterUser } from 'next-auth/adapters';
import pool from '@/lib/db';
import type { UserRole } from '@/lib/types';

// ── Custom pg adapter ─────────────────────────────────────────

function toAdapterUser(row: Record<string, any>): AdapterUser {
  return {
    id:            row.id,
    name:          row.name,
    email:         row.email,
    emailVerified: row.email_verified ?? null,
    image:         row.image ?? null,
  };
}

function pgAdapter(): Adapter {
  return {
    async createUser(user) {
      const id = crypto.randomUUID();
      // Determine role at insert time so the JWT callback (which runs immediately after)
      // reads the correct role instead of the default EMPLOYEE.
      let role: UserRole = 'EMPLOYEE';
      if (user.email === process.env.ADMIN_EMAIL) {
        role = 'ADMIN';
      } else {
        const { rows: mapping } = await pool.query(
          `SELECT role FROM email_role_mappings WHERE email = $1`,
          [user.email],
        );
        if (mapping[0]) role = mapping[0].role as UserRole;
      }
      const { rows } = await pool.query(
        `INSERT INTO users (id, name, email, email_verified, image, role)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [id, user.name, user.email, user.emailVerified ?? null, user.image ?? null, role],
      );
      return toAdapterUser(rows[0]);
    },

    async getUser(id) {
      const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
      return rows[0] ? toAdapterUser(rows[0]) : null;
    },

    async getUserByEmail(email) {
      const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
      return rows[0] ? toAdapterUser(rows[0]) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const { rows } = await pool.query(
        `SELECT u.* FROM users u
         JOIN accounts a ON a.user_id = u.id
         WHERE a.provider = $1 AND a.provider_account_id = $2`,
        [provider, providerAccountId],
      );
      return rows[0] ? toAdapterUser(rows[0]) : null;
    },

    async updateUser({ id, ...data }) {
      const sets: string[] = [];
      const vals: any[]    = [];
      let i = 1;
      if (data.name           !== undefined) { sets.push(`name           = $${i++}`); vals.push(data.name); }
      if (data.email          !== undefined) { sets.push(`email          = $${i++}`); vals.push(data.email); }
      if (data.emailVerified  !== undefined) { sets.push(`email_verified = $${i++}`); vals.push(data.emailVerified); }
      if (data.image          !== undefined) { sets.push(`image          = $${i++}`); vals.push(data.image); }
      if (sets.length === 0) {
        const { rows } = await pool.query(`SELECT * FROM users WHERE id = $1`, [id]);
        return toAdapterUser(rows[0]);
      }
      vals.push(id);
      const { rows } = await pool.query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        vals,
      );
      return toAdapterUser(rows[0]);
    },

    async linkAccount(account) {
      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO accounts
           (id, user_id, type, provider, provider_account_id,
            refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (provider, provider_account_id) DO NOTHING`,
        [
          id, account.userId, account.type, account.provider, account.providerAccountId,
          account.refresh_token ?? null, account.access_token ?? null,
          account.expires_at   ?? null, account.token_type   ?? null,
          account.scope        ?? null, account.id_token     ?? null,
          account.session_state ?? null,
        ],
      );
    },

    // Session stubs — JWT strategy doesn't use these, but NextAuth calls them on some code paths
    async createSession({ sessionToken, userId, expires }) {
      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO sessions (id, session_token, user_id, expires) VALUES ($1,$2,$3,$4)`,
        [id, sessionToken, userId, expires],
      );
      return { sessionToken, userId, expires };
    },

    async getSessionAndUser(sessionToken) {
      const { rows } = await pool.query(
        `SELECT s.session_token, s.user_id, s.expires, u.*
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.session_token = $1 AND s.expires > NOW()`,
        [sessionToken],
      );
      if (!rows[0]) return null;
      return {
        session: { sessionToken: rows[0].session_token, userId: rows[0].user_id, expires: rows[0].expires },
        user: toAdapterUser(rows[0]),
      };
    },

    async updateSession({ sessionToken, expires }) {
      if (!expires) return null;
      const { rows } = await pool.query(
        `UPDATE sessions SET expires = $1 WHERE session_token = $2 RETURNING *`,
        [expires, sessionToken],
      );
      if (!rows[0]) return null;
      return { sessionToken: rows[0].session_token, userId: rows[0].user_id, expires: rows[0].expires };
    },

    async deleteSession(sessionToken) {
      await pool.query(`DELETE FROM sessions WHERE session_token = $1`, [sessionToken]);
    },

    async createVerificationToken({ identifier, token, expires }) {
      await pool.query(
        `INSERT INTO verification_tokens (identifier, token, expires) VALUES ($1,$2,$3)
         ON CONFLICT (identifier, token) DO NOTHING`,
        [identifier, token, expires],
      );
      return { identifier, token, expires };
    },

    async useVerificationToken({ identifier, token }) {
      const { rows } = await pool.query(
        `DELETE FROM verification_tokens WHERE identifier = $1 AND token = $2 RETURNING *`,
        [identifier, token],
      );
      return rows[0]
        ? { identifier: rows[0].identifier, token: rows[0].token, expires: rows[0].expires }
        : null;
    },
  };
}

// ── NextAuth config ───────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: pgAdapter(),

  trustHost: true,

  providers: [
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const { rows } = await pool.query(`SELECT id FROM users WHERE email = $1`, [user.email]);
      if (!rows[0]) {
        // New user — determine role; adapter will create the record, createUser event applies it
        let role: UserRole = 'EMPLOYEE';
        if (user.email === process.env.ADMIN_EMAIL) {
          role = 'ADMIN';
        } else {
          const { rows: mapping } = await pool.query(
            `SELECT role FROM email_role_mappings WHERE email = $1`,
            [user.email],
          );
          if (mapping[0]) role = mapping[0].role as UserRole;
        }
        (user as any)._initialRole = role;
      }
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        // First sign-in: prefer _initialRole to avoid race with createUser event
        // (createUser event updates DB role after the JWT is minted)
        const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [token.email!]);
        if (rows[0]) {
          token.id          = rows[0].id;
          token.role        = (user as any)._initialRole ?? rows[0].role;
          token.department  = rows[0].department  ?? undefined;
          token.designation = rows[0].designation ?? undefined;
        } else {
          token.id   = user.id;
          token.role = (user as any)._initialRole ?? 'EMPLOYEE';
        }
        token.roleRefreshedAt = Date.now();
      }

      if (trigger === 'update') {
        const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [token.email!]);
        if (rows[0]) {
          token.role        = rows[0].role;
          token.department  = rows[0].department  ?? undefined;
          token.designation = rows[0].designation ?? undefined;
        }
        token.roleRefreshedAt = Date.now();
      }

      // Refresh role from DB every hour so stale tokens self-correct
      const ONE_HOUR = 60 * 60 * 1000;
      if (!token.roleRefreshedAt || Date.now() - (token.roleRefreshedAt as number) > ONE_HOUR) {
        const { rows } = await pool.query(
          `SELECT role, department, designation FROM users WHERE email = $1`,
          [token.email!],
        );
        if (rows[0]) {
          token.role        = rows[0].role;
          token.department  = rows[0].department  ?? undefined;
          token.designation = rows[0].designation ?? undefined;
        }
        token.roleRefreshedAt = Date.now();
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id          = token.id          as string;
        session.user.role        = token.role        as UserRole;
        session.user.department  = token.department  as string | undefined;
        session.user.designation = token.designation as string | undefined;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  events: {
    async createUser({ user }) {
      if (!user.email) return;
      let role: UserRole = 'EMPLOYEE';
      if (user.email === process.env.ADMIN_EMAIL) {
        role = 'ADMIN';
      } else {
        const { rows } = await pool.query(
          `SELECT role FROM email_role_mappings WHERE email = $1`,
          [user.email],
        );
        if (rows[0]) role = rows[0].role as UserRole;
      }
      await pool.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, user.id]);
    },

    async signIn({ user }) {
      if (user.id) {
        await pool
          .query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id])
          .catch(() => {});
      }
    },
  },
});

// ── Session type augmentation ─────────────────────────────────

declare module 'next-auth' {
  interface Session {
    user: {
      id:           string;
      name?:        string | null;
      email?:       string | null;
      image?:       string | null;
      role:         UserRole;
      department?:  string;
      designation?: string;
    };
  }
}
