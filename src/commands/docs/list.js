import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getDocsDir } from '../../utils/doc.js';

/**
 * Parse `vibe docs list` filter flags.
 * @param {string[]} args
 * @returns {{type: string|null, status: string|null, tag: string|null}}
 */
function parseFilters(args) {
  let type = null;
  let status = null;
  let tag = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--type' && i + 1 < args.length) {
      type = args[++i];
    } else if (arg === '--status' && i + 1 < args.length) {
      status = args[++i];
    } else if (arg === '--tag' && i + 1 < args.length) {
      tag = args[++i];
    } else if (arg.startsWith('--type=')) {
      type = arg.split('=')[1];
    } else if (arg.startsWith('--status=')) {
      status = arg.split('=')[1];
    } else if (arg.startsWith('--tag=')) {
      tag = arg.split('=')[1];
    }
  }

  return { type, status, tag };
}

function normalizeTags(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string' && raw.trim()) {
    return raw.replace(/[\[\]]/g, '').split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
}

/**
 * `vibe docs list` — render a filtered table of docs.
 * @param {string[]} args
 */
function listDocs(args) {
  const { type, status, tag } = parseFilters(args);
  const docsDir = getDocsDir();

  if (!fs.existsSync(docsDir)) {
    console.log('No docs found. Create one with: vibe docs add "title"');
    return;
  }

  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

  if (files.length === 0) {
    console.log('No docs found. Create one with: vibe docs add "title"');
    return;
  }

  let docs = [];
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(docsDir, file), 'utf-8');
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        const fm = yaml.load(match[1]) || {};
        docs.push({
          id: fm.id || 'Unknown',
          title: fm.title || 'Untitled',
          type: fm.type || 'guide',
          status: fm.status || 'draft',
          tags: normalizeTags(fm.tags),
          file
        });
      }
    } catch {
      console.warn(`⚠️  Could not parse doc: ${file}`);
    }
  }

  if (type) docs = docs.filter(d => d.type === type);
  if (status) docs = docs.filter(d => d.status === status);
  if (tag) docs = docs.filter(d => d.tags.includes(tag));

  docs.sort((a, b) => {
    const na = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
    const nb = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
    return na - nb;
  });

  const filters = [
    type ? `type: ${type}` : '',
    status ? `status: ${status}` : '',
    tag ? `tag: ${tag}` : ''
  ].filter(Boolean).join(', ');

  if (docs.length === 0) {
    console.log(filters ? `No docs found (${filters}).` : 'No docs found.');
    return;
  }

  console.log('\n📚 VibeKit Docs 📚\n');

  const idWidth = 10;
  const typeWidth = 12;
  const statusWidth = 11;
  const titleWidth = 40;

  console.log(
    `${'ID'.padEnd(idWidth)}| ${'TYPE'.padEnd(typeWidth)}| ${'STATUS'.padEnd(statusWidth)}| TITLE`
  );
  console.log(`${'-'.repeat(idWidth)}+${'-'.repeat(typeWidth + 1)}+${'-'.repeat(statusWidth + 1)}+${'-'.repeat(titleWidth)}`);

  for (const doc of docs) {
    let statusColor = '\x1b[0m';
    if (doc.status === 'published') statusColor = '\x1b[32m';
    else if (doc.status === 'review') statusColor = '\x1b[36m';
    else if (doc.status === 'draft') statusColor = '\x1b[33m';

    const title = doc.title.length > titleWidth - 3
      ? doc.title.substring(0, titleWidth - 3) + '...'
      : doc.title;

    console.log(
      `${doc.id.padEnd(idWidth)}| ${doc.type.padEnd(typeWidth)}| ${statusColor}${doc.status.padEnd(statusWidth)}\x1b[0m| ${title}`
    );
  }

  console.log(`${'-'.repeat(idWidth)}+${'-'.repeat(typeWidth + 1)}+${'-'.repeat(statusWidth + 1)}+${'-'.repeat(titleWidth)}`);
  console.log(`Found ${docs.length} doc(s)${filters ? ` (${filters})` : ''}.\n`);
}

export default listDocs;
