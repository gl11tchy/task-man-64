# AUTOCLAUDE - Autonomous Claude Agent Daemon

A Node.js daemon that automatically processes tasks from the taskman64 kanban board using Claude CLI.

## How It Works

1. **Polling**: The daemon polls the database for tasks in the configured "Backlog" column that have `autoclaude_enabled = true`
2. **Claiming**: When a task is found, it claims it (moves to "In Progress") to prevent other instances from working on it
3. **Processing**: Clones the project's repository, creates a branch, and runs Claude CLI with the task description
4. **PR Creation**: Commits changes, pushes the branch, and creates a GitHub PR
5. **Resolution**: Moves the task to "Resolved" and records the PR URL
6. **Feedback Loop**: If a user moves the task back to "In Progress" with feedback, the daemon will address the feedback and push updates

## Prerequisites

- Node.js 18+
- Claude CLI installed and authenticated (`claude --version`)
- GitHub CLI installed and authenticated (`gh auth status`)
- Access to the Neon PostgreSQL database

## Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Configure the `.env` file:
   ```bash
   # Database connection (get from Neon dashboard)
   DATABASE_URL=postgresql://user:pass@host/db

   # Get column IDs from your database
   # Run: SELECT id, name FROM kanban_columns WHERE project_id = 'your-project-id';
   BACKLOG_COLUMN_ID=your-backlog-column-id
   IN_PROGRESS_COLUMN_ID=your-in-progress-column-id
   RESOLVED_COLUMN_ID=your-done-column-id
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run the daemon:
   ```bash
   npm start
   ```

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (required) | Neon PostgreSQL connection string |
| `POLL_INTERVAL_MS` | `10000` | How often to check for new tasks (ms) |
| `WORK_DIR` | `/tmp/autoclaude` | Directory for cloning repositories |
| `INSTANCE_ID` | `autoclaude-{timestamp}` | Unique ID for this daemon instance |
| `BACKLOG_COLUMN_ID` | (required) | Kanban column ID for new tasks |
| `IN_PROGRESS_COLUMN_ID` | (required) | Kanban column ID for active tasks |
| `RESOLVED_COLUMN_ID` | (required) | Kanban column ID for completed tasks |
| `MAX_CONCURRENT` | `1` | Maximum concurrent tasks to process |
| `CLAIM_TIMEOUT_MS` | `3600000` | Release claimed tasks after this time (1 hour) |

## Usage

### Enabling AUTOCLAUDE for a Task

1. In the taskman64 UI, click the robot icon on a task card to enable AUTOCLAUDE
2. Make sure the project has a `repo_url` configured in Settings
3. Move the task to the Backlog column (or create it there)

### Providing Feedback

1. If the generated PR needs changes, move the task back to "In Progress"
2. Add feedback text explaining what needs to be changed
3. The daemon will automatically address the feedback and push updates

## Running Multiple Instances

You can run multiple daemon instances for parallel processing:

```bash
# Instance 1
INSTANCE_ID=autoclaude-1 MAX_CONCURRENT=1 npm start

# Instance 2 (different terminal)
INSTANCE_ID=autoclaude-2 MAX_CONCURRENT=1 npm start
```

Each instance will claim different tasks and avoid conflicts through the `claimed_by` field.

## Troubleshooting

### Task not being picked up
- Verify `autoclaude_enabled` is `true` on the task
- Verify the project has a `repo_url` set
- Verify the task is in the correct Backlog column
- Check the column IDs in your `.env` match the database

### Claude CLI errors
- Ensure Claude CLI is installed: `claude --version`
- Ensure you're authenticated: `claude auth status`
- Check Claude CLI has necessary permissions

### GitHub CLI errors
- Ensure gh is installed: `gh --version`
- Ensure you're authenticated: `gh auth status`
- Ensure you have push access to the repository

## Security Notes

- The daemon runs with `--dangerously-skip-permissions` flag for autonomous operation
- Ensure the daemon runs in a trusted environment
- Review generated PRs before merging
- Consider running in a sandboxed environment for untrusted task descriptions
