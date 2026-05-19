import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getTicketsDir } from '../../utils/index.js';

function parseTickets(ticketsDir) {
  if (!fs.existsSync(ticketsDir)) {
    return [];
  }

  const files = fs.readdirSync(ticketsDir).filter(f => f.endsWith('.md'));
  const tickets = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(ticketsDir, file), 'utf-8');
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        const fm = yaml.load(match[1]);
        tickets.push({
          id: fm.id || 'Unknown',
          title: fm.title || 'Untitled',
          status: fm.status || 'open',
          priority: fm.priority || 'medium',
          assignee: fm.assignee || fm.owner || '',
          created_at: fm.created_at || null,
        });
      }
    } catch {
      // skip unparseable tickets
    }
  }

  return tickets;
}

function bar(count, max, width = 20) {
  if (max === 0) return '';
  const filled = Math.round((count / max) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function statsCommand(args) {
  const ticketsDir = getTicketsDir();
  const tickets = parseTickets(ticketsDir);

  if (tickets.length === 0) {
    console.log('📭 No tickets found. Create one with: vibe new "title"');
    return;
  }

  const byStatus = {};
  const byPriority = {};
  const byAssignee = {};

  for (const t of tickets) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    if (t.assignee) {
      byAssignee[t.assignee] = (byAssignee[t.assignee] || 0) + 1;
    }
  }

  const total = tickets.length;
  const done = byStatus['done'] || 0;
  const inProgress = byStatus['in_progress'] || 0;
  const open = byStatus['open'] || 0;

  console.log('\n📊 VibeKit Stats\n');
  console.log(`  Total tickets: ${total}`);
  console.log(`  Completion:    ${done}/${total} (${total > 0 ? Math.round((done / total) * 100) : 0}%)\n`);

  // Status breakdown
  console.log('  Status');
  const statusOrder = ['open', 'in_progress', 'review', 'done'];
  const statusLabels = { open: '🔵 open', in_progress: '🟡 in_progress', review: '🔵 review', done: '🟢 done' };
  const allStatuses = [...new Set([...statusOrder, ...Object.keys(byStatus)])];
  const maxStatusCount = Math.max(...Object.values(byStatus));

  for (const s of allStatuses) {
    const count = byStatus[s] || 0;
    if (count === 0) continue;
    const label = statusLabels[s] || `⚪ ${s}`;
    console.log(`    ${label.padEnd(18)} ${bar(count, maxStatusCount, 15)} ${count}`);
  }

  // Priority breakdown
  if (Object.keys(byPriority).length > 0) {
    console.log('\n  Priority');
    const priorityOrder = ['critical', 'high', 'medium', 'low'];
    const priorityLabels = { critical: '🔴 critical', high: '🟠 high', medium: '🟡 medium', low: '🟢 low' };
    const allPriorities = [...new Set([...priorityOrder, ...Object.keys(byPriority)])];
    const maxPriorityCount = Math.max(...Object.values(byPriority));

    for (const p of allPriorities) {
      const count = byPriority[p] || 0;
      if (count === 0) continue;
      const label = priorityLabels[p] || `⚪ ${p}`;
      console.log(`    ${label.padEnd(18)} ${bar(count, maxPriorityCount, 15)} ${count}`);
    }
  }

  // Assignee breakdown
  if (Object.keys(byAssignee).length > 0) {
    console.log('\n  Assignees');
    const maxAssigneeCount = Math.max(...Object.values(byAssignee));
    const sorted = Object.entries(byAssignee).sort((a, b) => b[1] - a[1]);

    for (const [name, count] of sorted) {
      console.log(`    ${name.padEnd(18)} ${bar(count, maxAssigneeCount, 15)} ${count}`);
    }
  }

  console.log('');
}

export default statsCommand;
