/*
  # Add user authentication support to tasks table

  ## Overview
  Updates the tasks table to support optional user authentication while maintaining
  compatibility with anonymous/local-only usage. Users can use the app without logging in
  (tasks stored in localStorage), or log in to sync tasks across devices.

  ## Changes

  ### Schema Updates
  1. Add `user_id` column (nullable uuid) to tasks table
     - Nullable to support anonymous users who don't log in
     - References auth.users for authenticated users
     - Indexed for performance

  ### Security Updates
  2. Drop existing public policies
  3. Create new conditional RLS policies:
     - Anonymous users: Can only access tasks where user_id IS NULL
     - Authenticated users: Can only access their own tasks (user_id = auth.uid())
  
  ## Migration Safety
  - Uses IF EXISTS/IF NOT EXISTS for idempotency
  - Adds column only if it doesn't exist
  - Preserves existing data
  - Backwards compatible with existing anonymous tasks

  ## Notes
  - Existing tasks will have user_id = NULL (anonymous)
  - New anonymous tasks will have user_id = NULL
  - Authenticated tasks will have user_id = auth.uid()
*/

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Drop old public policies
DROP POLICY IF EXISTS "Allow public read access" ON tasks;
DROP POLICY IF EXISTS "Allow public insert access" ON tasks;
DROP POLICY IF EXISTS "Allow public update access" ON tasks;
DROP POLICY IF EXISTS "Allow public delete access" ON tasks;

-- Create new policies for anonymous users (user_id IS NULL)
CREATE POLICY "Anonymous users can read anonymous tasks"
  ON tasks FOR SELECT
  TO anon
  USING (user_id IS NULL);

CREATE POLICY "Anonymous users can insert anonymous tasks"
  ON tasks FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Anonymous users can update anonymous tasks"
  ON tasks FOR UPDATE
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Anonymous users can delete anonymous tasks"
  ON tasks FOR DELETE
  TO anon
  USING (user_id IS NULL);

-- Create policies for authenticated users (own tasks only)
CREATE POLICY "Authenticated users can read own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert own tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can update own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authenticated users can delete own tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());