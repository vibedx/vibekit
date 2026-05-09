import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync, spawn } from 'child_process';
import { getTicketsDir, getConfig } from '../../utils/index.js';
import {
  isGitRepository,
  getRepoName,
  getRepoRoot,
  getWorktreePath,
  createWorktree,
  createWorktreeExistingBranch,
  branchExistsLocally,
  branchExistsRemotely,
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
  const slug = ticket.frontmatter.slug || ticket.frontmatter.id;
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

async function planCommand(args) {
  if (!isGitRepository()) {
    console.error('❌ Not in a git repository.');
    process.exit(1);
  }

  const { ids, flags } = parseTicketIds(args);

  if (ids.length === 0 && !flags.statusFilter) {
    console.error('❌ Usage: vibe plan <TKT-001> <TKT-002> ... [--status=open] [--base main] [--dry-run] [--prompt "..."]');
    console.error('');
    console.error('Spawn parallel Claude agents in worktrees for multiple tickets.');
    console.error('');
    console.error('Options:');
    console.error('  --status=<status>  Start all tickets with this status (e.g. --status=open)');
    console.error('  --base <branch>    Base branch for worktrees (default: main)');
    console.error('  --dry-run          Show what would happen without doing it');
    console.error('  --no-install       Skip npm install in worktrees');
    console.error('  --prompt "..."     Custom prompt to pass to each Claude agent');
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

  console.log('');
  console.log(`🚀 Planning ${tickets.length} ticket(s) for parallel work:\n`);

  const worktreeInfos = [];

  for (const ticket of tickets) {
    const branchName = getBranchName(ticket, config);
    const worktreePath = getWorktreePath(repoName, branchName);
    const title = ticket.frontmatter.title || 'Untitled';

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
    console.log('');
  }

  if (flags.dryRun) {
    console.log('🏁 Dry run complete. No changes made.');
    return;
  }

  // Create worktrees
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

  // Install dependencies in worktrees
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

  // Spawn Claude agents
  console.log('\n🤖 Spawning Claude agents...\n');

  const agents = [];
  for (const info of worktreeInfos) {
    const ticketContent = fs.readFileSync(info.ticket.filePath, 'utf-8');
    const prompt = flags.prompt
      ? flags.prompt
      : `You are working on ticket ${info.ticket.frontmatter.id}: ${info.title}\n\nHere is the full ticket:\n\n${ticketContent}\n\nImplement the ticket requirements. Follow the acceptance criteria. Commit your work when done.`;

    try {
      const agentProcess = spawn('claude', ['-p', prompt, '--allowedTools', 'Edit,Write,Bash,Read,Glob,Grep'], {
        cwd: info.worktreePath,
        stdio: 'ignore',
        detached: true
      });

      agentProcess.unref();
      agents.push({ id: info.ticket.frontmatter.id, pid: agentProcess.pid });
      console.log(`  🤖 ${info.ticket.frontmatter.id}: Agent spawned (PID ${agentProcess.pid}) in ${info.worktreePath}`);
    } catch (error) {
      console.error(`  ❌ ${info.ticket.frontmatter.id}: Failed to spawn agent — ${error.message}`);
    }
  }

  console.log('\n🏁 All agents launched!\n');
  console.log('Monitor progress:');
  console.log('  vibe list --status=in_progress   # see active tickets');
  console.log('  git worktree list                 # see all worktrees');
  console.log('');
  console.log('When agents finish, open PRs:');
  console.log('  vibe pr --all                     # open PRs for all worktree branches');
  console.log(`  vibe pr ${tickets.map(t => t.frontmatter.id).join(' ')}     # open PRs for specific tickets`);
}

export default planCommand;
