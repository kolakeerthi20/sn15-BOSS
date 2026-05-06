-- ============================================================
-- BOSS Platform — PostgreSQL Schema
-- Run once against a fresh database: psql $DATABASE_URL -f sql/schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────
CREATE TYPE user_role         AS ENUM ('ADMIN','PROJECT_MANAGER','TEAM_LEAD','EMPLOYEE','CLIENT_VIEWER');
CREATE TYPE skill_level       AS ENUM ('BEGINNER','INTERMEDIATE','ADVANCED','EXPERT');
CREATE TYPE project_status    AS ENUM ('PLANNING','ACTIVE','ON_HOLD','AT_RISK','COMPLETED','CANCELLED');
CREATE TYPE priority          AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE risk_level        AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE member_role       AS ENUM ('LEAD','MEMBER','REVIEWER','OBSERVER');
CREATE TYPE milestone_status  AS ENUM ('PENDING','COMPLETED','MISSED');
CREATE TYPE sprint_status     AS ENUM ('PLANNING','ACTIVE','COMPLETED');
CREATE TYPE task_status       AS ENUM ('NOT_STARTED','IN_PROGRESS','BLOCKED','IN_REVIEW','COMPLETED');
CREATE TYPE log_status        AS ENUM ('NOT_STARTED','IN_PROGRESS','BLOCKED','IN_REVIEW','COMPLETED');
CREATE TYPE notification_type AS ENUM (
  'TASK_ASSIGNED','COMMENT_MENTION','TASK_OVERDUE','DAILY_LOG_REMINDER',
  'PROJECT_UPDATE','BLOCKER_ESCALATION','APPROVAL_NEEDED','STATUS_CHANGED','DEADLINE_APPROACHING'
);

-- ── updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ── NextAuth tables ──────────────────────────────────────────
CREATE TABLE users (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name            TEXT,
  email           TEXT        UNIQUE NOT NULL,
  email_verified  TIMESTAMPTZ,
  image           TEXT,
  role            user_role   NOT NULL DEFAULT 'EMPLOYEE',
  department      TEXT,
  designation     TEXT,
  billable_rate   NUMERIC(10,2),
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE accounts (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,
  provider            TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          BIGINT,
  token_type          TEXT,
  scope               TEXT,
  id_token            TEXT,
  session_state       TEXT,
  UNIQUE(provider, provider_account_id)
);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);

CREATE TABLE sessions (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_token TEXT        UNIQUE NOT NULL,
  user_id       TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       TIMESTAMPTZ NOT NULL
);

CREATE TABLE verification_tokens (
  identifier TEXT        NOT NULL,
  token      TEXT        NOT NULL,
  expires    TIMESTAMPTZ NOT NULL,
  UNIQUE(identifier, token)
);

-- ── Role management ──────────────────────────────────────────
CREATE TABLE email_role_mappings (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email      TEXT        UNIQUE NOT NULL,
  role       user_role   NOT NULL DEFAULT 'EMPLOYEE',
  created_by TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_erm_email ON email_role_mappings(email);
CREATE TRIGGER trg_erm_updated_at
  BEFORE UPDATE ON email_role_mappings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── User skills ──────────────────────────────────────────────
CREATE TABLE user_skills (
  id      TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill   TEXT        NOT NULL,
  level   skill_level NOT NULL DEFAULT 'INTERMEDIATE',
  UNIQUE(user_id, skill)
);

-- ── Projects ─────────────────────────────────────────────────
CREATE TABLE projects (
  id                TEXT           PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name              TEXT           NOT NULL,
  description       TEXT,
  client            TEXT,
  manager_id        TEXT           NOT NULL REFERENCES users(id),
  status            project_status NOT NULL DEFAULT 'PLANNING',
  priority          priority       NOT NULL DEFAULT 'MEDIUM',
  start_date        TIMESTAMPTZ    NOT NULL,
  end_date          TIMESTAMPTZ    NOT NULL,
  budget            NUMERIC(12,2),
  spent_budget      NUMERIC(12,2)  NOT NULL DEFAULT 0,
  completion_percent INT           NOT NULL DEFAULT 0,
  health_score      INT            NOT NULL DEFAULT 100,
  risk_level        risk_level     NOT NULL DEFAULT 'LOW',
  is_archived       BOOLEAN        NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_projects_status     ON projects(status);
CREATE INDEX idx_projects_manager_id ON projects(manager_id);
CREATE INDEX idx_projects_end_date   ON projects(end_date);
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE project_members (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       member_role NOT NULL DEFAULT 'MEMBER',
  allocation INT         NOT NULL DEFAULT 100,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at    TIMESTAMPTZ,
  UNIQUE(project_id, user_id)
);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

CREATE TABLE project_tags (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag        TEXT NOT NULL,
  UNIQUE(project_id, tag)
);

-- ── Milestones & Sprints ─────────────────────────────────────
CREATE TABLE milestones (
  id           TEXT             PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id   TEXT             NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title        TEXT             NOT NULL,
  description  TEXT,
  due_date     TIMESTAMPTZ      NOT NULL,
  completed_at TIMESTAMPTZ,
  status       milestone_status NOT NULL DEFAULT 'PENDING',
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_milestones_project_due ON milestones(project_id, due_date);

CREATE TABLE sprints (
  id         TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id TEXT          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT          NOT NULL,
  goal       TEXT,
  start_date TIMESTAMPTZ   NOT NULL,
  end_date   TIMESTAMPTZ   NOT NULL,
  status     sprint_status NOT NULL DEFAULT 'PLANNING',
  velocity   INT           NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sprints_project_status ON sprints(project_id, status);

-- ── Tasks ────────────────────────────────────────────────────
CREATE TABLE tasks (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id       TEXT        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id     TEXT        REFERENCES milestones(id),
  sprint_id        TEXT        REFERENCES sprints(id),
  title            TEXT        NOT NULL,
  description      TEXT,
  assignee_id      TEXT        NOT NULL REFERENCES users(id),
  reporter_id      TEXT        NOT NULL REFERENCES users(id),
  status           task_status NOT NULL DEFAULT 'NOT_STARTED',
  priority         priority    NOT NULL DEFAULT 'MEDIUM',
  start_date       TIMESTAMPTZ,
  due_date         TIMESTAMPTZ,
  estimated_hours  NUMERIC(8,2) NOT NULL DEFAULT 0,
  actual_hours     NUMERIC(8,2) NOT NULL DEFAULT 0,
  progress_percent INT         NOT NULL DEFAULT 0,
  position         INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tasks_project_status  ON tasks(project_id, status);
CREATE INDEX idx_tasks_assignee_status ON tasks(assignee_id, status);
CREATE INDEX idx_tasks_due_date        ON tasks(due_date);
CREATE INDEX idx_tasks_sprint_id       ON tasks(sprint_id);
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE subtasks (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id      TEXT        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  completed    BOOLEAN     NOT NULL DEFAULT false,
  assignee_id  TEXT,
  position     INT         NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_tags (
  id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  UNIQUE(task_id, tag)
);

CREATE TABLE task_dependencies (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id      TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  UNIQUE(task_id, depends_on_id)
);

CREATE TABLE task_watchers (
  id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  UNIQUE(task_id, user_id)
);

-- ── Daily logs ───────────────────────────────────────────────
CREATE TABLE daily_logs (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id          TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id       TEXT        NOT NULL REFERENCES projects(id),
  task_id          TEXT        REFERENCES tasks(id),
  date             DATE        NOT NULL,
  status           log_status  NOT NULL DEFAULT 'IN_PROGRESS',
  summary          TEXT        NOT NULL,
  hours_worked     NUMERIC(5,2) NOT NULL DEFAULT 0,
  blockers         TEXT,
  tomorrow_plan    TEXT,
  progress_percent INT         NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_daily_logs_user_date    ON daily_logs(user_id, date);
CREATE INDEX idx_daily_logs_project_date ON daily_logs(project_id, date);
CREATE TRIGGER trg_daily_logs_updated_at
  BEFORE UPDATE ON daily_logs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE log_deliverables (
  id     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  log_id TEXT NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  title  TEXT NOT NULL
);

-- ── Time tracking ────────────────────────────────────────────
CREATE TABLE time_entries (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id     TEXT        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL,
  ended_at    TIMESTAMPTZ,
  hours       NUMERIC(8,2) NOT NULL DEFAULT 0,
  is_billable BOOLEAN     NOT NULL DEFAULT true,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_time_entries_user_started ON time_entries(user_id, started_at);
CREATE INDEX idx_time_entries_task_id      ON time_entries(task_id);

-- ── Collaboration ────────────────────────────────────────────
CREATE TABLE comments (
  id         TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content    TEXT        NOT NULL,
  author_id  TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id    TEXT        REFERENCES tasks(id) ON DELETE CASCADE,
  project_id TEXT        REFERENCES projects(id),
  parent_id  TEXT        REFERENCES comments(id),
  is_edited  BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comments_task_id    ON comments(task_id);
CREATE INDEX idx_comments_project_id ON comments(project_id);
CREATE INDEX idx_comments_author_id  ON comments(author_id);
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE mentions (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  UNIQUE(comment_id, user_id)
);

CREATE TABLE attachments (
  id             TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name           TEXT        NOT NULL,
  url            TEXT        NOT NULL,
  size           INT         NOT NULL,
  mime_type      TEXT        NOT NULL,
  uploaded_by_id TEXT        NOT NULL,
  task_id        TEXT        REFERENCES tasks(id) ON DELETE CASCADE,
  log_id         TEXT        REFERENCES daily_logs(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attachments_task_id ON attachments(task_id);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE notifications (
  id         TEXT              PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id    TEXT              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT              NOT NULL,
  message    TEXT              NOT NULL,
  link       TEXT,
  is_read    BOOLEAN           NOT NULL DEFAULT false,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created   ON notifications(created_at);

-- ── Audit log ────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT        NOT NULL REFERENCES users(id),
  project_id  TEXT        REFERENCES projects(id),
  task_id     TEXT        REFERENCES tasks(id),
  action      TEXT        NOT NULL,
  entity_type TEXT        NOT NULL,
  entity_id   TEXT        NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_entity  ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user    ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_project ON audit_logs(project_id, created_at);
