import { execFile } from 'child_process';
import { promisify } from 'util';
import { CONFIG } from './config.js';
import * as db from './db.js';
import { processNewTask, processFeedbackTask } from './worker.js';

const execFileAsync = promisify(execFile);

// Track consecutive errors for backoff
let consecutiveErrors = 0;
const MAX_BACKOFF_MS = 300000; // 5 minutes max backoff

// Validate all required CLI tools are available
async function validateDependencies(): Promise<void> {
  console.log('Validating dependencies...');

  // Check claude CLI
  try {
    await execFileAsync('claude', ['--version']);
    console.log('  ✓ claude CLI found');
  } catch {
    throw new Error('claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code');
  }

  // Check git
  try {
    await execFileAsync('git', ['--version']);
    console.log('  ✓ git found');
  } catch {
    throw new Error('git not found. Please install git.');
  }

  // Check gh CLI
  try {
    await execFileAsync('gh', ['--version']);
    console.log('  ✓ gh CLI found');
  } catch {
    throw new Error('gh CLI not found. Install from: https://cli.github.com');
  }

  // Verify gh is authenticated
  try {
    await execFileAsync('gh', ['auth', 'status']);
    console.log('  ✓ gh CLI authenticated');
  } catch {
    throw new Error('gh CLI not authenticated. Run: gh auth login');
  }

  console.log('All dependencies validated!\n');
}

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                      AUTOCLAUDE                           ║
║             Autonomous Claude Agent Daemon                ║
╠═══════════════════════════════════════════════════════════╣
║  Instance: ${CONFIG.INSTANCE_ID.padEnd(42)}║
║  Polling:  ${(CONFIG.POLL_INTERVAL_MS + 'ms').padEnd(42)}║
║  Work Dir: ${CONFIG.WORK_DIR.padEnd(42)}║
╚═══════════════════════════════════════════════════════════╝
`);

async function poll(): Promise<number> {
  try {
    // Check for tasks with feedback first (higher priority)
    const feedbackTasks = await db.getFeedbackTasks();
    if (feedbackTasks.length > 0) {
      console.log(`Found ${feedbackTasks.length} task(s) with feedback to address`);
    }
    for (const task of feedbackTasks) {
      // Claim before processing to prevent race conditions with other daemons
      const claimed = await db.claimTask(task.id);
      if (claimed) {
        console.log(`Claimed feedback task: ${task.id}`);
        await processFeedbackTask(task);
      }
    }

    // Then check for new tasks in backlog
    const newTasks = await db.getClaimableTasks();
    if (newTasks.length > 0) {
      console.log(`Found ${newTasks.length} claimable task(s)`);
    }
    for (const task of newTasks) {
      const claimed = await db.claimTask(task.id);
      if (claimed) {
        console.log(`Claimed task: ${task.id}`);
        await processNewTask(task);
      }
    }

    // Reset error counter on successful poll
    consecutiveErrors = 0;
    return 0; // No extra delay needed
  } catch (error) {
    consecutiveErrors++;
    const backoffMs = Math.min(
      CONFIG.POLL_INTERVAL_MS * Math.pow(2, consecutiveErrors),
      MAX_BACKOFF_MS
    );
    console.error(`Poll error (attempt ${consecutiveErrors}), backing off ${backoffMs}ms:`, error);
    return backoffMs; // Return delay instead of sleeping here
  }
}

// Main loop
async function main() {
  // Validate dependencies before starting
  await validateDependencies();

  console.log('Starting polling loop...\n');

  // Polling loop with backoff support
  while (true) {
    const extraDelay = await poll();
    await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL_MS + extraDelay));
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
