# Task Manager 64 (Workstation)

A multi-view task management application with arcade/retro aesthetics, featuring AUTOCLAUDE - an AI-powered autonomous task processing daemon.

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Frontend | React | 19.2.0 |
| Language | TypeScript | 5.8.2 |
| Build | Vite | 6.2.0 |
| State | Zustand | 5.0.9 |
| Routing | React Router DOM | 7.11.0 |
| Database | Neon PostgreSQL | 0.10.4 |
| Drag & Drop | @dnd-kit | 6.3.1 |
| Whiteboard | Excalidraw | 0.18.0 |
| Animation | Framer Motion | 12.23.25 |
| Icons | Lucide React | 0.555.0 |

## Project Structure

```
/
├── App.tsx                 # Main app with routing and keyboard shortcuts
├── types.ts                # Core types (Task, Project, KanbanColumn, etc.)
├── neon.ts                 # Neon database client setup
├── index.tsx               # Entry point
├── components/             # React components
│   ├── WorkstationView.tsx # Primary task view with tabs
│   ├── KanbanView.tsx      # Full kanban board wrapper
│   ├── KanbanBoard.tsx     # Kanban with drag-and-drop
│   ├── BacklogView.tsx     # Backlog task management
│   ├── WhiteboardView.tsx  # Excalidraw whiteboard
│   ├── SettingsView.tsx    # App settings
│   ├── Layout.tsx          # Main layout wrapper
│   ├── Sidebar.tsx         # Navigation + project switcher
│   ├── TaskInput.tsx       # Task creation input
│   ├── QuickSwitcher.tsx   # Cmd+K project switcher
│   ├── AuthModal.tsx       # Sign in/up modal
│   ├── UserMenu.tsx        # User account menu
│   ├── AutoclaudeToggle.tsx    # AUTOCLAUDE toggle on tasks
│   ├── AutoclaudeActivityFeed.tsx # Real-time event feed
│   ├── FocusView.tsx       # Focused task view
│   ├── ListView.tsx        # List view component
│   ├── ModeToggle.tsx      # Mode toggle UI
│   ├── Portal.tsx          # React portal component
│   └── ErrorBoundary.tsx   # Error handling
├── stores/
│   ├── projectStore.ts     # Projects, tasks, columns, CRUD
│   └── uiStore.ts          # UI state (view, sidebar, mode)
├── services/
│   ├── projectStorage.ts   # Project & column storage
│   ├── taskStorage.ts      # Task CRUD operations
│   ├── whiteboardStorage.ts    # Whiteboard persistence
│   └── autoclaudeEventStorage.ts # AUTOCLAUDE events
├── contexts/
│   └── AuthContext.tsx     # User authentication state
├── hooks/
│   └── useAudio.ts         # Sound effects hook
├── autoclaude/             # Autonomous daemon (Node.js)
│   └── src/
│       ├── index.ts        # Main daemon entry
│       ├── worker.ts       # Task processing logic
│       ├── claude.ts       # Claude CLI integration
│       ├── git.ts          # Git operations
│       ├── github.ts       # GitHub PR creation
│       ├── db.ts           # Database queries
│       ├── events.ts       # Event emission
│       ├── config.ts       # Configuration
│       └── types.ts        # Type definitions
└── supabase/migrations/    # Database schema migrations
```

## Views (5 Routes)

1. **WorkstationView** (`/`) - Primary task view with active/completed tabs
2. **KanbanView** (`/kanban`) - Full kanban board with drag-and-drop
3. **BacklogView** (`/backlog`) - Backlog task management
4. **WhiteboardView** (`/whiteboard`) - Excalidraw-based whiteboard
5. **SettingsView** (`/settings`) - App settings and configuration

## Database Schema

### Tables
- **projects**: id, name, color, description, created_at, is_archived, user_id, repo_url, autoclaude_paused
- **kanban_columns**: id, project_id, name, color, position, is_done_column
- **tasks**: id, text, status, created_at, completed_at, user_id, project_id, kanban_column_id, kanban_position, backlog_position, is_in_backlog, due_date, priority, tags, pr_url, feedback, claimed_at, claimed_by, autoclaude_enabled, attempt_count, last_error
- **autoclaude_events**: id, task_id, project_id, event_type, message, metadata, created_at, daemon_instance

## AUTOCLAUDE System

The `autoclaude/` directory contains an autonomous Node.js daemon that:
1. Polls database for tasks with `autoclaude_enabled = true`
2. Claims tasks and moves to "In Progress"
3. Clones repo, creates branch, runs Claude CLI
4. Commits changes and creates GitHub PRs
5. Moves tasks to "Done" with PR URL
6. Handles feedback loops when tasks are moved back

### Key Files
- `autoclaude/src/worker.ts` - `processNewTask()` and `processFeedbackTask()`
- `autoclaude/src/claude.ts` - Claude CLI invocation
- `autoclaude/src/github.ts` - PR creation via gh CLI

## Keyboard Shortcuts

- `Cmd+K` - Quick project switcher
- `Cmd+1/2/3/4` - Switch views (workstation/kanban/backlog/whiteboard)
- `Cmd+[` - Toggle sidebar

## Development Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview build
npm run autoclaude # Start AUTOCLAUDE daemon
```

---

## Mandatory: Serena Integration

**RULE #1: You MUST use Serena tools for ALL code navigation and editing operations.**

This is not optional. Serena provides semantic code understanding and should be used for:

- **Code navigation**: Use `find_symbol`, `get_symbols_overview`, `find_referencing_symbols` instead of grep/glob
- **Code reading**: Use `read_file` or symbolic tools with `include_body=True` instead of cat/Read
- **Code editing**: Use `replace_symbol_body`, `insert_after_symbol`, `insert_before_symbol`, `replace_content` instead of Edit/Write
- **File search**: Use `find_file`, `search_for_pattern`, `list_dir` instead of bash find/ls
- **Project context**: Check `list_memories` and read relevant memories for project-specific knowledge

### Why Serena?

1. **Semantic understanding** - Serena understands code structure, not just text
2. **Precise edits** - Symbol-level operations prevent accidental changes
3. **Relationship tracking** - Easily find references and dependencies
4. **Memory persistence** - Project knowledge persists across conversations

### Exceptions

Only fall back to non-Serena tools when:
- Serena tools are unavailable or erroring
- The operation is purely file-system based (git, npm, etc.)
- Explicitly instructed by the user