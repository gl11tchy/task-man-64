/*
  # Create projects table

  Stores user projects for the multi-project kanban system.
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#ff00ff',
  description text,
  created_at timestamptz DEFAULT now(),
  is_archived boolean DEFAULT false,
  user_id text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
