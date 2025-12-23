import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from './config.js';

const execAsync = promisify(exec);

export async function cloneOrPull(repoUrl: string, taskId: string): Promise<string> {
  const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
  const workDir = path.join(CONFIG.WORK_DIR, taskId, repoName);

  if (fs.existsSync(workDir)) {
    // Pull latest
    console.log(`[${taskId}] Pulling latest changes...`);
    await execAsync('git checkout main && git pull', { cwd: workDir });
  } else {
    // Clone fresh
    console.log(`[${taskId}] Cloning repository...`);
    fs.mkdirSync(path.dirname(workDir), { recursive: true });
    await execAsync(`git clone ${repoUrl} ${workDir}`);
  }

  return workDir;
}

export async function createBranch(workDir: string, branchName: string): Promise<void> {
  await execAsync(`git checkout -b ${branchName}`, { cwd: workDir });
}

export async function checkoutBranch(workDir: string, branchName: string): Promise<void> {
  // Try to checkout, if it fails try to fetch and checkout
  try {
    await execAsync(`git checkout ${branchName}`, { cwd: workDir });
  } catch {
    // Branch might not exist locally, try fetching
    await execAsync(`git fetch origin ${branchName}`, { cwd: workDir });
    await execAsync(`git checkout ${branchName}`, { cwd: workDir });
  }
}

export async function commitAndPush(workDir: string, message: string, branchName: string): Promise<void> {
  await execAsync('git add -A', { cwd: workDir });

  // Check if there are changes to commit
  try {
    await execAsync('git diff --staged --quiet', { cwd: workDir });
    // No changes - nothing to commit
    console.log('No changes to commit');
    return;
  } catch {
    // There are changes, proceed with commit
  }

  // Escape message for shell
  const escapedMessage = message.replace(/"/g, '\\"');
  await execAsync(`git commit -m "${escapedMessage}"`, { cwd: workDir });
  await execAsync(`git push -u origin ${branchName}`, { cwd: workDir });
}

export function cleanupWorkDir(taskId: string): void {
  const workDir = path.join(CONFIG.WORK_DIR, taskId);
  if (fs.existsSync(workDir)) {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}
