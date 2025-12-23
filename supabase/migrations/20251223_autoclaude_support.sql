/*
  # Add AUTOCLAUDE support to tasks and projects

  ## Overview
  Adds fields needed for the AUTOCLAUDE autonomous agent daemon to:
  - Track which repository a project targets
  - Enable/disable autoclaude per task
  - Track PR URLs, feedback, and claim state

  ## Schema Changes

  ### Projects table
  - `repo_url` (text, nullable) - GitHub repository URL for this project

  ### Tasks table
  - `pr_url` (text, nullable) - URL of the PR created by autoclaude
  - `feedback` (text, nullable) - Reviewer feedback when task is kicked back
  - `claimed_at` (timestamptz, nullable) - When the daemon claimed this task
  - `claimed_by` (text, nullable) - Daemon instance ID that claimed the task
  - `autoclaude_enabled` (boolean, default false) - Whether autoclaude can work on this task
  - `attempt_count` (integer, default 0) - Number of times autoclaude has attempted this task
  - `last_error` (text, nullable) - Last error message from autoclaude

  ## Indexes
  - Index for daemon polling on tasks(kanban_column_id, autoclaude_enabled, claimed_at)
*/

-- Add repo_url to projects (which repo this project targets)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'repo_url'
  ) THEN
    ALTER TABLE projects ADD COLUMN repo_url TEXT;
  END IF;
END $$;

-- Add autoclaude fields to tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'pr_url'
  ) THEN
    ALTER TABLE tasks ADD COLUMN pr_url TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'feedback'
  ) THEN
    ALTER TABLE tasks ADD COLUMN feedback TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN claimed_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'claimed_by'
  ) THEN
    ALTER TABLE tasks ADD COLUMN claimed_by TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'autoclaude_enabled'
  ) THEN
    ALTER TABLE tasks ADD COLUMN autoclaude_enabled BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'attempt_count'
  ) THEN
    ALTER TABLE tasks ADD COLUMN attempt_count INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'last_error'
  ) THEN
    ALTER TABLE tasks ADD COLUMN last_error TEXT;
  END IF;
END $$;

-- Index for daemon polling
CREATE INDEX IF NOT EXISTS idx_tasks_autoclaude_poll
ON tasks(kanban_column_id, autoclaude_enabled, claimed_at);
