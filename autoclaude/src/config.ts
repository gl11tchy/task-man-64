import { config } from 'dotenv';
config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseIntWithDefault(value: string | undefined, defaultValue: number, name: string): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0) {
    console.warn(`Invalid value for ${name}: "${value}", using default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

export const CONFIG = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  POLL_INTERVAL_MS: parseIntWithDefault(process.env.POLL_INTERVAL_MS, 10000, 'POLL_INTERVAL_MS'),
  WORK_DIR: process.env.WORK_DIR || '/tmp/autoclaude',
  INSTANCE_ID: process.env.INSTANCE_ID || `autoclaude-${Date.now()}`,
  CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'sonnet',
  // Column IDs to watch - user configures these
  BACKLOG_COLUMN_ID: requireEnv('BACKLOG_COLUMN_ID'),
  IN_PROGRESS_COLUMN_ID: requireEnv('IN_PROGRESS_COLUMN_ID'),
  RESOLVED_COLUMN_ID: requireEnv('RESOLVED_COLUMN_ID'),
  // Max concurrent tasks
  MAX_CONCURRENT: parseIntWithDefault(process.env.MAX_CONCURRENT, 1, 'MAX_CONCURRENT'),
  // Claim timeout - if a task is claimed but not completed in this time, release it
  CLAIM_TIMEOUT_MS: parseIntWithDefault(process.env.CLAIM_TIMEOUT_MS, 3600000, 'CLAIM_TIMEOUT_MS'), // 1 hour
  // Max retry attempts before giving up on a task
  MAX_RETRY_ATTEMPTS: parseIntWithDefault(process.env.MAX_RETRY_ATTEMPTS, 3, 'MAX_RETRY_ATTEMPTS'),
  // Timeout for Claude CLI execution (prevents hangs)
  CLAUDE_TIMEOUT_MS: parseIntWithDefault(process.env.CLAUDE_TIMEOUT_MS, 600000, 'CLAUDE_TIMEOUT_MS'), // 10 minutes
  // Cleanup work directories after successful completion
  CLEANUP_ON_SUCCESS: process.env.CLEANUP_ON_SUCCESS !== 'false', // default true
};
