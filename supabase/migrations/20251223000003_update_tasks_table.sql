/*
  # Update tasks table for multi-project and kanban support

  Adds new columns for project association, kanban positioning, and task metadata.
*/

-- Add user_id column (simple string, not auth reference for Neon)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id text;

-- Add project and kanban columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS kanban_column_id uuid REFERENCES kanban_columns(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS kanban_position integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS backlog_position integer;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_in_backlog boolean DEFAULT true;

-- Add task metadata columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags text[];

-- Add constraint for priority values
ALTER TABLE tasks ADD CONSTRAINT IF NOT EXISTS valid_priority
  CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_kanban_column_id ON tasks(kanban_column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_in_backlog ON tasks(is_in_backlog);
