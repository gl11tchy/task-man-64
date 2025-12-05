/*
  # Create tasks table for Workstation app

  ## Overview
  Creates a table to store user tasks with their status and timestamps.
  This table supports the arcade-style task manager interface.

  ## New Tables
  
  ### `tasks`
  - `id` (uuid, primary key) - Unique identifier for each task
  - `text` (text, required) - The task description/content
  - `status` (text, required) - Task status: 'todo' or 'completed'
  - `created_at` (timestamptz) - When the task was created
  - `completed_at` (timestamptz, nullable) - When the task was completed
  
  ## Security
  
  - Enable Row Level Security (RLS) on the tasks table
  - Add policy to allow public read access (SELECT)
  - Add policy to allow public insert access (INSERT)
  - Add policy to allow public update access (UPDATE)
  - Add policy to allow public delete access (DELETE)
  
  Note: Public access is appropriate for this personal productivity app
  without authentication. For multi-user scenarios, these policies would
  need to check user authentication and ownership.
  
  ## Indexes
  
  - Index on status for filtering active vs completed tasks
  - Index on created_at for ordering tasks
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  status text NOT NULL DEFAULT 'todo',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('todo', 'completed'))
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access"
  ON tasks FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access"
  ON tasks FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update access"
  ON tasks FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access"
  ON tasks FOR DELETE
  TO anon
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);