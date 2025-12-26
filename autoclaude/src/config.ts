import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from parent directory (main project) first, then local .env
config({ path: resolve(process.cwd(), '../.env') });
config(); // Local .env can override

function getEnv(name: string, altName?: string): string | undefined {
  return process.env[name] || (altName ? process.env[altName] : undefined);
}

function requireEnv(name: string, altName?: string): string {
  const value = getEnv(name, altName);
  if (!value) {
    const names = altName ? `${name} or ${altName}` : name;
    throw new Error(`Missing required environment variable: ${names}`);
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
  // Accept either DATABASE_URL or VITE_DATABASE_URL (from parent project)
  DATABASE_URL: requireEnv('DATABASE_URL', 'VITE_DATABASE_URL'),
  POLL_INTERVAL_MS: parseIntWithDefault(getEnv('POLL_INTERVAL_MS'), 10000, 'POLL_INTERVAL_MS'),
  WORK_DIR: getEnv('WORK_DIR') || '/tmp/autoclaude',
  INSTANCE_ID: getEnv('INSTANCE_ID') || `autoclaude-${Date.now()}`,
  CLAUDE_MODEL: getEnv('CLAUDE_MODEL') || 'sonnet',
  MAX_CONCURRENT: parseIntWithDefault(getEnv('MAX_CONCURRENT'), 1, 'MAX_CONCURRENT'),
  CLAIM_TIMEOUT_MS: parseIntWithDefault(getEnv('CLAIM_TIMEOUT_MS'), 3600000, 'CLAIM_TIMEOUT_MS'),
  MAX_RETRY_ATTEMPTS: parseIntWithDefault(getEnv('MAX_RETRY_ATTEMPTS'), 3, 'MAX_RETRY_ATTEMPTS'),
  CLAUDE_TIMEOUT_MS: parseIntWithDefault(getEnv('CLAUDE_TIMEOUT_MS'), 600000, 'CLAUDE_TIMEOUT_MS'),
  CLEANUP_ON_SUCCESS: getEnv('CLEANUP_ON_SUCCESS') !== 'false',
};
