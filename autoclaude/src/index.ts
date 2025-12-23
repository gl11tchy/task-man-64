import { CONFIG } from './config.js';
import * as db from './db.js';
import { processNewTask, processFeedbackTask } from './worker.js';

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

async function poll() {
  try {
    // Check for tasks with feedback first (higher priority)
    const feedbackTasks = await db.getFeedbackTasks();
    if (feedbackTasks.length > 0) {
      console.log(`Found ${feedbackTasks.length} task(s) with feedback to address`);
    }
    for (const task of feedbackTasks) {
      await processFeedbackTask(task);
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
  } catch (error) {
    console.error('Poll error:', error);
  }
}

// Main loop
async function main() {
  console.log('Starting polling loop...\n');

  // Initial poll
  await poll();

  // Continue polling
  while (true) {
    await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL_MS));
    await poll();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
