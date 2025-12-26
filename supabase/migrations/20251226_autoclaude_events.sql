/*
  # Add AUTOCLAUDE Events table and project pause flag

  ## Overview
  Creates infrastructure for:
  - Tracking step-by-step progress of AUTOCLAUDE task processing
  - Pausing/resuming AUTOCLAUDE per project

  ## Schema Changes

  ### Projects table
  - `autoclaude_paused` (boolean, default true) - Whether AUTOCLAUDE processing is paused

  ### New Table: autoclaude_events
  - `id` (uuid, primary key) - Event ID
  - `task_id` (uuid, foreign key) - Associated task
  - `project_id` (uuid, foreign key) - Associated project
  - `event_type` (text) - Type of event
  - `message` (text) - Human-readable message
  - `metadata` (jsonb) - Additional context
  - `created_at` (timestamptz) - When the event occurred
  - `daemon_instance` (text) - Which daemon instance emitted this event
*/

-- Add autoclaude_paused to projects (default to paused for safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'autoclaude_paused'
  ) THEN
    ALTER TABLE projects ADD COLUMN autoclaude_paused BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Create autoclaude_events table
CREATE TABLE IF NOT EXISTS autoclaude_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  daemon_instance text
);

-- Enable RLS
ALTER TABLE autoclaude_events ENABLE ROW LEVEL SECURITY;

-- Policies for autoclaude_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'autoclaude_events' AND policyname = 'Allow read access for events'
  ) THEN
    CREATE POLICY "Allow read access for events"
      ON autoclaude_events FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'autoclaude_events' AND policyname = 'Allow insert for events'
  ) THEN
    CREATE POLICY "Allow insert for events"
      ON autoclaude_events FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'autoclaude_events' AND policyname = 'Allow delete for events'
  ) THEN
    CREATE POLICY "Allow delete for events"
      ON autoclaude_events FOR DELETE
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'autoclaude_events' AND policyname = 'Allow update for events'
  ) THEN
    CREATE POLICY "Allow update for events"
      ON autoclaude_events FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_autoclaude_events_project 
  ON autoclaude_events(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autoclaude_events_task 
  ON autoclaude_events(task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autoclaude_events_recent 
  ON autoclaude_events(created_at DESC);
