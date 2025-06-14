import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';
import yaml from 'js-yaml';

const SUPPORTED_PROVIDERS = {
  'claude-code': 'Claude Code (Anthropic)'
};

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
 * Prompt user for password/API key (hidden input)
 */
function askSecretQuestion(rl, question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    
    // Use readline's built-in password functionality instead of raw mode
    const stdin = process.stdin;
    const originalMode = stdin.isTTY ? stdin.setRawMode : null;
    
    if (stdin.isTTY && originalMode) {
      stdin.setRawMode(true);
    }
    
    let input = '';
    const onData = (buffer) => {
      const char = buffer.toString('utf8');
      const code = char.charCodeAt(0);
      
      if (code === 13 || code === 10) { // Enter key (CR or LF)
        if (stdin.isTTY && originalMode) {
          stdin.setRawMode(false);
        }
        stdin.removeListener('data', onData);
        console.log(); // New line
        resolve(input);
      } else if (code === 127 || code === 8) { // Backspace/Delete
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (code === 3) { // Ctrl+C
        if (stdin.isTTY && originalMode) {
          stdin.setRawMode(false);
        }
        stdin.removeListener('data', onData);
        console.log('\n❌ Cancelled');
        process.exit(0);
      } else if (code >= 32 && code <= 126) { // Printable ASCII characters
        input += char;
        process.stdout.write('*');
      }
    };
    
    stdin.on('data', onData);
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
 * Save updated config.yml (without sensitive data)
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
 * Check if .env file exists and contains ANTHROPIC_API_KEY
 */
function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    return { exists: false, hasKey: false };
  }
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasKey = envContent.includes('ANTHROPIC_API_KEY=');
    return { exists: true, hasKey };
  } catch (error) {
    return { exists: false, hasKey: false };
  }
}

/**
 * Create or update .env file with API key
 */
async function createEnvFile(rl) {
  const envPath = path.join(process.cwd(), '.env');
  const envInfo = checkEnvFile();
  
  console.log('\n📝 Setting up .env file for secure API key storage');
  
  if (envInfo.exists && envInfo.hasKey) {
    console.log('⚠️  .env file already contains ANTHROPIC_API_KEY');
    const overwrite = await askQuestion(rl, '? Update the existing API key? (y/n): ');
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      return false;
    }
  }
  
  const apiKey = await askSecretQuestion(rl, '? Enter your Claude API key: ');
  
  if (!apiKey) {
    console.log('❌ API key is required.');
    return false;
  }
  
  // Validate API key first
  console.log('🔍 Validating API key...');
  const validation = validateClaudeApiKey(apiKey);
  
  if (!validation.valid) {
    console.log(`❌ ${validation.error}`);
    return false;
  }
  
  try {
    let envContent = '';
    
    if (envInfo.exists) {
      // Read existing .env and update/add ANTHROPIC_API_KEY
      envContent = fs.readFileSync(envPath, 'utf8');
      
      if (envInfo.hasKey) {
        // Replace existing key
        envContent = envContent.replace(/ANTHROPIC_API_KEY=.*$/m, `ANTHROPIC_API_KEY=${apiKey}`);
      } else {
        // Add new key
        envContent += envContent.endsWith('\n') ? '' : '\n';
        envContent += `ANTHROPIC_API_KEY=${apiKey}\n`;
      }
    } else {
      // Create new .env file
      envContent = `# Environment variables for VibeKit
ANTHROPIC_API_KEY=${apiKey}
`;
    }
    
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ API key saved to .env file');
    console.log('🔒 Make sure .env is in your .gitignore');
    
    // Update the current process environment
    process.env.ANTHROPIC_API_KEY = apiKey;
    
    return true;
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
    return false;
  }
}

/**
 * Create AI instructions for Claude Code from template
 */
async function createAiInstructions() {
  try {
    // Create .context/instructions directory
    const instructionsDir = path.join(process.cwd(), '.context', 'instructions');
    if (!fs.existsSync(instructionsDir)) {
      fs.mkdirSync(instructionsDir, { recursive: true });
    }
    
    // Copy claude instructions from assets template
    const templatePath = path.join(process.cwd(), 'assets', 'instructions', 'claude.md');
    const claudeInstructionsPath = path.join(instructionsDir, 'claude.md');
    
    if (fs.existsSync(templatePath)) {
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      fs.writeFileSync(claudeInstructionsPath, templateContent, 'utf8');
      console.log('📄 Created .context/instructions/claude.md from template');
    } else {
      console.warn('⚠️  Template not found, creating basic instructions');
      const basicContent = `# VibeKit Instructions for Claude

This project uses VibeKit for organized development.

## Primary Rule: Always Work Through Tickets
1. Create ticket first: \`vibe new\`
2. Start working: \`vibe start <ticket-id>\`
3. Close when done: \`vibe close <ticket-id>\`

For detailed instructions, see the VibeKit documentation.
`;
      fs.writeFileSync(claudeInstructionsPath, basicContent, 'utf8');
    }
    
    // Create a README for the .context/instructions folder
    const readmePath = path.join(instructionsDir, 'README.md');
    const readmeContent = `# AI Instructions

This folder contains instructions for different AI coding assistants.

## Files
- \`claude.md\` - Instructions for Claude Code (Anthropic)
- \`codex.md\` - Instructions for OpenAI Codex (coming soon)

## Important Notes
- These files are automatically read by AI assistants
- Only modify if you understand how AI instructions work
- Changes affect how AI assistants interact with this project
- Maintained by VibeKit for consistent development workflow

## Current Status
- ✅ Claude Code - Active and configured
- 🚧 OpenAI Codex - Coming soon
`;

    fs.writeFileSync(readmePath, readmeContent, 'utf8');
    console.log('📄 Created .context/instructions/README.md with folder documentation');
    
    return true;
  } catch (error) {
    console.warn('⚠️  Could not create AI instructions:', error.message);
    return false;
  }
}

/**
 * Validate Claude API key format
 */
function validateClaudeApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valid: false, error: 'API key is required' };
  }
  
  if (!apiKey.startsWith('sk-ant-api')) {
    return { valid: false, error: 'Invalid Claude API key format' };
  }
  
  return { valid: true };
}

/**
 * Main link command implementation
 */
async function linkCommand() {
  console.log('🔗 VibeKit AI Provider Setup\n');
  
  const config = loadConfig();
  const rl = createReadlineInterface();
  
  try {
    // Check for environment variable first
    const envApiKey = process.env.ANTHROPIC_API_KEY;
    if (envApiKey) {
      console.log('🔍 Found ANTHROPIC_API_KEY in environment variables');
      const useEnvKey = await askQuestion(rl, '? Use this API key? (y/n): ');
      
      if (useEnvKey.toLowerCase() === 'y' || useEnvKey.toLowerCase() === 'yes') {
        console.log('🔍 Validating API key...');
        const validation = validateClaudeApiKey(envApiKey);
        
        if (validation.valid) {
          // Update config (never store API key in config)
          config.ai = {
            ...config.ai,
            provider: 'claude-code',
            enabled: true
          };
          
          if (saveConfig(config)) {
            console.log('✅ Environment API key validated!');
            console.log('🔗 Ready for ticket refinement!');
            console.log(`\n📝 Configuration updated:`);
            console.log(`   Provider: ${SUPPORTED_PROVIDERS['claude-code']}`);
            console.log('   Source: Environment variable (ANTHROPIC_API_KEY)');
            console.log('\n💡 You can now use AI features like "vibe refine"');
            
            // Create AI instructions documentation
            await createAiInstructions();
          } else {
            console.log('❌ Failed to save configuration.');
          }
          rl.close();
          return;
        } else {
          console.log(`❌ Environment API key validation failed: ${validation.error}`);
          console.log('Continuing with setup...\n');
        }
      }
    }
    
    // No environment variable found or user chose not to use it
    console.log('\n🔑 API Key Setup Required');
    console.log('To use Claude Code, you need to set up your API key.');
    console.log('\nChoose your preferred method:');
    console.log('1. Export environment variable (recommended)');
    console.log('2. Create .env file');
    console.log();
    
    const methodChoice = await askQuestion(rl, '? Choose setup method (1-2): ');
    
    if (methodChoice === '1') {
      // Guide user to export environment variable
      console.log('\n📋 To set up environment variable:');
      console.log('\n🔹 For current session:');
      console.log('   export ANTHROPIC_API_KEY="your-api-key-here"');
      console.log('\n🔹 For permanent setup (add to ~/.bashrc or ~/.zshrc):');
      console.log('   echo \'export ANTHROPIC_API_KEY="your-api-key-here"\' >> ~/.bashrc');
      console.log('\n💡 After setting the environment variable, run "vibe link" again.');
      rl.close();
      return;
    } else if (methodChoice === '2') {
      // Create .env file
      const envCreated = await createEnvFile(rl);
      
      if (envCreated) {
        // Update config 
        config.ai = {
          ...config.ai,
          provider: 'claude-code',
          enabled: true
        };
        
        if (saveConfig(config)) {
          console.log('🔗 Ready for ticket refinement!');
          console.log(`\n📝 Configuration updated:`);
          console.log(`   Provider: ${SUPPORTED_PROVIDERS['claude-code']}`);
          console.log('   Source: .env file');
          console.log('\n💡 You can now use AI features like "vibe refine"');
          
          // Create AI instructions documentation
          await createAiInstructions();
        } else {
          console.log('❌ Failed to save configuration.');
        }
      }
    } else {
      console.log('❌ Invalid choice. Please run the command again.');
    }
    
  } catch (error) {
    console.error('❌ Error during setup:', error.message);
  } finally {
    rl.close();
  }
}

export default linkCommand;