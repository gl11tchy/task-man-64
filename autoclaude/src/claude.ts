import { spawn } from 'child_process';
import { CONFIG } from './config.js';

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

    console.log(`Running: claude ${args.slice(0, 2).join(' ')} ... (timeout: ${CONFIG.CLAUDE_TIMEOUT_MS}ms)`);

    const proc = spawn('claude', args, {
      cwd: workDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Close stdin immediately - we're not sending any input
    proc.stdin?.end();

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let forceKillTimeout: NodeJS.Timeout | undefined;

    // Set up timeout
    const timeout = setTimeout(() => {
      timedOut = true;
      console.error(`\nClaude execution timed out after ${CONFIG.CLAUDE_TIMEOUT_MS}ms`);
      proc.kill('SIGTERM');
      // Give it a moment to clean up, then force kill
      forceKillTimeout = setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      }, 5000);
    }, CONFIG.CLAUDE_TIMEOUT_MS);

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
      clearTimeout(timeout);
      if (forceKillTimeout) clearTimeout(forceKillTimeout);
      if (timedOut) {
        resolve({ success: false, output: stdout, error: `Execution timed out after ${CONFIG.CLAUDE_TIMEOUT_MS}ms` });
      } else if (code === 0) {
        resolve({ success: true, output: stdout });
      } else {
        resolve({ success: false, output: stdout, error: stderr || `Exit code: ${code}` });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, output: '', error: err.message });
    });
  });
}
