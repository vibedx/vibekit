import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getConfig } from '../../utils/index.js';

/**
 * Get path to team.yml (from config or default)
 */
function getTeamPath() {
  const config = getConfig();
  const teamPath = config.team?.path || '.vibe/team.yml';
  return path.resolve(process.cwd(), teamPath);
}

/**
 * Load team data from team.yml
 */
function loadTeam() {
  const teamPath = getTeamPath();
  try {
    if (fs.existsSync(teamPath)) {
      const content = fs.readFileSync(teamPath, 'utf-8');
      const data = yaml.load(content) || {};
      return data.members || {};
    }
  } catch (error) {
    console.error(`❌ Error reading team file: ${error.message}`);
  }
  return {};
}

/**
 * Save team data to team.yml
 */
function saveTeam(members) {
  const teamPath = getTeamPath();
  const dir = path.dirname(teamPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const content = yaml.dump({ members }, { lineWidth: -1 });
  fs.writeFileSync(teamPath, content, 'utf-8');
}

/**
 * Manage team members
 * Usage:
 *   vibe team                           - List all team members
 *   vibe team add <id> --name "Name" --github <gh> --slack <slack>
 *   vibe team remove <id>
 *   vibe team show <id>
 */
async function teamCommand(args) {
  const subcommand = args[0];

  if (!subcommand || subcommand === 'list') {
    return listTeam();
  }
  if (subcommand === 'add') {
    return addMember(args.slice(1));
  }
  if (subcommand === 'remove') {
    return removeMember(args[1]);
  }
  if (subcommand === 'show') {
    return showMember(args[1]);
  }
  return showMember(subcommand);
}

function listTeam() {
  const team = loadTeam();
  const members = Object.entries(team);

  if (members.length === 0) {
    console.log('\nNo team members configured.\n');
    console.log('Add members with: vibe team add <id> --name "Name" --github <gh> --slack <slack-id>\n');
    return;
  }

  console.log('\n✨ Team Members ✨\n');

  const idWidth = 16;
  const nameWidth = 16;
  const githubWidth = 16;
  const slackWidth = 14;

  console.log(
    `${'ID'.padEnd(idWidth)}| ${'NAME'.padEnd(nameWidth)}| ${'GITHUB'.padEnd(githubWidth)}| SLACK`
  );
  console.log(`${'-'.repeat(idWidth)}+${'-'.repeat(nameWidth + 1)}+${'-'.repeat(githubWidth + 1)}+${'-'.repeat(slackWidth)}`);

  for (const [id, member] of members) {
    if (typeof member !== 'object') continue;
    console.log(
      `${id.padEnd(idWidth)}| ${(member.name || '').padEnd(nameWidth)}| ${(member.github || '').padEnd(githubWidth)}| ${member.slack || ''}`
    );
  }

  console.log(`\nFound ${members.length} member(s).\n`);
}

function addMember(args) {
  if (!args[0]) {
    console.error('❌ Please provide a member ID. Usage: vibe team add <id> --name "Name" --github <gh> --slack <slack>');
    process.exit(1);
  }

  const id = args[0];
  const member = {};

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      member.name = args[++i];
    } else if (args[i] === '--github' && args[i + 1]) {
      member.github = args[++i];
    } else if (args[i] === '--slack' && args[i + 1]) {
      member.slack = args[++i];
    } else if (args[i] === '--x' && args[i + 1]) {
      member.x = args[++i];
    } else if (args[i] === '--role' && args[i + 1]) {
      member.role = args[++i];
    }
  }

  const team = loadTeam();
  team[id] = { ...team[id], ...member };
  saveTeam(team);

  console.log(`✅ Added team member: ${id}`);
  if (member.name) console.log(`   Name: ${member.name}`);
  if (member.github) console.log(`   GitHub: ${member.github}`);
  if (member.slack) console.log(`   Slack: ${member.slack}`);
  if (member.x) console.log(`   X: ${member.x}`);
  if (member.role) console.log(`   Role: ${member.role}`);
}

function removeMember(id) {
  if (!id) {
    console.error('❌ Please provide a member ID. Usage: vibe team remove <id>');
    process.exit(1);
  }

  const team = loadTeam();
  if (!team[id]) {
    console.error(`❌ Member '${id}' not found.`);
    process.exit(1);
  }

  delete team[id];
  saveTeam(team);
  console.log(`✅ Removed team member: ${id}`);
}

function showMember(id) {
  if (!id) return listTeam();

  const team = loadTeam();
  const member = team[id];

  if (!member) {
    console.error(`❌ Member '${id}' not found.`);
    process.exit(1);
  }

  console.log(`\n📋 ${id}`);
  if (member.name) console.log(`   Name: ${member.name}`);
  if (member.github) console.log(`   GitHub: @${member.github}`);
  if (member.slack) console.log(`   Slack: <@${member.slack}>`);
  if (member.x) console.log(`   X: @${member.x}`);
  if (member.role) console.log(`   Role: ${member.role}`);
  console.log();
}

/**
 * Resolve an assignee ID to their team info.
 * Exported for use by other commands and external tools.
 */
export function resolveAssignee(assigneeId) {
  const team = loadTeam();
  return team[assigneeId] || null;
}

/**
 * Get Slack mention string for an assignee.
 * Returns <@SLACK_ID> if found, or the raw assignee string.
 */
export function getSlackMention(assigneeId) {
  const member = resolveAssignee(assigneeId);
  if (member?.slack) {
    return `<@${member.slack}>`;
  }
  return assigneeId;
}

export default teamCommand;
