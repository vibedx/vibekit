import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import yaml from 'js-yaml';

/**
 * Create readline interface for user input
 */
function createReadlineInterface() {
  return createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for input with question
 */
function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Load existing config.yml
 */
function loadConfig() {
  const configPath = path.join(process.cwd(), '.vibe', 'config.yml');
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ No .vibe/config.yml found. Run "vibe init" first.');
    process.exit(1);
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    return yaml.load(configContent);
  } catch (error) {
    console.error('❌ Error reading config.yml:', error.message);
    process.exit(1);
  }
}

/**
 * Save updated config.yml
 */
function saveConfig(config) {
  const configPath = path.join(process.cwd(), '.vibe', 'config.yml');
  
  try {
    const yamlContent = yaml.dump(config, { 
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });
    fs.writeFileSync(configPath, yamlContent, 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Error saving config.yml:', error.message);
    return false;
  }
}

/**
 * Main unlink command implementation
 */
async function unlinkCommand() {
  console.log('🔓 VibeKit AI Provider Removal\n');
  
  const config = loadConfig();
  const rl = createReadlineInterface();
  
  try {
    // Check if AI is currently configured
    if (!config.ai || !config.ai.enabled) {
      console.log('ℹ️  No AI provider is currently configured.');
      rl.close();
      return;
    }
    
    // Show current configuration
    console.log('📝 Current AI configuration:');
    console.log(`   Provider: ${config.ai.provider === 'claude-code' ? 'Claude Code (Anthropic API)' : config.ai.provider}`);
    console.log(`   Model: ${config.ai.model || 'Not specified'}`);
    console.log(`   Status: ${config.ai.enabled ? 'Enabled' : 'Disabled'}`);
    console.log();
    
    // Confirm removal
    const confirmRemoval = await askQuestion(rl, '? Are you sure you want to disable AI features? (y/n): ');
    
    if (confirmRemoval.toLowerCase() !== 'y' && confirmRemoval.toLowerCase() !== 'yes') {
      console.log('🚫 Cancelled. AI configuration unchanged.');
      rl.close();
      return;
    }
    
    // Simply disable AI in config (no credential storage to remove)
    config.ai = {
      ...config.ai,
      enabled: false,
      provider: 'none'
    };
    
    if (saveConfig(config)) {
      console.log('✅ AI features disabled successfully!');
      console.log('🔓 AI provider has been unlinked.');
      console.log('\n💡 Your API keys in environment variables or .env files remain unchanged.');
      console.log('💡 Run "vibe link" anytime to re-enable AI features.');
    } else {
      console.log('❌ Failed to save configuration changes.');
    }
    
  } catch (error) {
    console.error('❌ Error during removal:', error.message);
  } finally {
    rl.close();
  }
}

export default unlinkCommand;