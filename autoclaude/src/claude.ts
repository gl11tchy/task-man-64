import { spawn } from 'child_process';

export interface ClaudeResult {
  success: boolean;
  output: string;
  error?: string;
}

export async function runClaude(
  workDir: string,
  prompt: string,
  context?: string
): Promise<ClaudeResult> {
  return new Promise((resolve) => {
    const fullPrompt = context
      ? `${context}\n\n---\n\nTask: ${prompt}`
      : prompt;

    const args = [
      '--print',
      '--dangerously-skip-permissions', // Required for autonomous operation
      '-p', fullPrompt,
    ];

    console.log(`Running: claude ${args.slice(0, 2).join(' ')} ...`);

    const proc = spawn('claude', args, {
      cwd: workDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        resolve({ success: false, output: stdout, error: stderr || `Exit code: ${code}` });
      }
    });

    proc.on('error', (err) => {
      resolve({ success: false, output: '', error: err.message });
    });
  });
}
