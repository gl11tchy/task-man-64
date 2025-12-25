/*
  # Create whiteboards table

  Stores tldraw whiteboard data per project.
  Each project has exactly one whiteboard.
*/

-- Create whiteboards table
CREATE TABLE IF NOT EXISTS whiteboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  document_snapshot jsonb NOT NULL DEFAULT '{}',
  session_snapshot jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whiteboards_project_id ON whiteboards(project_id);
CREATE INDEX IF NOT EXISTS idx_whiteboards_user_id ON whiteboards(user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_whiteboards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whiteboards_updated_at
  BEFORE UPDATE ON whiteboards
  FOR EACH ROW
  EXECUTE FUNCTION update_whiteboards_updated_at();
