-- ============================================================
-- BOSS - Seed Data for Development
-- ============================================================

-- Insert demo tenant
INSERT INTO tenants (id, name, slug, plan, max_users, max_projects)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme Corporation',
  'acme',
  'enterprise',
  100,
  50
);

-- Insert demo users (password: Password@123 for all)
-- bcrypt hash of 'Password@123'
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, status, department, designation, daily_capacity) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001',
   'admin@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.DGem',
   'Admin', 'User', 'admin', 'active', 'Engineering', 'System Administrator', 8),

  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
   'pm@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.DGem',
   'Sarah', 'Johnson', 'project_manager', 'active', 'Engineering', 'Senior Project Manager', 8),

  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001',
   'lead@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.DGem',
   'Mike', 'Chen', 'team_lead', 'active', 'Engineering', 'Tech Lead', 8),

  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001',
   'dev1@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.DGem',
   'Alex', 'Rivera', 'employee', 'active', 'Engineering', 'Senior Developer', 8),

  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001',
   'dev2@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.DGem',
   'Jordan', 'Smith', 'employee', 'active', 'Engineering', 'Full Stack Developer', 8),

  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001',
   'designer@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.DGem',
   'Emma', 'Davis', 'employee', 'active', 'Design', 'UI/UX Designer', 8),

  ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001',
   'qa@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.DGem',
   'Chris', 'Wilson', 'employee', 'active', 'QA', 'QA Engineer', 8);

-- Insert client
INSERT INTO clients (id, tenant_id, name, email, company, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000001',
  'TechStartup Inc',
  'contact@techstartup.com',
  'TechStartup Inc',
  '00000000-0000-0000-0000-000000000011'
);

-- Insert sample projects
INSERT INTO projects (id, tenant_id, client_id, name, description, code, status, priority, health, start_date, end_date, budget, estimated_hours, color, created_by, owner_id) VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000020',
   'E-Commerce Platform Redesign', 'Complete overhaul of the existing e-commerce platform with modern UI/UX',
   'ECP-001', 'active', 'high', 'at_risk',
   CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days',
   150000, 800,
   '#6366f1', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011'),

  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001',
   NULL,
   'Internal CRM System', 'Building internal CRM for sales team',
   'CRM-001', 'active', 'medium', 'on_track',
   CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '90 days',
   80000, 400,
   '#10b981', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012');

-- Add project members
INSERT INTO project_members (project_id, user_id, role, allocation) VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000011', 'manager', 50),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000012', 'lead', 100),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000013', 'developer', 100),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000014', 'developer', 80),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000015', 'designer', 100),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000016', 'qa', 60),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000012', 'manager', 50),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000013', 'developer', 0),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000014', 'developer', 20);

-- Insert sprint
INSERT INTO sprints (id, project_id, name, goal, status, start_date, end_date, created_by) VALUES
  ('00000000-0000-0000-0000-000000000040',
   '00000000-0000-0000-0000-000000000030',
   'Sprint 1 - Foundation',
   'Setup core architecture and design system',
   'active',
   CURRENT_DATE - INTERVAL '7 days',
   CURRENT_DATE + INTERVAL '7 days',
   '00000000-0000-0000-0000-000000000012');

-- Insert tasks
INSERT INTO tasks (id, tenant_id, project_id, sprint_id, title, description, status, priority, assignee_id, reporter_id, due_date, estimated_hours, progress_pct, labels, position, created_by) VALUES
  ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000040',
   'Setup Next.js project with TypeScript', 'Initialize the frontend project with proper configuration',
   'completed', 'high', '00000000-0000-0000-0000-000000000013',
   '00000000-0000-0000-0000-000000000012',
   CURRENT_DATE - INTERVAL '2 days', 8, 100, ARRAY['frontend', 'setup'], 1,
   '00000000-0000-0000-0000-000000000012'),

  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000040',
   'Design system implementation', 'Create reusable component library with design tokens',
   'in_progress', 'high', '00000000-0000-0000-0000-000000000015',
   '00000000-0000-0000-0000-000000000012',
   CURRENT_DATE + INTERVAL '3 days', 24, 60, ARRAY['design', 'frontend'], 2,
   '00000000-0000-0000-0000-000000000012'),

  ('00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000040',
   'API integration layer', 'Build API client and data fetching infrastructure',
   'in_progress', 'high', '00000000-0000-0000-0000-000000000014',
   '00000000-0000-0000-0000-000000000012',
   CURRENT_DATE + INTERVAL '2 days', 16, 40, ARRAY['backend', 'api'], 3,
   '00000000-0000-0000-0000-000000000012'),

  ('00000000-0000-0000-0000-000000000053', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000040',
   'User authentication flow', 'Implement login, register, password reset flows',
   'blocked', 'critical', '00000000-0000-0000-0000-000000000013',
   '00000000-0000-0000-0000-000000000012',
   CURRENT_DATE + INTERVAL '1 day', 20, 30, ARRAY['auth', 'backend'], 4,
   '00000000-0000-0000-0000-000000000012'),

  ('00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000030', NULL,
   'Write test cases for auth module', 'Unit and integration tests',
   'not_started', 'medium', '00000000-0000-0000-0000-000000000016',
   '00000000-0000-0000-0000-000000000012',
   CURRENT_DATE + INTERVAL '5 days', 12, 0, ARRAY['testing', 'qa'], 5,
   '00000000-0000-0000-0000-000000000012');

-- Insert daily logs
INSERT INTO daily_logs (user_id, tenant_id, project_id, task_id, log_date, status, work_done, hours_spent, progress_pct, blockers, tomorrows_plan, is_submitted, submitted_at) VALUES
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000052',
   CURRENT_DATE, 'in_progress',
   'Worked on API client setup and authentication interceptors. Completed axios instance configuration with token refresh logic.',
   6.5, 40, 'Waiting for backend API endpoints to be finalized', 'Continue with task CRUD endpoints integration',
   true, NOW() - INTERVAL '2 hours'),

  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000051',
   CURRENT_DATE, 'in_progress',
   'Completed Button, Input, Card, Badge components with dark mode support. Started on Modal component.',
   7, 60, NULL, 'Finish Modal and Dropdown components tomorrow',
   true, NOW() - INTERVAL '1 hour');
