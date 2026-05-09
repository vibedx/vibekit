import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync, spawn } from 'child_process';
import { getTicketsDir, getConfig, createSlug } from '../../utils/index.js';
import {
  isGitRepository,
  getCurrentBranch,
  branchExistsLocally,
  branchExistsRemotely,
  createAndCheckoutBranch,
  checkoutBranch,
  getGitStatus,
  getRepoName,
  getWorktreePath,
  createWorktree,
  createWorktreeExistingBranch,
  getRepoRoot,
  getDefaultBaseBranch
} from '../../utils/git.js';

function parseTicketIds(args) {
  const ids = [];
  const flags = {};
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--base' && i + 1 < args.length) {
      flags.baseBranch = args[i + 1];
      i += 2;
    } else if (arg === '--dry-run') {
      flags.dryRun = true;
      i++;
    } else if (arg === '--no-install') {
      flags.noInstall = true;
      i++;
    } else if (arg === '--agent') {
      flags.agent = true;
      i++;
    } else if (arg === '--worktree' || arg === '-w') {
      flags.worktree = true;
      i++;
    } else if (arg === '--update-status' || arg === '-u') {
      flags.updateStatus = true;
      i++;
    } else if (arg === '--prompt' && i + 1 < args.length) {
      flags.prompt = args[i + 1];
      i += 2;
    } else if (arg.startsWith('--status=')) {
      flags.statusFilter = arg.split('=')[1];
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

function loadTicket(ticketsDir, ticketId) {
  const files = fs.readdirSync(ticketsDir).filter(f => f.startsWith(`${ticketId}-`));
  if (files.length === 0) return null;
  const filePath = path.join(ticketsDir, files[0]);
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const frontmatter = yaml.load(match[1]);
  return { frontmatter, content, filePath, fileName: files[0] };
}

function loadTicketsByStatus(ticketsDir, status) {
  const files = fs.readdirSync(ticketsDir).filter(f => f.endsWith('.md'));
  const tickets = [];
  for (const file of files) {
    const filePath = path.join(ticketsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (match) {
      const frontmatter = yaml.load(match[1]);
      if (frontmatter.status === status) {
        tickets.push({ frontmatter, content, filePath, fileName: file });
      }
    }
  }
  return tickets;
}

function getBranchName(ticket, config) {
  const branchPrefix = config.git?.branch_prefix || '';
  const slug = String(ticket.frontmatter.slug || ticket.frontmatter.id);
  return slug.includes(ticket.frontmatter.id)
    ? `${branchPrefix}${slug}`
    : `${branchPrefix}${ticket.frontmatter.id}-${slug}`;
}

function updateTicketStatus(ticket, worktreePath) {
  const now = new Date().toISOString();
  let updatedContent = ticket.content;

  if (updatedContent.match(/^worktree_path: .+$/m)) {
    updatedContent = updatedContent.replace(/^worktree_path: .+$/m, `worktree_path: "${worktreePath}"`);
  } else {
    updatedContent = updatedContent.replace(/^(updated_at: .+)$/m, `$1\nworktree_path: "${worktreePath}"`);
  }

  updatedContent = updatedContent
    .replace(/^status: (.+)$/m, 'status: in_progress')
    .replace(/^updated_at: (.+)$/m, `updated_at: "${now}"`);

  fs.writeFileSync(ticket.filePath, updatedContent, 'utf-8');
}

/**
 * Start working on ticket(s) by checking out branches or creating worktrees
 * @param {string[]} args Command arguments
 */
function startCommand(args) {
  if (!isGitRepository()) {
    console.error('❌ Not in a git repository.');
    process.exit(1);
  }

  const { ids, flags } = parseTicketIds(args);

  if (ids.length === 0 && !flags.statusFilter) {
    console.error('❌ Usage: vibe start <TKT-001> [<TKT-002> ...] [-w] [--agent] [--base main] [--dry-run]');
    console.error('');
    console.error('Start working on tickets. Without -w, checks out branch locally. With -w, creates worktrees.');
    console.error('');
    console.error('Options:');
    console.error('  -w, --worktree     Create worktrees for tickets');
    console.error('  --agent            Spawn Claude agents to work on tickets');
    console.error('  --status=<status>  Start all tickets with this status (e.g. --status=open)');
    console.error('  --base <branch>    Base branch for new branches/worktrees (default: main)');
    console.error('  --dry-run          Show what would happen without doing it');
    console.error('  --no-install       Skip npm install in worktrees');
    process.exit(1);
  }

  const config = getConfig();
  const ticketsDir = getTicketsDir();
  const repoName = getRepoName();
  const repoRoot = getRepoRoot();

  let tickets = [];

  if (flags.statusFilter) {
    tickets = loadTicketsByStatus(ticketsDir, flags.statusFilter);
    if (tickets.length === 0) {
      console.error(`❌ No tickets found with status: ${flags.statusFilter}`);
      process.exit(1);
    }
    console.log(`📋 Found ${tickets.length} ticket(s) with status "${flags.statusFilter}"`);
  }

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
    if (!tickets.find(t => t.frontmatter.id === ticket.frontmatter.id)) {
      tickets.push(ticket);
    }
  }

  if (tickets.length === 0) {
    console.error('❌ No tickets to start.');
    process.exit(1);
  }

  const useWorktree = flags.worktree;
  const spawnAgent = flags.agent;

  if (spawnAgent && !useWorktree && tickets.length > 1) {
    console.error('❌ --agent without -w only supports a single ticket. Use -w for multiple tickets.');
    process.exit(1);
  }

  console.log('');
  console.log(`🚀 Starting ${tickets.length} ticket(s):\n`);

  const worktreeInfos = [];

  for (const ticket of tickets) {
    const branchName = getBranchName(ticket, config);
    const title = ticket.frontmatter.title || 'Untitled';

    if (useWorktree) {
      const worktreePath = getWorktreePath(repoName, branchName);
      worktreeInfos.push({
        ticket,
        branchName,
        worktreePath,
        title,
        alreadyExists: fs.existsSync(worktreePath)
      });
      const status = fs.existsSync(worktreePath) ? '(exists)' : '(new)';
      console.log(`  ${ticket.frontmatter.id} — ${title}`);
      console.log(`    🌿 ${branchName} ${status}`);
      console.log(`    📂 ${worktreePath}`);
    } else {
      console.log(`  ${ticket.frontmatter.id} — ${title}`);
      console.log(`    🌿 ${branchName}`);
    }
    console.log('');
  }

  if (flags.dryRun) {
    console.log('🏁 Dry run complete. No changes made.');
    return;
  }

  if (useWorktree) {
    for (const info of worktreeInfos) {
      if (info.alreadyExists) {
        console.log(`✅ ${info.ticket.frontmatter.id}: Worktree already exists`);
        continue;
      }

      try {
        const branchExists = branchExistsLocally(info.branchName) || branchExistsRemotely(info.branchName);
        if (branchExists) {
          createWorktreeExistingBranch(info.worktreePath, info.branchName);
        } else {
          createWorktree(info.worktreePath, info.branchName, flags.baseBranch);
        }
        console.log(`✅ ${info.ticket.frontmatter.id}: Worktree created`);
      } catch (error) {
        console.error(`❌ ${info.ticket.frontmatter.id}: Failed to create worktree — ${error.message}`);
        continue;
      }

      updateTicketStatus(info.ticket, info.worktreePath);
    }

    if (!flags.noInstall) {
      const pkgExists = fs.existsSync(path.join(repoRoot, 'package.json'));
      if (pkgExists) {
        console.log('\n📦 Installing dependencies in worktrees...');
        for (const info of worktreeInfos) {
          if (fs.existsSync(path.join(info.worktreePath, 'package.json'))) {
            try {
              execSync('npm install --silent', { cwd: info.worktreePath, stdio: 'ignore' });
              console.log(`  ✅ ${info.ticket.frontmatter.id}: npm install done`);
            } catch (error) {
              console.warn(`  ⚠️  ${info.ticket.frontmatter.id}: npm install failed — ${error.message}`);
            }
          }
        }
      }
    }

    if (spawnAgent) {
      const agentTimeout = config.agent?.timeout || 900;
      console.log('\n🤖 Spawning Claude agents...\n');
      for (const info of worktreeInfos) {
        const ticketContent = fs.readFileSync(info.ticket.filePath, 'utf-8');
        const prompt = flags.prompt
          ? flags.prompt
          : `You are working on ticket ${info.ticket.frontmatter.id}: ${info.title}\n\nHere is the full ticket:\n\n${ticketContent}\n\nImplement the ticket requirements. Follow the acceptance criteria. Commit your work when done. Update the ticket status to done when complete.`;

        try {
          const agentProcess = spawn('claude', ['-p', prompt, '--timeout', String(agentTimeout * 1000)], {
            cwd: info.worktreePath,
            stdio: 'ignore',
            detached: true
          });

          agentProcess.unref();
          console.log(`  🤖 ${info.ticket.frontmatter.id}: Agent spawned in ${info.worktreePath} (timeout: ${agentTimeout}s)`);
        } catch (error) {
          console.error(`  ❌ ${info.ticket.frontmatter.id}: Failed to spawn agent — ${error.message}`);
        }
      }

      console.log('\n🏁 All agents launched!\n');
      console.log('Monitor progress:');
      console.log('  vibe status          # see active worktree work');
      console.log('  vibe list --status=in_progress # see in-progress tickets');
    } else {
      console.log('\n🏁 Worktrees created!\n');
      console.log('To work in a worktree:');
      console.log(`  cd ${worktreeInfos[0]?.worktreePath || '<worktree-path>'}`);
      console.log('');
      console.log('When done:');
      console.log('  vibe pr --all        # open PRs for all worktree branches');
    }
  } else {
    for (const ticket of tickets) {
      const branchName = getBranchName(ticket, config);
      const branchExistsLocal = branchExistsLocally(branchName);
      const branchExistsRemote = branchExistsRemotely(branchName);

      if (branchExistsLocal || branchExistsRemote) {
        console.log(`🔍 ${ticket.frontmatter.id}: Branch exists`);
      } else {
        try {
          createAndCheckoutBranch(branchName, flags.baseBranch);
          console.log(`✅ ${ticket.frontmatter.id}: Created branch ${branchName}`);
        } catch (error) {
          console.error(`❌ ${ticket.frontmatter.id}: Failed to create branch — ${error.message}`);
        }
      }

      updateTicketStatus(ticket, null);
    }

    if (spawnAgent) {
      const ticket = tickets[0];
      const agentTimeout = config.agent?.timeout || 900;
      const ticketContent = fs.readFileSync(ticket.filePath, 'utf-8');
      const prompt = flags.prompt
        ? flags.prompt
        : `You are working on ticket ${ticket.frontmatter.id}: ${ticket.frontmatter.title}\n\nHere is the full ticket:\n\n${ticketContent}\n\nImplement the ticket requirements. Follow the acceptance criteria. Commit your work when done. Update the ticket status to done when complete.`;

      console.log('\n🤖 Spawning Claude agent...\n');
      try {
        const agentProcess = spawn('claude', ['-p', prompt, '--timeout', String(agentTimeout * 1000)], {
          cwd: process.cwd(),
          stdio: 'ignore',
          detached: true
        });

        agentProcess.unref();
        console.log(`  🤖 ${ticket.frontmatter.id}: Agent spawned (timeout: ${agentTimeout}s)`);
        console.log('\n🏁 Agent launched!\n');
        console.log('Monitor progress:');
        console.log('  vibe status          # see ticket status');
        console.log('  vibe list --status=in_progress # see in-progress tickets');
      } catch (error) {
        console.error(`  ❌ ${ticket.frontmatter.id}: Failed to spawn agent — ${error.message}`);
      }
    } else {
      console.log('\n🏁 Branches ready!\n');
      console.log('To switch to a branch:');
      console.log(`  git checkout ${getBranchName(tickets[0], config)}`);
    }
  }
}

export default startCommand;
