import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';
import { getTicketsDir, getConfig } from '../../utils/index.js';
import {
  isGitRepository,
  getCurrentBranch,
  getDefaultBaseBranch,
  listWorktrees,
  getRepoRoot
} from '../../utils/git.js';

function parseArgs(args) {
  const flags = {};
  const ids = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--all' || arg === '-a') {
      flags.all = true;
      i++;
    } else if (arg === '--base' && i + 1 < args.length) {
      flags.baseBranch = args[i + 1];
      i += 2;
    } else if (arg === '--draft' || arg === '-d') {
      flags.draft = true;
      i++;
    } else if (arg === '--dry-run') {
      flags.dryRun = true;
      i++;
    } else if (!arg.startsWith('-')) {
      ids.push(arg);
      i++;
    } else {
      i++;
    }
  }
  return { ids, flags };
}

function normalizeTicketId(input) {
  if (input.startsWith('TKT-')) return input;
  if (/^\d+$/.test(input)) return `TKT-${input.padStart(3, '0')}`;
  return null;
}

function findTicketForBranch(ticketsDir, branch) {
  const files = fs.readdirSync(ticketsDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const filePath = path.join(ticketsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (match) {
      const fm = yaml.load(match[1]);
      const slug = fm.slug || '';
      if (branch.includes(fm.id) || branch.includes(slug)) {
        const body = content.split('---').slice(2).join('---').trim();
        return { frontmatter: fm, body, filePath };
      }
    }
  }
  return null;
}

function loadTicket(ticketsDir, ticketId) {
  const files = fs.readdirSync(ticketsDir).filter(f => f.startsWith(`${ticketId}-`));
  if (files.length === 0) return null;
  const filePath = path.join(ticketsDir, files[0]);
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = yaml.load(match[1]);
  const body = content.split('---').slice(2).join('---').trim();
  return { frontmatter: fm, body, filePath };
}

function hasRemote() {
  try {
    execSync('git remote get-url origin', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function pushBranch(branch, cwd) {
  try {
    execSync(`git push -u origin ${branch}`, { cwd, stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to push ${branch}: ${error.message}`);
    return false;
  }
}

function createPR(branch, baseBranch, title, body, draft, cwd) {
  const draftFlag = draft ? ' --draft' : '';
  const safeTitle = title.replace(/"/g, '\\"');
  const safeBody = body.replace(/'/g, "'\\''");
  try {
    const result = execSync(
      `gh pr create --head "${branch}" --base "${baseBranch}" --title "${safeTitle}"${draftFlag} --body '${safeBody}'`,
      { cwd, encoding: 'utf-8' }
    );
    return result.trim();
  } catch (error) {
    if (error.message.includes('already exists')) {
      try {
        const existing = execSync(`gh pr view "${branch}" --json url -q .url`, { cwd, encoding: 'utf-8' });
        return existing.trim() + ' (already existed)';
      } catch {
        return null;
      }
    }
    console.error(`  ❌ Failed to create PR: ${error.message}`);
    return null;
  }
}

function buildPRBody(ticket) {
  if (!ticket) return 'No ticket context found.';

  const fm = ticket.frontmatter;
  const sections = [];
  sections.push(`## ${fm.id}: ${fm.title}`);
  if (fm.priority) sections.push(`**Priority:** ${fm.priority}`);
  if (fm.assignee) sections.push(`**Assignee:** ${fm.assignee}`);
  sections.push('');
  sections.push(ticket.body);
  return sections.join('\n');
}

function getBranchCwd(worktrees, branch) {
  const wt = worktrees.find(w => w.branch === branch);
  return wt ? wt.path : null;
}

async function prCommand(args) {
  if (!isGitRepository()) {
    console.error('❌ Not in a git repository.');
    process.exit(1);
  }

  if (!hasRemote()) {
    console.error('❌ No git remote "origin" found. Push your repo to GitHub first.');
    process.exit(1);
  }

  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch {
    console.error('❌ GitHub CLI (gh) is required. Install it: https://cli.github.com');
    process.exit(1);
  }

  const { ids, flags } = parseArgs(args);
  const config = getConfig();
  const ticketsDir = getTicketsDir();
  const baseBranch = flags.baseBranch || config.git?.default_base || getDefaultBaseBranch();
  const worktrees = listWorktrees();
  const repoRoot = getRepoRoot();

  let branches = [];

  if (flags.all) {
    // Gather all worktree branches (excluding the main worktree)
    const mainRoot = repoRoot;
    branches = worktrees
      .filter(wt => wt.branch && wt.path !== mainRoot && wt.branch !== baseBranch)
      .map(wt => ({ branch: wt.branch, cwd: wt.path }));

    if (branches.length === 0) {
      console.error('❌ No worktree branches found. Use `vibe plan` to create them.');
      process.exit(1);
    }
  } else if (ids.length > 0) {
    // Look up branches for specific ticket IDs
    for (const id of ids) {
      const ticketId = normalizeTicketId(id);
      if (!ticketId) {
        console.error(`❌ Invalid ticket ID: ${id}`);
        process.exit(1);
      }
      const ticket = loadTicket(ticketsDir, ticketId);
      if (!ticket) {
        console.error(`❌ Ticket ${ticketId} not found.`);
        process.exit(1);
      }
      const branchPrefix = config.git?.branch_prefix || '';
      const slug = ticket.frontmatter.slug || ticket.frontmatter.id;
      const branchName = slug.includes(ticket.frontmatter.id)
        ? `${branchPrefix}${slug}`
        : `${branchPrefix}${ticket.frontmatter.id}-${slug}`;

      const wtCwd = getBranchCwd(worktrees, branchName);
      branches.push({ branch: branchName, cwd: wtCwd || repoRoot, ticketId });
    }
  } else {
    // Current branch
    const currentBranch = getCurrentBranch();
    if (!currentBranch || currentBranch === baseBranch) {
      console.error(`❌ You're on ${currentBranch || 'a detached HEAD'}. Switch to a feature branch or specify ticket IDs.`);
      console.error('');
      console.error('Usage: vibe pr [TKT-001 ...] [--all] [--draft] [--base main]');
      process.exit(1);
    }
    branches.push({ branch: currentBranch, cwd: repoRoot });
  }

  console.log(`\n📝 Opening ${branches.length} PR(s) against ${baseBranch}:\n`);

  if (flags.dryRun) {
    for (const { branch } of branches) {
      const ticket = findTicketForBranch(ticketsDir, branch);
      const title = ticket ? `${ticket.frontmatter.id}: ${ticket.frontmatter.title}` : branch;
      console.log(`  ${branch} → "${title}"`);
    }
    console.log('\n🏁 Dry run complete. No PRs created.');
    return;
  }

  const results = [];
  for (const { branch, cwd } of branches) {
    const ticket = findTicketForBranch(ticketsDir, branch);
    const title = ticket ? `${ticket.frontmatter.id}: ${ticket.frontmatter.title}` : branch;
    const body = buildPRBody(ticket);

    console.log(`  📤 ${branch}`);

    if (!pushBranch(branch, cwd)) continue;

    const prUrl = createPR(branch, baseBranch, title, body, flags.draft, cwd);
    if (prUrl) {
      console.log(`  ✅ ${prUrl}`);
      results.push({ branch, url: prUrl });

      // Update ticket status to review
      if (ticket) {
        try {
          const currentContent = fs.readFileSync(ticket.filePath, 'utf-8');
          const now = new Date().toISOString();
          const updatedContent = currentContent
            .replace(/^status: (.+)$/m, 'status: review')
            .replace(/^updated_at: (.+)$/m, `updated_at: "${now}"`);
          fs.writeFileSync(ticket.filePath, updatedContent, 'utf-8');
        } catch {
          // Non-critical — skip
        }
      }
    }
    console.log('');
  }

  console.log(`🏁 Done! ${results.length}/${branches.length} PR(s) opened.`);
}

export default prCommand;
