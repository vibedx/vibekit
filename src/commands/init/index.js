import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import getStartedCommand from '../get-started/index.js';
import { arrowSelect } from '../../utils/arrow-select.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES = [
  { name: 'default', value: 'default', description: 'Minimal project conventions' },
  { name: 'react', value: 'react', description: 'React/frontend best practices' },
  { name: 'node', value: 'node', description: 'Node.js backend guidelines' },
  { name: 'python', value: 'python', description: 'Python project conventions' },
  { name: 'karpathy', value: 'karpathy', description: 'Karpathy-style dev philosophy' },
];

function getTemplateDir(templateName) {
  return path.join(__dirname, '../../../assets/templates', templateName);
}

function listTemplates() {
  console.log('\n📋 Available templates:\n');
  for (const t of TEMPLATES) {
    console.log(`  ${t.value.padEnd(20)} ${t.description}`);
  }
  console.log('\nUsage: vibe init --template <name>');
  console.log('       vibe init --template          (interactive picker)\n');
}

function applyTemplate(templateName, targetDir) {
  const templateDir = getTemplateDir(templateName);
  if (!fs.existsSync(templateDir)) {
    console.error(`❌ Template "${templateName}" not found.`);
    process.exit(1);
  }

  const claudeMdSrc = path.join(templateDir, 'claude.md');
  if (fs.existsSync(claudeMdSrc)) {
    const destDir = path.join(targetDir, '.claude');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const destPath = path.join(targetDir, 'CLAUDE.md');
    if (fs.existsSync(destPath)) {
      console.log(`⚠️  CLAUDE.md already exists — skipping (template: ${templateName})`);
    } else {
      fs.copyFileSync(claudeMdSrc, destPath);
      console.log(`✅ CLAUDE.md created from "${templateName}" template`);
    }
  }

  const agentsSrc = path.join(templateDir, 'agents');
  if (fs.existsSync(agentsSrc)) {
    const agentsDest = path.join(targetDir, '.claude', 'agents');
    if (!fs.existsSync(agentsDest)) {
      fs.mkdirSync(agentsDest, { recursive: true });
    }
    for (const file of fs.readdirSync(agentsSrc)) {
      fs.copyFileSync(path.join(agentsSrc, file), path.join(agentsDest, file));
    }
    console.log(`✅ Agent definitions copied from "${templateName}" template`);
  }

  const settingsSrc = path.join(templateDir, 'settings.json');
  if (fs.existsSync(settingsSrc)) {
    const settingsDest = path.join(targetDir, '.claude', 'settings.json');
    if (!fs.existsSync(settingsDest)) {
      const claudeDir = path.join(targetDir, '.claude');
      if (!fs.existsSync(claudeDir)) {
        fs.mkdirSync(claudeDir, { recursive: true });
      }
      fs.copyFileSync(settingsSrc, settingsDest);
      console.log(`✅ .claude/settings.json created from "${templateName}" template`);
    }
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
          name: `${t.value} — ${t.description}`,
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
    fs.mkdirSync(path.join(targetFolder, '.templates'), { recursive: true });

    fs.copyFileSync(configSrc, path.join(targetFolder, 'config.yml'));
    fs.copyFileSync(templateSrc, path.join(targetFolder, '.templates', 'default.md'));
    fs.copyFileSync(teamSrc, path.join(targetFolder, 'team.yml'));

    console.log(`✅ '${targetFolder}' initialized with config, tickets/, and .templates/default.md`);
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
