import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from './config.js';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

// Validate repo URL to prevent command injection
function validateRepoUrl(url: string): boolean {
  // Only allow valid GitHub/GitLab URLs or SSH patterns
  const validPatterns = [
    /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/,
    /^https:\/\/gitlab\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/,
    /^git@github\.com:[\w.-]+\/[\w.-]+(?:\.git)?$/,
    /^git@gitlab\.com:[\w.-]+\/[\w.-]+(?:\.git)?$/,
  ];
  return validPatterns.some(pattern => pattern.test(url));
}

// Get the default branch name for a repo
async function getDefaultBranch(workDir: string): Promise<string> {
  try {
    // Try to get the default branch from remote
    const { stdout } = await execFileAsync('git', ['symbolic-ref', 'refs/remotes/origin/HEAD', '--short'], { cwd: workDir });
    return stdout.trim().replace('origin/', '');
  } catch {
    // Fallback: try common branch names
    const branches = ['main', 'master', 'develop'];
    for (const branch of branches) {
      try {
        await execFileAsync('git', ['rev-parse', '--verify', `origin/${branch}`], { cwd: workDir });
        return branch;
      } catch {
        continue;
      }
    }
    return 'main'; // Final fallback
  }
}

export async function cloneOrPull(repoUrl: string, taskId: string): Promise<string> {
  // Validate URL to prevent command injection
  if (!validateRepoUrl(repoUrl)) {
    throw new Error(`Invalid repository URL format: ${repoUrl}`);
  }

  const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
  const workDir = path.join(CONFIG.WORK_DIR, taskId, repoName);

  if (fs.existsSync(workDir)) {
    // Pull latest on the default branch
    console.log(`[${taskId}] Pulling latest changes...`);
    const defaultBranch = await getDefaultBranch(workDir);
    await execFileAsync('git', ['checkout', defaultBranch], { cwd: workDir });
    await execFileAsync('git', ['pull'], { cwd: workDir });
  } else {
    // Clone fresh using execFile for safety
    console.log(`[${taskId}] Cloning repository...`);
    fs.mkdirSync(path.dirname(workDir), { recursive: true });
    await execFileAsync('git', ['clone', repoUrl, workDir]);
  }

  return workDir;
}

export async function createBranch(workDir: string, branchName: string): Promise<void> {
  // Validate branch name (alphanumeric, hyphens, slashes)
  if (!/^[\w\-\/]+$/.test(branchName)) {
    throw new Error(`Invalid branch name: ${branchName}`);
  }

  try {
    // Try to create the branch
    await execFileAsync('git', ['checkout', '-b', branchName], { cwd: workDir });
  } catch {
    // Branch might already exist (retry scenario), try to check it out and reset
    console.log(`Branch ${branchName} might exist, attempting to checkout and reset...`);
    const defaultBranch = await getDefaultBranch(workDir);

    // Checkout default branch first, delete the existing branch, then recreate
    await execFileAsync('git', ['checkout', defaultBranch], { cwd: workDir });
    try {
      await execFileAsync('git', ['branch', '-D', branchName], { cwd: workDir });
    } catch {
      // Branch might not exist locally, that's fine
    }
    await execFileAsync('git', ['checkout', '-b', branchName], { cwd: workDir });
  }
}

export async function checkoutBranch(workDir: string, branchName: string): Promise<void> {
  // Validate branch name
  if (!/^[\w\-\/]+$/.test(branchName)) {
    throw new Error(`Invalid branch name: ${branchName}`);
  }

  // Always fetch the latest from remote first
  try {
    await execFileAsync('git', ['fetch', 'origin', branchName], { cwd: workDir });
  } catch {
    // Branch might not exist on remote yet, that's okay for new branches
  }

  // Try to checkout the branch
  try {
    await execFileAsync('git', ['checkout', branchName], { cwd: workDir });
  } catch {
    // Branch might not exist locally, create tracking branch
    await execFileAsync('git', ['checkout', '-b', branchName, `origin/${branchName}`], { cwd: workDir });
  }

  // Pull latest changes to sync with remote (handles case where remote has new commits)
  try {
    await execFileAsync('git', ['pull', '--rebase', 'origin', branchName], { cwd: workDir });
  } catch {
    // Pull might fail if there are conflicts or no remote tracking - that's okay for new branches
    console.log(`Note: Could not pull latest for ${branchName}, proceeding with local state`);
  }
}

export interface CommitResult {
  committed: boolean;
  message?: string;
}

export async function commitAndPush(workDir: string, message: string, branchName: string): Promise<CommitResult> {
  // Validate branch name
  if (!/^[\w\-\/]+$/.test(branchName)) {
    throw new Error(`Invalid branch name: ${branchName}`);
  }

  await execFileAsync('git', ['add', '-A'], { cwd: workDir });

  // Check if there are changes to commit
  try {
    await execAsync('git diff --staged --quiet', { cwd: workDir });
    // No changes - nothing to commit
    console.log('No changes to commit');
    return { committed: false, message: 'No changes to commit' };
  } catch {
    // There are changes, proceed with commit
  }

  // Use execFile with -m flag to safely pass commit message
  await execFileAsync('git', ['commit', '-m', message], { cwd: workDir });
  await execFileAsync('git', ['push', '-u', 'origin', branchName], { cwd: workDir });

  return { committed: true };
}

export function cleanupWorkDir(taskId: string): void {
  const workDir = path.join(CONFIG.WORK_DIR, taskId);
  if (fs.existsSync(workDir)) {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}
