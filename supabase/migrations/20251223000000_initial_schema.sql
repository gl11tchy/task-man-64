/*
  # Initial Neon Database Schema

  Creates the complete schema for the task manager app.
  This is a clean migration for Neon (without Supabase-specific RLS).
*/

-- ============ PROJECTS TABLE ============
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#ff00ff',
  description text,
  created_at timestamptz DEFAULT now(),
  is_archived boolean DEFAULT false,
  user_id text
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- ============ KANBAN COLUMNS TABLE ============
CREATE TABLE IF NOT EXISTS kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#718096',
  position integer NOT NULL DEFAULT 0,
  is_done_column boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_kanban_columns_project_id ON kanban_columns(project_id);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_position ON kanban_columns(position);

-- ============ TASKS TABLE ============
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  status text NOT NULL DEFAULT 'todo',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  user_id text,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  kanban_column_id uuid REFERENCES kanban_columns(id) ON DELETE SET NULL,
  kanban_position integer,
  backlog_position integer,
  is_in_backlog boolean DEFAULT true,
  due_date timestamptz,
  priority text,
  tags text[],
  CONSTRAINT valid_status CHECK (status IN ('todo', 'completed')),
  CONSTRAINT valid_priority CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_kanban_column_id ON tasks(kanban_column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_in_backlog ON tasks(is_in_backlog);
