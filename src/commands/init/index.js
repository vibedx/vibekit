import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import getStartedCommand from '../get-started/index.js';
import { arrowSelect } from '../../utils/arrow-select.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES = [
  { name: 'default', value: 'default', category: 'coding', description: 'Minimal project conventions' },
  { name: 'karpathy', value: 'karpathy', category: 'coding', description: 'Karpathy-style dev philosophy' },
  { name: 'react', value: 'react', category: 'frameworks', description: 'React/frontend best practices' },
  { name: 'node', value: 'node', category: 'languages', description: 'Node.js backend guidelines' },
  { name: 'python', value: 'python', category: 'languages', description: 'Python project conventions' },
];

function getTemplatePath(templateName) {
  const template = TEMPLATES.find(t => t.value === templateName);
  if (!template) return null;
  return path.join(__dirname, '../../../assets/standards', template.category, `${templateName}.md`);
}

function listTemplates() {
  console.log('\n📋 Available templates:\n');
  const categories = [...new Set(TEMPLATES.map(t => t.category))];
  for (const cat of categories) {
    console.log(`  ${cat}/`);
    for (const t of TEMPLATES.filter(t => t.category === cat)) {
      console.log(`    ${t.value.padEnd(18)} ${t.description}`);
    }
  }
  console.log('\nUsage: vibe init --template <name>');
  console.log('       vibe init --template          (interactive picker)\n');
}

function applyTemplate(templateName, targetDir) {
  const templatePath = getTemplatePath(templateName);
  if (!templatePath || !fs.existsSync(templatePath)) {
    console.error(`❌ Template "${templateName}" not found.`);
    process.exit(1);
  }

  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const destPath = path.join(targetDir, 'CLAUDE.md');

  if (fs.existsSync(destPath)) {
    const existing = fs.readFileSync(destPath, 'utf-8');
    const separator = `\n\n<!-- vibekit:template:${templateName} -->\n`;
    if (existing.includes(`vibekit:template:${templateName}`)) {
      console.log(`⚠️  Template "${templateName}" already injected in CLAUDE.md — skipping`);
    } else {
      fs.writeFileSync(destPath, existing.trimEnd() + separator + templateContent);
      console.log(`✅ Template "${templateName}" injected into existing CLAUDE.md`);
    }
  } else {
    fs.writeFileSync(destPath, templateContent);
    console.log(`✅ CLAUDE.md created from "${templateName}" template`);
  }
}

async function initCommand(args) {
  const targetFolder = '.vibe';

  const hasTemplate = args.includes('--template') || args.includes('-t');
  const templateIdx = args.indexOf('--template') !== -1 ? args.indexOf('--template') : args.indexOf('-t');
  const listOnly = args.includes('--list-templates');

  if (listOnly) {
    listTemplates();
    return;
  }

  let templateName = null;

  if (hasTemplate) {
    const nextArg = args[templateIdx + 1];
    if (nextArg && !nextArg.startsWith('-')) {
      templateName = nextArg;
      const valid = TEMPLATES.find(t => t.value === templateName);
      if (!valid) {
        console.error(`❌ Unknown template: "${templateName}"`);
        listTemplates();
        process.exit(1);
      }
    } else {
      try {
        const choices = TEMPLATES.map(t => ({
          name: `${t.category}/${t.value} — ${t.description}`,
          value: t.value
        }));
        templateName = await arrowSelect('Select a template:', choices);
      } catch {
        console.log('\nNo template selected.');
        return;
      }
    }
  }

  if (!fs.existsSync(targetFolder)) {
    const templateSrc = path.join(__dirname, '../../../assets', 'default.md');
    const configSrc = path.join(__dirname, '../../../assets', 'config.yml');
    const teamSrc = path.join(__dirname, '../../../assets', 'team.yml');

    fs.mkdirSync(targetFolder, { recursive: true });
    fs.mkdirSync(path.join(targetFolder, 'tickets'), { recursive: true });
    fs.mkdirSync(path.join(targetFolder, 'plans'), { recursive: true });
    fs.mkdirSync(path.join(targetFolder, '.templates'), { recursive: true });

    fs.copyFileSync(configSrc, path.join(targetFolder, 'config.yml'));
    fs.copyFileSync(templateSrc, path.join(targetFolder, '.templates', 'default.md'));
    fs.copyFileSync(teamSrc, path.join(targetFolder, 'team.yml'));

    console.log(`✅ '${targetFolder}' initialized with config, tickets/, plans/, and .templates/default.md`);
  } else {
    console.log(`⚠️  Folder '${targetFolder}' already exists. Skipping .vibe creation.`);
  }

  if (templateName) {
    applyTemplate(templateName, process.cwd());
  }

  const runGetStarted = args.includes('--with-samples') || args.includes('-s');
  if (runGetStarted) {
    getStartedCommand([]);
  } else if (!templateName) {
    console.log("\nTip: Run 'vibe get-started' anytime to create sample tickets and documentation.");
    console.log("     Run 'vibe init --template' to set up CLAUDE.md from a curated template.");
  }
}

export default initCommand;
