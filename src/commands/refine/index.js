import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { resolveTicketId, parseTicket, updateTicket } from '../../utils/ticket.js';
import { select, spinner, input, logger } from '../../utils/cli.js';
import { arrowSelect } from '../../utils/arrow-select.js';

// Configuration constants
const CLAUDE_SDK_TIMEOUT = 30000;
const ENHANCEMENT_MODEL = 'claude-3-5-sonnet-latest';

/**
 * Load VibeKit configuration
 * @returns {Object} Configuration object
 * @throws {Error} If configuration cannot be loaded
 */
function loadConfig() {
  const configPath = path.join(process.cwd(), '.vibe', 'config.yml');
  
  if (!fs.existsSync(configPath)) {
    throw new Error('No .vibe/config.yml found. Run "vibe init" first.');
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent);
    
    if (!config) {
      throw new Error('Configuration file is empty or invalid');
    }
    
    return config;
  } catch (error) {
    throw new Error(`Error reading config.yml: ${error.message}`);
  }
}

/**
 * Check if Claude Code SDK is available
 * @returns {Promise<boolean>} True if SDK is available
 */
async function checkClaudeCodeSDK() {
  try {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve) => {
      const child = spawn('claude', ['--version'], { 
        stdio: 'pipe',
        timeout: 5000
      });
      
      child.on('close', (code) => {
        resolve(code === 0);
      });
      
      child.on('error', () => {
        resolve(false);
      });
      
      // Timeout fallback
      const timeout = setTimeout(() => {
        try {
          child.kill('SIGTERM');
        } catch (killError) {
          // Ignore kill errors
        }
        resolve(false);
      }, 5000);
      
      child.on('exit', () => {
        clearTimeout(timeout);
      });
    });
  } catch (error) {
    return false;
  }
}

/**
 * Check if AI is configured and Claude Code SDK is available
 * @returns {Promise<Object>} AI configuration status
 * @throws {Error} If configuration check fails
 */
async function checkAiConfiguration() {
  try {
    const config = loadConfig();
    
    // Check if AI is enabled in config
    if (!config.ai || !config.ai.enabled || config.ai.provider === 'none') {
      return { 
        configured: false, 
        needsSetup: false,
        reason: 'AI is not enabled in configuration'
      };
    }
    
    // Check for Claude Code SDK availability
    const sdkAvailable = await checkClaudeCodeSDK();
    if (sdkAvailable) {
      return { configured: true };
    }
    
    // SDK not available - needs installation
    return { 
      configured: false, 
      needsSetup: true,
      reason: 'Claude Code SDK not found'
    };
  } catch (error) {
    throw new Error(`Failed to check AI configuration: ${error.message}`);
  }
}

/**
 * Show Claude Code SDK installation information
 * @returns {void}
 */
function showClaudeCodeInstallation() {
  logger.error('Claude Code SDK not found.');
  logger.info('VibeKit refine requires Claude Code SDK to enhance tickets.');
  console.log('\nTo install Claude Code SDK, run:');
  console.log('  npm install -g @anthropic-ai/claude-code');
  console.log('\nOr visit: https://docs.anthropic.com/en/docs/claude-code');
  logger.tip('After installation, run this command again.');
}



/**
 * Extract all sections from ticket content
 * @param {string[]} contentLines - Array of content lines
 * @returns {Array} Array of section objects
 */
function extractTicketSections(contentLines) {
  if (!Array.isArray(contentLines)) {
    return [];
  }
  
  const sections = [];
  
  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i];
    
    if (typeof line === 'string' && line.trim().startsWith('## ')) {
      const sectionName = line.substring(3).trim();
      
      if (sectionName) {
        sections.push({
          name: sectionName,
          header: line.trim(),
          index: i
        });
      }
    }
  }
  
  return sections;
}

/**
 * Create enhancement prompt for Claude with dynamic sections
 * @param {Object} ticketData - Parsed ticket data
 * @param {string} refinementGoals - Specific refinement goals
 * @returns {string} Generated prompt for AI enhancement
 * @throws {Error} If ticket data is invalid
 */
function createEnhancementPrompt(ticketData, refinementGoals = '') {
  if (!ticketData || !ticketData.contentLines || !ticketData.metadata) {
    throw new Error('Invalid ticket data provided');
  }
  
  const ticketContent = ticketData.contentLines.join('\n');
  const sections = extractTicketSections(ticketData.contentLines);
  const ticketTitle = ticketData.metadata.title || 'Untitled Ticket';
  
  const goalsText = typeof refinementGoals === 'string' && refinementGoals.trim() ? 
    `\n\nSpecific refinement goals: ${refinementGoals.trim()}` : '';
  
  // Create dynamic JSON structure based on detected sections
  const jsonStructure = {};
  
  sections.forEach(section => {
    const key = section.name.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 50); // Limit key length
    
    if (key) {
      jsonStructure[key] = `enhanced ${section.name.toLowerCase()} content here`;
    }
  });
  
  // Always include slug for filename and title for metadata
  jsonStructure.slug = 'short-kebab-case-description-only';
  jsonStructure.title = 'Clear, descriptive title based on enhanced content';
  
  const jsonExample = JSON.stringify(jsonStructure, null, 2);
  
  return `You are a senior software engineer reviewing and enhancing a development ticket.

Ticket Title: ${ticketTitle}
Current Content:
${ticketContent}${goalsText}

IMPORTANT INSTRUCTIONS:
1. You must respond with ONLY valid JSON - no markdown, explanations, or code blocks
2. Enhance the existing sections found in the ticket
3. Keep responses concise, practical, and actionable
4. Generate a descriptive slug (without ticket ID prefix) and clear title
5. Focus on technical clarity and implementation details
6. Make the title descriptive and professional
7. Use developer-friendly formatting:
   - File paths: \`src/components/Button.jsx\`
   - Commands: \`npm install\`, \`vibe new\`, \`git commit\`
   - Functions: \`handleClick()\`, \`useState()\`
   - Code snippets in backticks for inline code
8. Keep "Testing & Test Cases" sections brief (2-4 key test points max)
9. Use "Implementation Notes" for technical details instead of "Notes"
10. Be specific about technical requirements and file locations

Expected JSON format:
${jsonExample}

Response must be valid JSON only.`;
}

/**
 * Execute Claude Code SDK command safely
 * @param {string} prompt - The prompt to send to Claude
 * @returns {Promise<string>} Claude's response
 * @throws {Error} If execution fails
 */
async function executeClaudeCommand(prompt) {
  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Prompt must be a non-empty string');
  }
  
  const { writeFileSync, unlinkSync } = await import('fs');
  const { exec } = await import('child_process');
  const { tmpdir } = await import('os');
  const { join } = await import('path');
  
  return new Promise((resolve, reject) => {
    const tempFile = join(tmpdir(), `vibe-prompt-${Date.now()}-${Math.random().toString(36).substring(7)}.txt`);
    let childProcess = null;
    
    // Cleanup function
    const cleanup = () => {
      try {
        if (fs.existsSync(tempFile)) {
          unlinkSync(tempFile);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      if (childProcess) {
        try {
          childProcess.kill('SIGTERM');
        } catch (killError) {
          // Ignore kill errors
        }
      }
    };
    
    try {
      // Write prompt to temporary file
      writeFileSync(tempFile, prompt, 'utf8');
    } catch (writeError) {
      reject(new Error(`Failed to write prompt file: ${writeError.message}`));
      return;
    }
    
    const command = `cat "${tempFile}" | claude --print --output-format json --model ${ENHANCEMENT_MODEL}`;
    
    childProcess = exec(command, {
      timeout: CLAUDE_SDK_TIMEOUT,
      maxBuffer: 2 * 1024 * 1024, // 2MB buffer
      killSignal: 'SIGTERM'
    }, (error, stdout, stderr) => {
      cleanup();
      
      if (error) {
        // Handle specific error types
        if (error.code === 'ENOENT') {
          reject(new Error('Claude Code SDK not found. Please install it first.'));
        } else if (error.code === 'EACCES') {
          reject(new Error('Permission denied accessing Claude Code SDK.'));
        } else if (error.signal === 'SIGTERM') {
          reject(new Error('Claude SDK operation timed out.'));
        } else {
          reject(new Error(`Claude Code SDK failed: ${error.message}`));
        }
        return;
      }
      
      // Check for stderr output
      if (stderr && stderr.trim()) {
        console.warn(`⚠️  Claude SDK warning: ${stderr.trim()}`);
      }
      
      // Validate stdout
      if (!stdout || stdout.trim() === '') {
        reject(new Error('Claude SDK returned empty response'));
        return;
      }
      
      try {
        // Try to parse as JSON first
        const sdkResponse = JSON.parse(stdout.trim());
        const result = sdkResponse.result || sdkResponse.content || sdkResponse;
        
        if (typeof result === 'string') {
          resolve(result);
        } else {
          resolve(JSON.stringify(result));
        }
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from response
        const jsonMatch = stdout.match(/{[\s\S]*}/);
        if (jsonMatch) {
          try {
            JSON.parse(jsonMatch[0]); // Validate JSON
            resolve(jsonMatch[0]);
          } catch (secondParseError) {
            reject(new Error(`Failed to parse Claude SDK response as JSON: ${secondParseError.message}`));
          }
        } else {
          reject(new Error('Claude SDK response is not valid JSON'));
        }
      }
    });
    
    // Handle process errors
    childProcess.on('error', (error) => {
      cleanup();
      reject(new Error(`Failed to run Claude Code SDK: ${error.message}`));
    });
    
    // Set up timeout handler
    setTimeout(() => {
      if (childProcess && !childProcess.killed) {
        cleanup();
        reject(new Error('Claude SDK operation timed out'));
      }
    }, CLAUDE_SDK_TIMEOUT + 1000);
  });
}

/**
 * Enhance ticket using Claude Code SDK
 * @param {Object} ticketData - Parsed ticket data
 * @param {string} refinementGoals - Specific enhancement goals
 * @returns {Promise<string>} Enhanced content from Claude
 * @throws {Error} If enhancement fails
 */
async function enhanceTicketWithSDK(ticketData, refinementGoals = '') {
  try {
    const prompt = createEnhancementPrompt(ticketData, refinementGoals);
    return await executeClaudeCommand(prompt);
  } catch (error) {
    throw new Error(`Ticket enhancement failed: ${error.message}`);
  }
}


/**
 * Parse AI response from Claude Code SDK with dynamic sections
 * @param {string} aiResponse - Raw AI response
 * @param {Object} ticketData - Original ticket data
 * @returns {Object} Parsed enhancement data
 * @throws {Error} If response cannot be parsed
 */
function parseAiResponse(aiResponse, ticketData) {
  if (typeof aiResponse !== 'string') {
    throw new Error('AI response must be a string');
  }
  
  if (!ticketData || !ticketData.contentLines) {
    throw new Error('Invalid ticket data provided');
  }
  
  let jsonResponse;
  try {
    jsonResponse = JSON.parse(aiResponse.trim());
  } catch (parseError) {
    throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
  }
  
  if (!jsonResponse || typeof jsonResponse !== 'object') {
    throw new Error('AI response is not a valid object');
  }
  
  const sections = extractTicketSections(ticketData.contentLines);
  
  const result = {
    slug: jsonResponse.slug || 'enhanced-ticket',
    title: jsonResponse.title || null
  };
  
  // Validate slug
  if (typeof result.slug !== 'string' || !result.slug.trim()) {
    result.slug = 'enhanced-ticket';
  }
  
  // Validate and clean title
  if (result.title && typeof result.title === 'string' && result.title.trim()) {
    result.title = result.title.trim();
  } else {
    result.title = null; // Don't update title if invalid or empty
  }
  
  // Map JSON keys back to section headers
  sections.forEach(section => {
    const key = section.name.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .substring(0, 50);
    
    if (key && jsonResponse[key]) {
      const content = jsonResponse[key];
      if (typeof content === 'string' && content.trim()) {
        result[section.name] = content.trim();
      }
    }
  });
  
  // Ensure we have at least some enhanced content
  const hasEnhancedContent = Object.keys(result).some(key => 
    key !== 'slug' && key !== 'title' && result[key]
  );
  
  if (!hasEnhancedContent) {
    throw new Error('AI response contains no enhanced content for existing sections');
  }
  
  return result;
}



/**
 * Validate command arguments
 * @param {Array} args - Command arguments
 * @throws {Error} If arguments are invalid
 */
function validateArguments(args) {
  if (!Array.isArray(args) || args.length === 0 || !args[0]) {
    throw new Error('Please provide a ticket ID. Usage: vibe refine <ticket-id>\n   Examples: vibe refine 8, vibe refine TKT-008, vibe refine 008');
  }
}

/**
 * Get refinement goals based on command context
 * @param {boolean} fromNewCommand - Whether called from new command
 * @returns {Promise<string>} Refinement goals
 */
async function getRefinementGoals(fromNewCommand) {
  if (fromNewCommand) {
    return 'technical details, code quality, general enhancement, testing - keep it technical and respect existing code boundaries';
  }
  
  logger.step('What specific improvements would you like to focus on?');
  return await input('Enter your refinement goals', {
    defaultValue: 'general enhancement'
  });
}

/**
 * Handle interactive refinement options
 * @returns {Promise<string>} User's choice
 */
async function handleRefinementOptions() {
  console.log('\n🔧 Refinement Options');
  
  let choice;
  try {
    choice = await arrowSelect('Choose an action', [
      { name: 'Apply refinements to ticket', value: '1' },
      { name: 'Ask for changes/improvements', value: '2' },
      { name: 'View diff in terminal', value: '3' },
      { name: 'Cancel and exit', value: '4' }
    ], '1');
  } catch (arrowError) {
    console.log('Arrow select failed, falling back to numbered selection...');
    choice = await select('Choose an action', [
      { name: 'Apply refinements to ticket', value: '1' },
      { name: 'Ask for changes/improvements', value: '2' },
      { name: 'View diff in terminal', value: '3' },
      { name: 'Cancel and exit', value: '4' }
    ], '1');
  }
  
  return choice;
}

/**
 * Apply refinements to ticket
 * @param {Object} sections - Enhanced sections
 * @param {Object} ticketInfo - Ticket info
 * @param {Object} ticketData - Original ticket data
 * @returns {Promise<void>}
 */
async function applyRefinements(sections, ticketInfo, ticketData) {
  const updates = {
    slug: sections.slug
  };
  
  // Add title if provided
  if (sections.title) {
    updates.title = sections.title;
  }
  
  // Add all dynamic sections to updates
  Object.keys(sections).forEach(sectionName => {
    if (sectionName !== 'slug' && sectionName !== 'title') {
      updates[sectionName] = sections[sectionName];
    }
  });
  
  const result = updateTicket(ticketInfo.path, ticketData, updates);
  if (result.success) {
    logger.success(`Ticket ${ticketInfo.id} has been refined and updated!`);
    logger.info('Review the updated ticket and make any additional adjustments as needed.');
    if (result.message) {
      logger.info(result.message);
    }
    
    // Force immediate cleanup and exit
    process.stdin.removeAllListeners();
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    
    // Force exit after brief cleanup
    setTimeout(() => {
      process.exit(0);
    }, 100);
  }
}

/**
 * Request followup changes
 * @param {Object} currentSections - Current enhanced sections
 * @param {Object} ticketData - Original ticket data
 * @returns {Promise<Object>} Updated sections
 */
async function requestFollowupChanges(currentSections, ticketData) {
  logger.step('What changes would you like?');
  const followupRequest = await input('Enter your changes', { required: true });
  
  if (!followupRequest.trim()) {
    return currentSections;
  }
  
  const loadingSpinner = spinner('🔄 Processing your request...');
  
  try {
    // Create a followup prompt with dynamic sections
    const sectionsList = Object.keys(currentSections)
      .filter(key => key !== 'slug' && currentSections[key])
      .map(key => `PREVIOUS ${key.toUpperCase()}:\n${currentSections[key] || 'Not provided'}`)
      .join('\n\n');

    const followupPrompt = `Previous enhancement for ticket "${(ticketData.metadata && ticketData.metadata.title) || 'Unknown'}":

${sectionsList}

USER REQUEST: ${followupRequest}

Please provide updated enhancements based on the user's request. Return ONLY a JSON object with the same section keys as provided above.`;

    const refinedResponse = await enhanceTicketWithSDK({ 
      contentLines: [followupPrompt],
      metadata: ticketData.metadata || {}
    });
    
    loadingSpinner.succeed('Suggestions updated!');
    return parseAiResponse(refinedResponse, ticketData);
    
  } catch (error) {
    loadingSpinner.fail('Failed to refine suggestions');
    
    if (error.message.includes('Claude Code SDK failed')) {
      logger.error('AI enhancement service is unavailable. Please try again later.');
      logger.tip('You can continue with the current refinements or cancel.');
    } else {
      logger.error('Failed to process your request. Please try again with different input.');
    }
    
    return currentSections;
  }
}

/**
 * View refinement diff
 * @param {Object} sections - Enhanced sections
 * @returns {Promise<void>}
 */
async function viewDiff(sections) {
  // Clear terminal for clean diff view
  process.stdout.write('\x1b[2J\x1b[H');
  
  console.log('═'.repeat(80));
  console.log('📊 TICKET REFINEMENT DIFF');
  console.log('═'.repeat(80));
  
  // Show title if updated
  if (sections.title) {
    console.log(`\n🔹 Title (refined):`);
    console.log('─'.repeat(40));
    console.log(sections.title);
  }
  
  // Show all dynamic sections that were enhanced
  Object.keys(sections).forEach(sectionName => {
    if (sectionName !== 'slug' && sectionName !== 'title' && sections[sectionName]) {
      console.log(`\n🔹 ${sectionName} (refined):`);
      console.log('─'.repeat(40));
      console.log(sections[sectionName]);
    }
  });
  
  console.log('\n' + '═'.repeat(80));
  await input('Press Enter to continue', { defaultValue: '' });
  
  // Clear terminal again after viewing diff
  process.stdout.write('\x1b[2J\x1b[H');
}

/**
 * Main refine command implementation
 * @param {Array} args - Command arguments
 * @param {Object} options - Command options
 * @returns {Promise<void>}
 */
async function refineCommand(args, options = {}) {
  const { fromNewCommand = false } = options;
  
  try {
    // Validate arguments
    validateArguments(args);
    const ticketInput = args[0];
    
    logger.step(`Analyzing ticket ${ticketInput}...`);
    
    // Check AI configuration
    const aiStatus = await checkAiConfiguration();
    if (!aiStatus.configured) {
      if (aiStatus.needsSetup) {
        showClaudeCodeInstallation();
      } else {
        logger.error('AI is not enabled in config. Run "vibe link" first.');
      }
      throw new Error(aiStatus.reason || 'AI configuration check failed');
    }
  
    // Resolve ticket ID
    const ticketInfo = resolveTicketId(ticketInput);
    if (!ticketInfo) {
      throw new Error(`Ticket ${ticketInput} not found. Use "vibe list" to see available tickets.`);
    }
    
    // Parse ticket
    const ticketData = parseTicket(ticketInfo.path);
    logger.info(`Found: ${ticketInfo.id} - ${ticketData.metadata.title}`);
    
    // Get refinement goals
    const refinementGoals = await getRefinementGoals(fromNewCommand);
    if (fromNewCommand) {
      logger.step('Applying technical refinement with focus on code quality and testing...');
    }
    
    // Start enhancement process
    const loadingSpinner = spinner('🤖 Loading context...');
    
    let aiResponse;
    try {
      loadingSpinner.update('🧠 Analyzing ticket content...');
      await new Promise(resolve => setTimeout(resolve, 800)); // Brief pause for UX
      
      loadingSpinner.update('✨ Generating enhancements...');
      aiResponse = await enhanceTicketWithSDK(ticketData, refinementGoals);
      loadingSpinner.succeed('Completed triaging and refinement!');
      
    } catch (error) {
      loadingSpinner.fail('Enhancement failed');
      
      if (error.message.includes('Claude Code SDK failed')) {
        logger.error('AI enhancement service is unavailable.');
        logger.info('This could be due to:');
        console.log('   • Claude Code SDK not installed or configured');
        console.log('   • Network connectivity issues');
        console.log('   • API rate limits or authentication problems');
        logger.tip('You can still view and edit the ticket manually.');
      } else {
        logger.error('Failed to enhance ticket.');
        logger.tip('Please check your Claude Code SDK installation and try again.');
      }
      return;
    }
  
    // Parse AI response
    const sections = parseAiResponse(aiResponse, ticketData);
    
    // Interactive enhancement mode
    let currentSections = sections;
    
    while (true) {
      const choice = await handleRefinementOptions();
      
      if (choice === '1') {
        await applyRefinements(currentSections, ticketInfo, ticketData);
        return; // Clean exit after successful update
        
      } else if (choice === '2') {
        currentSections = await requestFollowupChanges(currentSections, ticketData);
        
      } else if (choice === '3') {
        await viewDiff(currentSections);
        
      } else if (choice === '4') {
        logger.info('Refinement cancelled. Ticket remains unchanged.');
        return; // Clean exit when cancelled
        
      } else {
        logger.warning('Invalid choice. Please select 1-4.');
      }
    }
    
  } catch (error) {
    logger.error(`Refinement failed: ${error.message}`);
    
    if (fromNewCommand) {
      logger.tip('You can manually enhance the ticket later with: vibe refine ' + ticketInfo.id.replace('TKT-', ''));
    }
  }
}

export default refineCommand;