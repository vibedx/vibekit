import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import yaml from 'js-yaml';

const CLAUDE_CODE_INSTALL_URL = 'https://docs.anthropic.com/en/docs/claude-code';
const CLAUDE_DETECT_TIMEOUT = 5000;

/**
 * Load existing .vibe/config.yml
 * @returns {Object} Parsed config object
 */
function loadConfig() {
  const configPath = path.join(process.cwd(), '.vibe', 'config.yml');

  if (!fs.existsSync(configPath)) {
    console.error('❌ No .vibe/config.yml found. Run "vibe init" first.');
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return yaml.load(content);
  } catch (error) {
    console.error('❌ Error reading config.yml:', error.message);
    process.exit(1);
  }
}

/**
 * Save updated config to .vibe/config.yml (no sensitive data stored)
 * @param {Object} config - Config object to persist
 * @returns {boolean} True on success
 */
function saveConfig(config) {
  const configPath = path.join(process.cwd(), '.vibe', 'config.yml');

  try {
    const yamlContent = yaml.dump(config, { indent: 2, lineWidth: -1, noRefs: true });
    fs.writeFileSync(configPath, yamlContent, 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Error saving config.yml:', error.message);
    return false;
  }
}

/**
 * Check if the Claude Code CLI is installed and accessible
 * @returns {Promise<{ installed: boolean, version: string | null }>}
 */
function detectClaudeCode() {
  return new Promise((resolve) => {
    let stdout = '';

    const child = spawn('claude', ['--version'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ installed: false, version: null });
    }, CLAUDE_DETECT_TIMEOUT);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ installed: true, version: stdout.trim() || null });
      } else {
        resolve({ installed: false, version: null });
      }
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve({ installed: false, version: null });
    });
  });
}

/**
 * Create AI workflow instructions from the assets template
 * @returns {Promise<boolean>} True on success
 */
async function createAiInstructions() {
  try {
    const instructionsDir = path.join(process.cwd(), '.context', 'instructions');

    if (!fs.existsSync(instructionsDir)) {
      fs.mkdirSync(instructionsDir, { recursive: true });
    }

    const templatePath = path.join(process.cwd(), 'assets', 'instructions', 'claude.md');
    const outputPath = path.join(instructionsDir, 'claude.md');

    if (fs.existsSync(templatePath)) {
      fs.writeFileSync(outputPath, fs.readFileSync(templatePath, 'utf8'), 'utf8');
    } else {
      fs.writeFileSync(outputPath, buildFallbackInstructions(), 'utf8');
    }

    console.log('📄 Created .context/instructions/claude.md');
    return true;
  } catch (error) {
    console.warn('⚠️  Could not create AI instructions:', error.message);
    return false;
  }
}

/**
 * Fallback instructions if the assets template is missing
 * @returns {string} Markdown instruction content
 */
function buildFallbackInstructions() {
  return `# VibeKit Instructions for Claude

This project uses VibeKit for organised, ticket-driven development.

## Primary Rule: Always Work Through Tickets
1. Create a ticket first: \`vibe new\`
2. Start working: \`vibe start <ticket-id>\`
3. Close when done: \`vibe close <ticket-id>\`

For detailed instructions, see the VibeKit documentation.
`;
}

/**
 * Print install instructions for Claude Code CLI
 */
function printInstallInstructions() {
  console.log('\n📦 Install Claude Code to continue:\n');
  console.log('   npm install -g @anthropic-ai/claude-code');
  console.log(`\n📖 Documentation: ${CLAUDE_CODE_INSTALL_URL}`);
  console.log('\nOnce installed, run "vibe link" again.\n');
}

/**
 * Main link command — detects Claude Code CLI and configures the project
 */
async function linkCommand() {
  console.log('🔗 Linking VibeKit to Claude Code\n');

  const config = loadConfig();

  console.log('🔍 Detecting Claude Code CLI...');
  const { installed, version } = await detectClaudeCode();

  if (!installed) {
    console.error('❌ Claude Code CLI not found.');
    printInstallInstructions();
    process.exit(1);
  }

  const versionLabel = version ? ` (${version})` : '';
  console.log(`✅ Claude Code detected${versionLabel}`);

  config.ai = {
    ...config.ai,
    enabled: true,
    provider: 'claude-code',
  };

  if (!saveConfig(config)) {
    console.error('❌ Failed to save configuration.');
    process.exit(1);
  }

  console.log('✅ Configuration updated');

  await createAiInstructions();

  console.log('\n🎉 Claude Code linked successfully!');
  console.log('   You can now use AI features like "vibe refine"\n');
}

export default linkCommand;
