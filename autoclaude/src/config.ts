import { config } from 'dotenv';
config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const CONFIG = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || '10000'),
  WORK_DIR: process.env.WORK_DIR || '/tmp/autoclaude',
  INSTANCE_ID: process.env.INSTANCE_ID || `autoclaude-${Date.now()}`,
  CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'sonnet',
  // Column IDs to watch - user configures these
  BACKLOG_COLUMN_ID: requireEnv('BACKLOG_COLUMN_ID'),
  IN_PROGRESS_COLUMN_ID: requireEnv('IN_PROGRESS_COLUMN_ID'),
  RESOLVED_COLUMN_ID: requireEnv('RESOLVED_COLUMN_ID'),
  // Max concurrent tasks
  MAX_CONCURRENT: parseInt(process.env.MAX_CONCURRENT || '1'),
  // Claim timeout - if a task is claimed but not completed in this time, release it
  CLAIM_TIMEOUT_MS: parseInt(process.env.CLAIM_TIMEOUT_MS || '3600000'), // 1 hour
  // Max retry attempts before giving up on a task
  MAX_RETRY_ATTEMPTS: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
};
