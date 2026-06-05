import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';
import { getTicketsDir, getConfig, getProjectRoot } from '../../utils/index.js';
import {
  isGitRepository,
  branchExistsLocally,
  branchExistsRemotely,
  getRepoName,
  getWorktreePath,
  createWorktree,
  createWorktreeExistingBranch,
  getRepoRoot
} from '../../utils/git.js';
import {
  loadSkillContext,
  buildAgentPrompt,
  spawnAgentWithLogs,
  isProcessRunning,
  killProcess
} from '../../utils/agent.js';
import {
  loadSwarmState,
  saveSwarmState,
  createSwarmState,
  addAgentToState,
  updateAgentStatus,
  getLogsDir
} from '../../utils/swarm.js';

function parseSwarmArgs(args) {
  const flags = {};
  let subcommand = null;
  let i = 0;

  while (i < args.length) {
    const arg = args[i];
    if (arg === 'status') {
      subcommand = 'status';
      i++;
    } else if (arg === 'stop') {
      subcommand = 'stop';
      i++;
    } else if (arg === '--count' && i + 1 < args.length) {
      flags.count = parseInt(args[i + 1], 10);
      i += 2;
    } else if (arg === '--filter' && i + 1 < args.length) {
      flags.filter = args[i + 1];
      i += 2;
    } else if (arg === '--dry-run') {
      flags.dryRun = true;
      i++;
    } else if (arg === '--no-install') {
      flags.noInstall = true;
      i++;
    } else if (arg === '--base' && i + 1 < args.length) {
      flags.baseBranch = args[i + 1];
      i += 2;
    } else {
      i++;
    }
  }

  return { subcommand, flags };
}

function loadTickets(ticketsDir) {
  const files = fs.readdirSync(ticketsDir).filter(f => f.endsWith('.md'));
  const tickets = [];
  for (const file of files) {
    const filePath = path.join(ticketsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (match) {
      const frontmatter = yaml.load(match[1]);
      tickets.push({ frontmatter, content, filePath, fileName: file });
    }
  }
  return tickets;
}

function applyFilters(tickets, filterStr) {
  if (!filterStr) return tickets.filter(t => t.frontmatter.status === 'open');

  return tickets.filter(t => {
    const parts = filterStr.split(',').map(s => s.trim());
    return parts.every(part => {
      const [key, value] = part.split(':').map(s => s.trim());
      if (!key || !value) return true;
      return String(t.frontmatter[key]).toLowerCase() === value.toLowerCase();
    });
  });
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

  if (worktreePath) {
    if (updatedContent.match(/^worktree_path: .+$/m)) {
      updatedContent = updatedContent.replace(/^worktree_path: .+$/m, `worktree_path: "${worktreePath}"`);
    } else {
      updatedContent = updatedContent.replace(/^(updated_at: .+)$/m, `$1\nworktree_path: "${worktreePath}"`);
    }
  }

  updatedContent = updatedContent
    .replace(/^status: (.+)$/m, 'status: in_progress')
    .replace(/^updated_at: (.+)$/m, `updated_at: "${now}"`);

  fs.writeFileSync(ticket.filePath, updatedContent, 'utf-8');
}

function formatElapsed(startedAt) {
  const ms = Date.now() - new Date(startedAt).getTime();
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function showStatus() {
  const state = loadSwarmState();
  if (!state) {
    console.log('No active swarm. Run `vibe swarm` to start one.');
    return;
  }

  console.log(`\n🐝 Swarm: ${state.id}`);
  console.log(`   Started: ${state.started}`);
  console.log(`   Config: max ${state.config.maxAgents} agents, ${state.config.timeout}s timeout\n`);

  if (state.agents.length === 0) {
    console.log('   No agents.\n');
    return;
  }

  const colId = 10;
  const colTitle = 35;
  const colStatus = 10;
  const colTime = 10;
  const colPr = 8;

  console.log(
    '   ' +
    'Ticket'.padEnd(colId) +
    'Title'.padEnd(colTitle) +
    'Status'.padEnd(colStatus) +
    'Time'.padEnd(colTime) +
    'PR'
  );
  console.log('   ' + '─'.repeat(colId + colTitle + colStatus + colTime + colPr));

  for (const agent of state.agents) {
    let status = agent.status;
    if (status === 'running' && !isProcessRunning(agent.pid)) {
      status = 'exited';
      updateAgentStatus(state, agent.ticket, 'exited');
    }

    const statusIcon = {
      running: '🔄',
      done: '✅',
      failed: '❌',
      timeout: '⏰',
      exited: '🏁'
    }[status] || '❓';

    const title = (agent.title || '').length > colTitle - 2
      ? (agent.title || '').slice(0, colTitle - 5) + '...'
      : (agent.title || '');

    const elapsed = agent.finishedAt
      ? formatElapsed(agent.startedAt)
      : formatElapsed(agent.startedAt);

    console.log(
      '   ' +
      agent.ticket.padEnd(colId) +
      title.padEnd(colTitle) +
      `${statusIcon} ${status}`.padEnd(colStatus + 2) +
      elapsed.padEnd(colTime) +
      (agent.pr || '-')
    );
  }

  saveSwarmState(state);

  const running = state.agents.filter(a => a.status === 'running' && isProcessRunning(a.pid));
  const done = state.agents.filter(a => a.status === 'done' || a.status === 'exited');
  const failed = state.agents.filter(a => a.status === 'failed' || a.status === 'timeout');
  console.log(`\n   Running: ${running.length}  Done: ${done.length}  Failed: ${failed.length}\n`);
}

function stopSwarm() {
  const state = loadSwarmState();
  if (!state) {
    console.log('No active swarm.');
    return;
  }

  let killed = 0;
  for (const agent of state.agents) {
    if (agent.status === 'running' && isProcessRunning(agent.pid)) {
      if (killProcess(agent.pid)) {
        updateAgentStatus(state, agent.ticket, 'failed', { error: 'manually stopped' });
        killed++;
      }
    }
  }

  saveSwarmState(state);
  console.log(`🛑 Stopped ${killed} agent(s).`);
}

export default function swarmCommand(args) {
  const { subcommand, flags } = parseSwarmArgs(args);

  if (subcommand === 'status') {
    showStatus();
    return;
  }

  if (subcommand === 'stop') {
    stopSwarm();
    return;
  }

  if (!isGitRepository()) {
    console.error('❌ Not in a git repository.');
    process.exit(1);
  }

  const config = getConfig();
  const ticketsDir = getTicketsDir();
  const repoName = getRepoName();
  const repoRoot = getRepoRoot();

  const maxAgents = flags.count || config.swarm?.maxAgents || 3;
  const timeout = config.swarm?.timeout || config.agent?.timeout || 900;

  const allTickets = loadTickets(ticketsDir);
  let tickets = applyFilters(allTickets, flags.filter);

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  tickets.sort((a, b) => {
    const pa = priorityOrder[a.frontmatter.priority] ?? 2;
    const pb = priorityOrder[b.frontmatter.priority] ?? 2;
    return pa - pb;
  });

  tickets = tickets.slice(0, maxAgents);

  if (tickets.length === 0) {
    console.log('No tickets match the filter. Nothing to swarm.');
    return;
  }

  console.log(`\n🐝 Swarming ${tickets.length} ticket(s) (max: ${maxAgents}, timeout: ${timeout}s)\n`);

  const worktreeInfos = [];
  for (const ticket of tickets) {
    const branchName = getBranchName(ticket, config);
    const worktreePath = getWorktreePath(repoName, branchName);
    const title = ticket.frontmatter.title || 'Untitled';
    const exists = fs.existsSync(worktreePath);

    worktreeInfos.push({ ticket, branchName, worktreePath, title, alreadyExists: exists });

    const status = exists ? '(exists)' : '(new)';
    console.log(`  ${ticket.frontmatter.id} — ${title}`);
    console.log(`    🌿 ${branchName} ${status}`);
    console.log(`    📂 ${worktreePath}`);
    console.log('');
  }

  if (flags.dryRun) {
    console.log('🏁 Dry run — no agents spawned.');
    return;
  }

  // Create worktrees
  for (const info of worktreeInfos) {
    if (info.alreadyExists) {
      console.log(`✅ ${info.ticket.frontmatter.id}: Worktree exists`);
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
      console.error(`❌ ${info.ticket.frontmatter.id}: Worktree failed — ${error.message}`);
      info.failed = true;
      continue;
    }

    updateTicketStatus(info.ticket, info.worktreePath);
  }

  // Install dependencies
  if (!flags.noInstall) {
    const pkgExists = fs.existsSync(path.join(repoRoot, 'package.json'));
    if (pkgExists) {
      console.log('\n📦 Installing dependencies...');
      for (const info of worktreeInfos) {
        if (info.failed) continue;
        if (fs.existsSync(path.join(info.worktreePath, 'package.json'))) {
          try {
            execSync('npm install --silent', { cwd: info.worktreePath, stdio: 'ignore' });
            console.log(`  ✅ ${info.ticket.frontmatter.id}: npm install done`);
          } catch {
            console.warn(`  ⚠️  ${info.ticket.frontmatter.id}: npm install failed`);
          }
        }
      }
    }
  }

  // Create swarm state
  const state = createSwarmState({ maxAgents, timeout });

  // Spawn agents
  const skillContext = loadSkillContext();
  const logsDir = getLogsDir();
  console.log('\n🤖 Spawning agents...\n');

  for (const info of worktreeInfos) {
    if (info.failed) continue;

    const prompt = buildAgentPrompt(info.ticket, null, skillContext);
    const logFile = path.join(logsDir, `${info.ticket.frontmatter.id}.log`);

    try {
      const pid = spawnAgentWithLogs(prompt, info.worktreePath, timeout, logFile);

      addAgentToState(state, {
        ticket: info.ticket.frontmatter.id,
        title: info.title,
        pid,
        worktree: info.worktreePath,
        branch: info.branchName,
        logFile
      });

      console.log(`  🤖 ${info.ticket.frontmatter.id}: Agent spawned (PID ${pid})`);
    } catch (error) {
      console.error(`  ❌ ${info.ticket.frontmatter.id}: Failed to spawn — ${error.message}`);
    }
  }

  saveSwarmState(state);

  console.log(`\n🏁 Swarm launched! (${state.agents.length} agents)\n`);
  console.log('Monitor progress:');
  console.log('  vibe swarm status    # live agent dashboard');
  console.log('  vibe swarm stop      # stop all agents');
  console.log('  vibe status          # see worktree activity');
}
