import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export async function createPR(
  workDir: string,
  title: string,
  body: string,
  branchName: string
): Promise<string> {
  // Escape title and body for shell
  const escapedTitle = title.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  const escapedBody = body.replace(/"/g, '\\"').replace(/\$/g, '\\$');

  const { stdout } = await execAsync(
    `gh pr create --title "${escapedTitle}" --body "${escapedBody}" --head ${branchName}`,
    { cwd: workDir }
  );

  // gh pr create returns the PR URL
  return stdout.trim();
}

export async function getPRUrl(workDir: string, branchName: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `gh pr view ${branchName} --json url -q .url`,
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
  const escapedComment = comment.replace(/"/g, '\\"').replace(/\$/g, '\\$');

  await execAsync(
    `gh pr comment ${branchName} --body "${escapedComment}"`,
    { cwd: workDir }
  );
}
