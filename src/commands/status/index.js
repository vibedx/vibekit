import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';
import { getTicketsDir, getConfig } from '../../utils/index.js';
import { isGitRepository, getRepoName } from '../../utils/git.js';

function getWorktreesStatus() {
  try {
    const output = execSync('git worktree list --porcelain', { encoding: 'utf-8' });
    const lines = output.trim().split('\n').filter(l => l);
    const worktrees = [];
    for (const line of lines) {
      const [path_, branch_] = line.split(' ');
      if (path_ && path_ !== '.') {
        const branch = branch_.replace('branch ', '').replace(/^refs\/heads\//, '');
        worktrees.push({ path: path_, branch });
      }
    }
    return worktrees;
  } catch (error) {
    return [];
  }
}

function loadTicketFromPath(ticketsDir, worktreePath) {
  const files = fs.readdirSync(ticketsDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const filePath = path.join(ticketsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes(`worktree_path: "${worktreePath}"`)) {
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        const frontmatter = yaml.load(match[1]);
        return { id: frontmatter.id, title: frontmatter.title, status: frontmatter.status, filePath };
      }
    }
  }
  return null;
}

function statusCommand(args) {
  if (!isGitRepository()) {
    console.error('❌ Not in a git repository.');
    process.exit(1);
  }

  const ticketsDir = getTicketsDir();
  const worktrees = getWorktreesStatus();

  if (worktrees.length === 0) {
    console.log('📭 No active worktrees.\n');
    console.log('Start a ticket with worktrees:');
    console.log('  vibe start <TKT-001> -w');
    return;
  }

  console.log('\n🌳 Active Worktrees\n');

  for (const wt of worktrees) {
    const ticket = loadTicketFromPath(ticketsDir, wt.path);
    if (ticket) {
      console.log(`  ${ticket.id} — ${ticket.title}`);
      console.log(`    📂 ${wt.path}`);
      console.log(`    🌿 ${wt.branch}`);
      console.log(`    ✓ ${ticket.status}`);
    } else {
      console.log(`  ${wt.branch}`);
      console.log(`    📂 ${wt.path}`);
    }
    console.log('');
  }

  console.log('Commands:');
  console.log('  cd <path>            # Enter a worktree');
  console.log('  vibe pr --all        # Open PRs for all branches');
  console.log('  git worktree remove  # Remove a worktree when done');
}

export default statusCommand;
