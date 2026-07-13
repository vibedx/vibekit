import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getTicketsDir } from '../../utils/index.js';
import { checkEmptySections, KEY_TICKET_SECTIONS } from '../../utils/ticket.js';

/**
 * Mark a ticket as `ready` for agent pickup (e.g. by `vibe swarm`).
 *
 * A ticket should only be `ready` when it is fully fleshed out, so this refuses
 * to promote tickets that still have empty key sections unless --force is passed.
 * @param {string[]} args Command arguments
 */
function readyCommand(args) {
  const ticketArg = args.find(a => !a.startsWith('-'));
  const forceFlag = args.includes('--force') || args.includes('-f');

  if (!ticketArg) {
    console.error('❌ Usage: vibe ready <TKT-XXX> [--force]');
    console.error('   Marks a ticket as ready for agent pickup (swarm).');
    process.exit(1);
  }

  const ticketFolder = getTicketsDir();
  if (!fs.existsSync(ticketFolder)) {
    console.error(`❌ Tickets directory not found: ${ticketFolder}`);
    process.exit(1);
  }

  const normalizedInput = ticketArg.startsWith('TKT-')
    ? ticketArg
    : `TKT-${ticketArg.padStart(3, '0')}`;

  const files = fs.readdirSync(ticketFolder).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const fullPath = path.join(ticketFolder, file);
    if (fs.statSync(fullPath).isDirectory()) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) continue;

    const frontmatter = yaml.load(match[1]);
    if (frontmatter.id !== normalizedInput && !file.includes(normalizedInput)) continue;

    const empty = checkEmptySections(content, KEY_TICKET_SECTIONS);
    if (empty.length > 0 && !forceFlag) {
      console.error(`❌ ${frontmatter.id} is not ready — empty section(s): ${empty.join(', ')}.`);
      console.error(`   Fill them in (or run \`vibe refine ${frontmatter.id}\`) before marking ready.`);
      console.error('   Use --force to mark ready anyway.');
      process.exit(1);
    }

    frontmatter.status = 'ready';
    frontmatter.updated_at = new Date().toISOString();

    const updated = `---\n${yaml.dump(frontmatter)}---${content.split('---').slice(2).join('---')}`;
    fs.writeFileSync(fullPath, updated, 'utf-8');

    console.log(`✅ Ticket ${frontmatter.id} marked as ready for pickup.`);
    if (empty.length > 0) {
      console.log(`⚠️  Forced despite empty section(s): ${empty.join(', ')}.`);
    }
    return;
  }

  console.log(`❌ No ticket matching '${ticketArg}' found.`);
  process.exit(1);
}

export default readyCommand;
