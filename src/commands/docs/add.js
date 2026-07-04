import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getProjectRoot, getConfig, createSlug } from '../../utils/index.js';
import { getDocsDir, getNextDocId } from '../../utils/doc.js';
import { logger } from '../../utils/cli.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_TYPE = 'guide';

// Doc type -> template filename (bundled and project-local share names, guide -> default)
const TYPE_TEMPLATES = {
  guide: 'default.md',
  'design-doc': 'design-doc.md',
  'code-doc': 'code-doc.md',
  faq: 'faq.md'
};

/**
 * Parse `vibe docs add` arguments.
 * @param {string[]} args
 * @returns {{title: string, type: string, edit: boolean}}
 */
function parseArguments(args) {
  const titleParts = [];
  let type = null;
  let edit = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--type' && i + 1 < args.length) {
      type = args[i + 1];
      i++;
    } else if (arg === '--edit' || arg === '-e') {
      edit = true;
    } else if (!arg.startsWith('--')) {
      titleParts.push(arg);
    }
  }

  const title = titleParts.join(' ').trim();
  if (!title) {
    throw new Error('Please provide a title. Usage: vibe docs add "title" [--type <type>]');
  }

  return { title, type, edit };
}

/**
 * Resolve the type, falling back to the default if unrecognised.
 * @param {string|null} type
 * @param {Object} config
 * @returns {string}
 */
function resolveType(type, config) {
  const defaultType = config.docs?.default_type || DEFAULT_TYPE;
  if (!type) {
    return defaultType;
  }
  if (!TYPE_TEMPLATES[type]) {
    logger.warning(`Unknown doc type '${type}'. Falling back to '${defaultType}'.`);
    return defaultType;
  }
  return type;
}

/**
 * Load the template for a type: project-local first, then bundled asset.
 * @param {string} type
 * @param {string} root
 * @returns {string}
 */
function loadTemplate(type, root) {
  const templateFile = TYPE_TEMPLATES[type] || TYPE_TEMPLATES[DEFAULT_TYPE];
  const projectTemplate = path.join(root, '.vibe', '.templates', 'docs', templateFile);
  const bundledTemplate = path.join(__dirname, '../../../assets', 'docs', templateFile);

  if (fs.existsSync(projectTemplate)) {
    return fs.readFileSync(projectTemplate, 'utf-8');
  }
  if (fs.existsSync(bundledTemplate)) {
    return fs.readFileSync(bundledTemplate, 'utf-8');
  }
  throw new Error(`No template found for type '${type}'. Run "vibe init" to scaffold doc templates.`);
}

/**
 * Fill template placeholders.
 * @param {string} template
 * @param {{id: string, title: string, slug: string, type: string, timestamp: string}} data
 * @returns {string}
 */
function fillTemplate(template, { id, title, slug, type, timestamp }) {
  return template
    .replace(/{id}/g, id)
    .replace(/{title}/g, title)
    .replace(/{slug}/g, slug)
    .replace(/{date}/g, timestamp)
    .replace(/^type: .*$/m, `type: ${type}`);
}

/**
 * Open a file in $EDITOR.
 * @param {string} filePath
 */
function openInEditor(filePath) {
  const editor = process.env.EDITOR || process.env.VISUAL;
  if (!editor) {
    logger.warning('No $EDITOR set — skipping auto-open.');
    return;
  }
  const child = spawn(editor, [filePath], { stdio: 'inherit' });
  child.on('error', (err) => {
    logger.warning(`Could not open editor: ${err.message}`);
  });
}

/**
 * `vibe docs add` — create a new doc from a template.
 * @param {string[]} args
 */
async function addDoc(args) {
  try {
    const { title, type: rawType, edit } = parseArguments(args);
    const root = getProjectRoot();
    const config = getConfig();

    const type = resolveType(rawType, config);
    const template = loadTemplate(type, root);

    const id = getNextDocId();
    const slug = createSlug(title, config);
    const filename = `${id}-${slug}.md`;
    const timestamp = new Date().toISOString().split('T')[0];

    const docsDir = getDocsDir();
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const outputPath = path.join(docsDir, filename);
    const content = fillTemplate(template, { id, title, slug, type, timestamp });

    fs.writeFileSync(outputPath, content, 'utf-8');

    const relativePath = path.relative(process.cwd(), outputPath);
    logger.success(`Created ${id} (${type}): ${relativePath}`);

    if (edit) {
      openInEditor(outputPath);
    }
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

export default addDoc;
