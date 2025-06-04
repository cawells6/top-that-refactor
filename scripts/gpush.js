/* eslint-env node */
/* global process */
/**
 * Simple script to git commit and push in one command
 * Usage: node scripts/gpush.js "Your commit message"
 */

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

/**
 * Execute a git command and log the output
 * @param {string} command - The git command to execute
 */
async function runGitCommand(command) {
  try {
    console.log(`🔄 Running: git ${command}`);
    const { stdout, stderr } = await execAsync(`git ${command}`);

    if (stdout) console.log(stdout);
    if (stderr) console.error(`⚠️ ${stderr}`);

    return { success: true, output: stdout };
  } catch (error) {
    console.error(`❌ Error executing git ${command}:`);
    console.error(error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main function to commit and push changes
 */
async function gitCommitAndPush() {
  // Get commit message from command line arguments
  const commitMessage = process.argv.slice(2).join(' ') || 'Update files';

  if (commitMessage.length < 3) {
    console.error('❌ Please provide a meaningful commit message (at least 3 characters)');
    process.exit(1);
  }

  console.log('🚀 Starting git commit and push process...');

  // Check git status
  const statusResult = await runGitCommand('status');
  if (!statusResult.success) {
    console.error('❌ Failed to check git status. Aborting.');
    process.exit(1);
  }

  // Add all changes
  const addResult = await runGitCommand('add .');
  if (!addResult.success) {
    console.error('❌ Failed to stage changes. Aborting.');
    process.exit(1);
  }

  // Commit changes
  const commitResult = await runGitCommand(`commit -m "${commitMessage}"`);
  if (!commitResult.success) {
    console.error('❌ Failed to commit changes.');
    console.log(
      '💡 There might not be any changes to commit, or there might be an issue with git configuration.'
    );
    process.exit(1);
  }

  // Push to remote
  console.log('🚀 Pushing changes to remote repository...');
  const pushResult = await runGitCommand('push');

  if (pushResult.success) {
    console.log('✅ Successfully pushed changes to remote repository!');
  } else {
    console.error('❌ Failed to push changes to remote repository.');
    console.log('💡 You might need to pull changes first or there might be network issues.');
    process.exit(1);
  }
}

// Run the main function
gitCommitAndPush().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
