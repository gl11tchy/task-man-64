export interface Task {
  id: string;
  text: string;
  status: string;
  project_id: string;
  kanban_column_id: string | null;
  pr_url: string | null;
  feedback: string | null;
  claimed_at: string | null;
  claimed_by: string | null;
  autoclaude_enabled: boolean;
  attempt_count: number;
  last_error: string | null;
}

export interface Project {
  id: string;
  name: string;
  repo_url: string | null;
  user_id: string | null;
}

export interface TaskWithRepo extends Task {
  repo_url: string;
}
