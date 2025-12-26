/*
  # Add service access for autoclaude daemon

  ## Overview
  The autoclaude daemon connects directly to PostgreSQL via DATABASE_URL,
  not through Supabase client authentication. It needs access to:
  - Read tasks with autoclaude_enabled = true
  - Update those tasks (claim, resolve, record errors)
  - Read projects to get repo_url for cloning

  ## Security Model
  - Only autoclaude-enabled tasks are accessible via these policies
  - Non-autoclaude tasks remain protected by user_id-based policies
  - This is acceptable because:
    1. Users explicitly opt-in tasks for autoclaude processing
    2. The daemon only needs access to tasks it's meant to process
    3. Regular user tasks remain private

  ## Changes
  1. Add RLS policies for tasks where autoclaude_enabled = true
  2. Enable RLS on projects table with public read access
*/

-- Allow any connection to read autoclaude-enabled tasks
-- This is needed for the daemon to poll for work
CREATE POLICY "Service can read autoclaude tasks"
  ON tasks FOR SELECT
  TO PUBLIC
  USING (autoclaude_enabled = true);

-- Allow any connection to update autoclaude-enabled tasks
-- This is needed for claiming, resolving, and error recording
CREATE POLICY "Service can update autoclaude tasks"
  ON tasks FOR UPDATE
  TO PUBLIC
  USING (autoclaude_enabled = true)
  WITH CHECK (autoclaude_enabled = true);

-- Enable RLS on projects table if not already enabled
-- The daemon needs to read projects to get repo_url
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'projects'
    AND rowsecurity = true
  ) THEN
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Allow reading projects for autoclaude operations
-- Projects don't contain sensitive data, and the daemon needs repo_url
CREATE POLICY "Service can read projects for autoclaude"
  ON projects FOR SELECT
  TO PUBLIC
  USING (true);
