-- ============================================================
-- BOSS - Enterprise Project Management Platform
-- Complete Database Schema v1.0
-- PostgreSQL 16
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for full-text search

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'project_manager', 'team_lead', 'employee', 'client_viewer');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'invited');

CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived');
CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE project_health AS ENUM ('on_track', 'at_risk', 'off_track', 'unknown');

CREATE TYPE task_status AS ENUM ('not_started', 'in_progress', 'blocked', 'in_review', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE sprint_status AS ENUM ('planned', 'active', 'completed', 'cancelled');

CREATE TYPE log_status AS ENUM ('not_started', 'in_progress', 'blocked', 'completed', 'in_review');

CREATE TYPE notification_type AS ENUM (
  'task_assigned', 'task_updated', 'task_due_soon', 'task_overdue',
  'project_updated', 'daily_log_reminder', 'daily_log_submitted',
  'comment_mention', 'comment_reply', 'project_member_added',
  'milestone_reached', 'sprint_started', 'sprint_completed',
  'blocker_escalation', 'report_generated', 'system'
);
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'slack', 'push');

CREATE TYPE file_entity_type AS ENUM ('project', 'task', 'daily_log', 'comment', 'user');

CREATE TYPE activity_entity_type AS ENUM ('project', 'task', 'daily_log', 'user', 'resource', 'comment');
CREATE TYPE activity_action AS ENUM (
  'created', 'updated', 'deleted', 'status_changed', 'assigned',
  'unassigned', 'commented', 'mentioned', 'attached_file', 'removed_file',
  'progress_updated', 'deadline_changed', 'priority_changed', 'logged_time'
);

CREATE TYPE automation_trigger AS ENUM (
  'task_status_change', 'task_overdue', 'daily_log_missing',
  'blocker_duration_exceeded', 'project_health_changed',
  'sprint_completed', 'milestone_reached'
);
CREATE TYPE automation_action_type AS ENUM (
  'send_notification', 'change_status', 'assign_user',
  'create_task', 'send_email', 'send_slack'
);

-- ============================================================
-- TENANTS (Multi-tenant)
-- ============================================================

CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  domain        VARCHAR(255),
  plan          VARCHAR(50) NOT NULL DEFAULT 'starter',
  max_users     INTEGER NOT NULL DEFAULT 10,
  max_projects  INTEGER NOT NULL DEFAULT 5,
  logo_url      TEXT,
  settings      JSONB NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255),
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'employee',
  status          user_status NOT NULL DEFAULT 'active',
  department      VARCHAR(100),
  designation     VARCHAR(100),
  phone           VARCHAR(20),
  timezone        VARCHAR(50) NOT NULL DEFAULT 'UTC',
  skills          TEXT[] NOT NULL DEFAULT '{}',
  hourly_rate     DECIMAL(10,2),
  daily_capacity  DECIMAL(4,2) NOT NULL DEFAULT 8.0,
  is_billable     BOOLEAN NOT NULL DEFAULT true,
  manager_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  last_login_at   TIMESTAMPTZ,
  invited_at      TIMESTAMPTZ,
  joined_at       TIMESTAMPTZ,
  preferences     JSONB NOT NULL DEFAULT '{"theme":"light","notifications":{"email":true,"inApp":true},"dashboardLayout":"default"}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  user_agent  TEXT,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENTS
-- ============================================================

CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255),
  phone       VARCHAR(20),
  company     VARCHAR(255),
  address     TEXT,
  logo_url    TEXT,
  notes       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE projects (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id         UUID REFERENCES clients(id) ON DELETE SET NULL,
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  code              VARCHAR(20),
  status            project_status NOT NULL DEFAULT 'planning',
  priority          project_priority NOT NULL DEFAULT 'medium',
  health            project_health NOT NULL DEFAULT 'unknown',
  start_date        DATE,
  end_date          DATE,
  actual_end_date   DATE,
  budget            DECIMAL(15,2),
  budget_spent      DECIMAL(15,2) NOT NULL DEFAULT 0,
  completion_pct    DECIMAL(5,2) NOT NULL DEFAULT 0,
  estimated_hours   DECIMAL(10,2),
  logged_hours      DECIMAL(10,2) NOT NULL DEFAULT 0,
  color             VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  tags              TEXT[] NOT NULL DEFAULT '{}',
  is_template       BOOLEAN NOT NULL DEFAULT false,
  template_id       UUID REFERENCES projects(id) ON DELETE SET NULL,
  settings          JSONB NOT NULL DEFAULT '{}',
  created_by        UUID NOT NULL REFERENCES users(id),
  owner_id          UUID NOT NULL REFERENCES users(id),
  archived_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        VARCHAR(50) NOT NULL DEFAULT 'member',
  allocation  DECIMAL(5,2) NOT NULL DEFAULT 100,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at     TIMESTAMPTZ,
  added_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(project_id, user_id)
);

CREATE TABLE milestones (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  description    TEXT,
  due_date       DATE NOT NULL,
  completed_at   TIMESTAMPTZ,
  is_completed   BOOLEAN NOT NULL DEFAULT false,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SPRINTS
-- ============================================================

CREATE TABLE sprints (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  goal          TEXT,
  status        sprint_status NOT NULL DEFAULT 'planned',
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  velocity      DECIMAL(10,2),
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TASKS
-- ============================================================

CREATE TABLE tasks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sprint_id         UUID REFERENCES sprints(id) ON DELETE SET NULL,
  milestone_id      UUID REFERENCES milestones(id) ON DELETE SET NULL,
  parent_task_id    UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  status            task_status NOT NULL DEFAULT 'not_started',
  priority          task_priority NOT NULL DEFAULT 'medium',
  assignee_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  start_date        DATE,
  due_date          DATE,
  completed_at      TIMESTAMPTZ,
  estimated_hours   DECIMAL(10,2),
  logged_hours      DECIMAL(10,2) NOT NULL DEFAULT 0,
  progress_pct      DECIMAL(5,2) NOT NULL DEFAULT 0,
  story_points      INTEGER,
  labels            TEXT[] NOT NULL DEFAULT '{}',
  position          INTEGER NOT NULL DEFAULT 0,
  is_recurring      BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule   JSONB,
  custom_fields     JSONB NOT NULL DEFAULT '{}',
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_watchers (
  task_id   UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

CREATE TABLE task_dependencies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_id   UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) NOT NULL DEFAULT 'finish_to_start',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, depends_on_id),
  CHECK (task_id <> depends_on_id)
);

CREATE TABLE task_time_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hours       DECIMAL(10,2) NOT NULL,
  description TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  is_billable BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DAILY WORK LOGS
-- ============================================================

CREATE TABLE daily_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id        UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id           UUID REFERENCES tasks(id) ON DELETE SET NULL,
  log_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  status            log_status NOT NULL DEFAULT 'in_progress',
  work_done         TEXT NOT NULL,
  hours_spent       DECIMAL(10,2) NOT NULL DEFAULT 0,
  progress_pct      DECIMAL(5,2),
  blockers          TEXT,
  tomorrows_plan    TEXT,
  mood_score        INTEGER CHECK (mood_score BETWEEN 1 AND 5),
  is_submitted      BOOLEAN NOT NULL DEFAULT false,
  submitted_at      TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  review_notes      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, project_id, task_id, log_date)
);

-- ============================================================
-- COMMENTS
-- ============================================================

CREATE TABLE comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type   file_entity_type NOT NULL,
  entity_id     UUID NOT NULL,
  parent_id     UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  mentions      UUID[] NOT NULL DEFAULT '{}',
  is_edited     BOOLEAN NOT NULL DEFAULT false,
  edited_at     TIMESTAMPTZ,
  is_deleted    BOOLEAN NOT NULL DEFAULT false,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FILES & ATTACHMENTS
-- ============================================================

CREATE TABLE files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type   file_entity_type NOT NULL,
  entity_id     UUID NOT NULL,
  uploaded_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename      VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  size_bytes    BIGINT NOT NULL,
  storage_key   TEXT NOT NULL,
  storage_url   TEXT,
  version       INTEGER NOT NULL DEFAULT 1,
  parent_id     UUID REFERENCES files(id) ON DELETE SET NULL,
  is_deleted    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  type          notification_type NOT NULL,
  channel       notification_channel NOT NULL DEFAULT 'in_app',
  title         VARCHAR(500) NOT NULL,
  message       TEXT NOT NULL,
  entity_type   activity_entity_type,
  entity_id     UUID,
  metadata      JSONB NOT NULL DEFAULT '{}',
  is_read       BOOLEAN NOT NULL DEFAULT false,
  read_at       TIMESTAMPTZ,
  is_sent       BOOLEAN NOT NULL DEFAULT false,
  sent_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY LOG (Audit Trail)
-- ============================================================

CREATE TABLE activity_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type   activity_entity_type NOT NULL,
  entity_id     UUID NOT NULL,
  action        activity_action NOT NULL,
  old_values    JSONB,
  new_values    JSONB,
  metadata      JSONB NOT NULL DEFAULT '{}',
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RESOURCE ALLOCATION
-- ============================================================

CREATE TABLE resource_allocations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  allocated_hours DECIMAL(10,2) NOT NULL,
  allocation_pct  DECIMAL(5,2) NOT NULL DEFAULT 100,
  start_date      DATE NOT NULL,
  end_date        DATE,
  role_on_project VARCHAR(100),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUTOMATIONS
-- ============================================================

CREATE TABLE automations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  trigger_type    automation_trigger NOT NULL,
  trigger_config  JSONB NOT NULL DEFAULT '{}',
  action_type     automation_action_type NOT NULL,
  action_config   JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  run_count       INTEGER NOT NULL DEFAULT 0,
  last_run_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REPORTS (Saved report configurations)
-- ============================================================

CREATE TABLE saved_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  report_type   VARCHAR(100) NOT NULL,
  filters       JSONB NOT NULL DEFAULT '{}',
  columns       JSONB NOT NULL DEFAULT '[]',
  schedule      JSONB,
  is_public     BOOLEAN NOT NULL DEFAULT false,
  last_run_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CUSTOM FIELDS
-- ============================================================

CREATE TABLE custom_field_definitions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type   VARCHAR(50) NOT NULL,
  name          VARCHAR(100) NOT NULL,
  field_key     VARCHAR(100) NOT NULL,
  field_type    VARCHAR(50) NOT NULL,
  options       JSONB,
  is_required   BOOLEAN NOT NULL DEFAULT false,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, entity_type, field_key)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Users
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE INDEX idx_users_status ON users(status);

-- Projects
CREATE INDEX idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_end_date ON projects(end_date);

-- Project members
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- Tasks
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_sprint_id ON tasks(sprint_id);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Daily logs
CREATE INDEX idx_daily_logs_user_id ON daily_logs(user_id);
CREATE INDEX idx_daily_logs_project_id ON daily_logs(project_id);
CREATE INDEX idx_daily_logs_task_id ON daily_logs(task_id);
CREATE INDEX idx_daily_logs_log_date ON daily_logs(log_date);
CREATE INDEX idx_daily_logs_tenant_id ON daily_logs(tenant_id);
CREATE INDEX idx_daily_logs_is_submitted ON daily_logs(is_submitted);

-- Notifications
CREATE INDEX idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);

-- Activity logs
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_actor_id ON activity_logs(actor_id);
CREATE INDEX idx_activity_logs_tenant_id ON activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Comments
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_author_id ON comments(author_id);

-- Resource allocations
CREATE INDEX idx_resource_allocations_user_id ON resource_allocations(user_id);
CREATE INDEX idx_resource_allocations_project_id ON resource_allocations(project_id);

-- Time entries
CREATE INDEX idx_task_time_entries_task_id ON task_time_entries(task_id);
CREATE INDEX idx_task_time_entries_user_id ON task_time_entries(user_id);
CREATE INDEX idx_task_time_entries_date ON task_time_entries(date);

-- Full-text search indexes
CREATE INDEX idx_tasks_title_trgm ON tasks USING gin(title gin_trgm_ops);
CREATE INDEX idx_projects_name_trgm ON projects USING gin(name gin_trgm_ops);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenants', 'users', 'clients', 'projects', 'project_members',
    'milestones', 'sprints', 'tasks', 'daily_logs', 'comments',
    'resource_allocations', 'automations', 'saved_reports'
  ] LOOP
    EXECUTE format('
      CREATE TRIGGER trg_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t);
  END LOOP;
END $$;

-- ============================================================
-- FUNCTION: auto-update project completion %
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_project_completion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET
    completion_pct = COALESCE((
      SELECT AVG(progress_pct)
      FROM tasks
      WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
        AND status != 'cancelled'
    ), 0),
    logged_hours = COALESCE((
      SELECT SUM(hours)
      FROM task_time_entries tte
      JOIN tasks t ON t.id = tte.task_id
      WHERE t.project_id = COALESCE(NEW.project_id, OLD.project_id)
    ), 0)
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_completion_update
AFTER INSERT OR UPDATE OF progress_pct, status ON tasks
FOR EACH ROW EXECUTE FUNCTION recalculate_project_completion();

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_project_summary AS
SELECT
  p.id,
  p.tenant_id,
  p.name,
  p.code,
  p.status,
  p.priority,
  p.health,
  p.start_date,
  p.end_date,
  p.completion_pct,
  p.budget,
  p.budget_spent,
  p.estimated_hours,
  p.logged_hours,
  p.color,
  p.tags,
  c.name AS client_name,
  u.first_name || ' ' || u.last_name AS owner_name,
  u.avatar_url AS owner_avatar,
  COUNT(DISTINCT pm.user_id) AS team_size,
  COUNT(DISTINCT t.id) AS total_tasks,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') AS completed_tasks,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'blocked') AS blocked_tasks,
  COUNT(DISTINCT t.id) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status NOT IN ('completed', 'cancelled')) AS overdue_tasks,
  p.created_at,
  p.updated_at
FROM projects p
LEFT JOIN clients c ON c.id = p.client_id
LEFT JOIN users u ON u.id = p.owner_id
LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.left_at IS NULL
LEFT JOIN tasks t ON t.project_id = p.id AND t.parent_task_id IS NULL
WHERE p.archived_at IS NULL
GROUP BY p.id, c.name, u.first_name, u.last_name, u.avatar_url;

CREATE OR REPLACE VIEW v_resource_utilization AS
SELECT
  u.id AS user_id,
  u.tenant_id,
  u.first_name || ' ' || u.last_name AS full_name,
  u.email,
  u.department,
  u.designation,
  u.avatar_url,
  u.daily_capacity,
  COUNT(DISTINCT pm.project_id) AS active_projects,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('not_started', 'in_progress')) AS active_tasks,
  COALESCE(SUM(tte.hours) FILTER (WHERE tte.date >= CURRENT_DATE - INTERVAL '7 days'), 0) AS hours_last_7_days,
  COALESCE(SUM(tte.hours) FILTER (WHERE tte.date >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS hours_this_month,
  COALESCE(
    ROUND(
      SUM(tte.hours) FILTER (WHERE tte.date >= CURRENT_DATE - INTERVAL '7 days') /
      NULLIF(u.daily_capacity * 5, 0) * 100, 1
    ), 0
  ) AS utilization_pct_week
FROM users u
LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.left_at IS NULL
LEFT JOIN tasks t ON t.assignee_id = u.id
LEFT JOIN task_time_entries tte ON tte.user_id = u.id
WHERE u.status = 'active'
GROUP BY u.id;

CREATE OR REPLACE VIEW v_daily_log_status AS
SELECT
  dl.user_id,
  dl.tenant_id,
  u.first_name || ' ' || u.last_name AS full_name,
  u.email,
  u.department,
  dl.log_date,
  dl.project_id,
  p.name AS project_name,
  dl.task_id,
  t.title AS task_title,
  dl.status,
  dl.work_done,
  dl.hours_spent,
  dl.progress_pct,
  dl.blockers,
  dl.is_submitted,
  dl.submitted_at,
  CASE
    WHEN dl.is_submitted THEN 'submitted'
    WHEN dl.log_date < CURRENT_DATE THEN 'missing'
    ELSE 'pending'
  END AS log_state
FROM daily_logs dl
JOIN users u ON u.id = dl.user_id
LEFT JOIN projects p ON p.id = dl.project_id
LEFT JOIN tasks t ON t.id = dl.task_id;
