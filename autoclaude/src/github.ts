import { promisify } from 'util';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);

export async function createPR(
  workDir: string,
  title: string,
  body: string,
  branchName: string
): Promise<string> {
  // Validate branch name
  if (!/^[\w\-\/]+$/.test(branchName)) {
    throw new Error(`Invalid branch name: ${branchName}`);
  }

  // Use execFile for safe argument passing - no shell interpolation
  const { stdout } = await execFileAsync(
    'gh',
    ['pr', 'create', '--title', title, '--body', body, '--head', branchName],
    { cwd: workDir }
  );

  // gh pr create returns the PR URL
  return stdout.trim();
}

export async function getPRUrl(workDir: string, branchName: string): Promise<string | null> {
  // Validate branch name
  if (!/^[\w\-\/]+$/.test(branchName)) {
    throw new Error(`Invalid branch name: ${branchName}`);
  }

  try {
    const { stdout } = await execFileAsync(
      'gh',
      ['pr', 'view', branchName, '--json', 'url', '-q', '.url'],
      { cwd: workDir }
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function addPRComment(
  workDir: string,
  branchName: string,
  comment: string
): Promise<void> {
  // Validate branch name
  if (!/^[\w\-\/]+$/.test(branchName)) {
    throw new Error(`Invalid branch name: ${branchName}`);
  }

  // Use execFile for safe argument passing
  await execFileAsync(
    'gh',
    ['pr', 'comment', branchName, '--body', comment],
    { cwd: workDir }
  );
}
