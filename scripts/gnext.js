#!/usr/bin/env node
// gnext.js: Node version for cross-platform (optional)
// Usage: node scripts/gnext.js "Your commit message"

import { execSync } from 'child_process';
import readline from 'readline';

function run(cmd) {
  try {
    console.log(`$ ${cmd}`);
    execSync(cmd, { stdio: 'inherit' });
  } catch (e) {
    process.exit(1);
  }
}

const msg = process.argv.slice(2).join(' ') || 'Update files';

run(
  `git add $(git ls-files --modified --others --exclude-standard | grep -v "^nul$")`
);
try {
  run(`git commit -m "${msg}"`);
} catch (e) {
  // No changes to commit
}
run('git push');

const curBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
console.log(`Current branch: ${curBranch}`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
rl.question('Enter new branch name: ', (nextBranch) => {
  if (!nextBranch) {
    console.error('No branch name provided. Aborting.');
    process.exit(1);
  }
  run(`git checkout -b ${nextBranch}`);
  run(`git push -u origin ${nextBranch}`);
  run(`git push origin --delete ${curBranch}`);
  run(`git branch -D ${curBranch}`);
  rl.close();
});
