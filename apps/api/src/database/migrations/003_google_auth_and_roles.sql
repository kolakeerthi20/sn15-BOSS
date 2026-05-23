-- ============================================================
-- Migration 003: Google OAuth + Custom Org Roles
-- ============================================================

-- 1. Add new role values (rename old enum, create new one)
ALTER TYPE user_role RENAME TO user_role_old;

CREATE TYPE user_role AS ENUM (
  'project_manager',
  'lead',
  'senior_developer',
  'intern',
  'pending'          -- newly signed-up, awaiting role assignment
);

-- 2. Update users table to use new enum
ALTER TABLE users
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE users
  ALTER COLUMN role TYPE user_role
  USING CASE
    WHEN role::text = 'admin'           THEN 'project_manager'::user_role
    WHEN role::text = 'project_manager' THEN 'project_manager'::user_role
    WHEN role::text = 'team_lead'       THEN 'lead'::user_role
    WHEN role::text = 'employee'        THEN 'senior_developer'::user_role
    WHEN role::text = 'client_viewer'   THEN 'intern'::user_role
    ELSE 'intern'::user_role
  END;

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'pending';

DROP TYPE user_role_old;

-- 3. Add Google OAuth columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id      VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email   VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_picture TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider  VARCHAR(20)  NOT NULL DEFAULT 'local';
-- auth_provider: 'local' | 'google'

-- 4. Role assignment audit table
CREATE TABLE IF NOT EXISTS role_assignments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_role      user_role,
  new_role      user_role NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_assignments_user_id    ON role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_tenant_id  ON role_assignments(tenant_id);

-- 5. Update seed users roles to match new enum
UPDATE users SET
  role          = 'project_manager',
  auth_provider = 'local'
WHERE email IN ('admin@acme.com', 'pm@acme.com');

UPDATE users SET
  role          = 'lead',
  auth_provider = 'local'
WHERE email = 'lead@acme.com';

UPDATE users SET
  role          = 'senior_developer',
  auth_provider = 'local'
WHERE email IN ('dev1@acme.com', 'dev2@acme.com');

UPDATE users SET
  role          = 'intern',
  auth_provider = 'local'
WHERE email IN ('designer@acme.com', 'qa@acme.com');

-- 6. Unique index for google_id (only when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
  ON users(google_id) WHERE google_id IS NOT NULL;
