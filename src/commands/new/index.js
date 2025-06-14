import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getTicketsDir, getConfig, getNextTicketId, createSlug } from '../../utils/index.js';
import { confirmPrompt } from '../../utils/prompts.js';
import { logger } from '../../utils/cli.js';

// Configuration constants
const DEFAULT_PRIORITY = 'medium';
const DEFAULT_STATUS = 'open';
const GIT_STATUS_CHECK_TIMEOUT = 5000;

/**
 * Check if AI is enabled in config
 * @param {Object} config - Configuration object
 * @returns {boolean} True if AI is enabled
 */
function checkAiEnabled(config) {
  return config && config.ai && config.ai.enabled && config.ai.provider !== 'none';
}

/**
 * Parse command arguments into structured data
 * @param {Array} args - Command line arguments
 * @returns {Object} Parsed arguments with title, priority, and status
 */
function parseArguments(args) {
  if (!Array.isArray(args)) {
    throw new Error('Arguments must be an array');
  }
  
  let titleParts = [];
  let priority = DEFAULT_PRIORITY;
  let status = DEFAULT_STATUS;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--priority' && i + 1 < args.length) {
      priority = args[i + 1];
      i++; // Skip the next argument as it's the priority value
    } else if (arg === '--status' && i + 1 < args.length) {
      status = args[i + 1];
      i++; // Skip the next argument as it's the status value
    } else if (!arg.startsWith('--')) {
      titleParts.push(arg);
    }
  }
  
  const title = titleParts.join(' ').trim();
  
  if (!title) {
    throw new Error('Please provide a title for the new ticket.');
  }
  
  return { title, priority, status };
}

/**
 * Validate priority and status against config options
 * @param {string} priority - Priority value
 * @param {string} status - Status value
 * @param {Object} config - Configuration object
 * @returns {Object} Validated priority and status
 */
function validateOptions(priority, status, config) {
  let validatedPriority = priority;
  let validatedStatus = status;
  
  // Validate priority
  if (config.tickets?.priority_options && !config.tickets.priority_options.includes(priority)) {
    logger.warning(`Priority '${priority}' not in config options. Using default.`);
    validatedPriority = DEFAULT_PRIORITY;
  }
  
  // Validate status
  if (config.tickets?.status_options && !config.tickets.status_options.includes(status)) {
    logger.warning(`Status '${status}' not in config options. Using default.`);
    validatedStatus = DEFAULT_STATUS;
  }
  
  return { priority: validatedPriority, status: validatedStatus };
}

/**
 * Create ticket content from template
 * @param {string} template - Template content
 * @param {Object} ticketData - Ticket data
 * @returns {string} Generated ticket content
 */
function createTicketContent(template, ticketData) {
  if (typeof template !== 'string') {
    throw new Error('Template must be a string');
  }
  
  const { ticketId, title, slug, priority, status, timestamp } = ticketData;
  const paddedId = ticketId.replace('TKT-', '');
  
  return template
    .replace(/{id}/g, paddedId)
    .replace(/{title}/g, title)
    .replace(/{slug}/g, slug)
    .replace(/{date}/g, timestamp)
    .replace(/^priority: .*$/m, `priority: ${priority}`)
    .replace(/^status: .*$/m, `status: ${status}`);
}

/**
 * Check if file is untracked in git
 * @param {string} filename - File to check
 * @returns {Promise<boolean>} True if file is untracked
 */
async function isFileUntracked(filename) {
  try {
    const { spawn } = await import('child_process');
    
    return new Promise((resolve) => {
      const child = spawn('git', ['status', '--porcelain', filename], { 
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: GIT_STATUS_CHECK_TIMEOUT
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        // If output starts with '??', file is untracked
        resolve(output.trim().startsWith('??'));
      });
      
      child.on('error', () => {
        resolve(false); // Assume tracked if git check fails
      });
      
      // Timeout handler
      setTimeout(() => {
        try {
          child.kill('SIGTERM');
        } catch (killError) {
          // Ignore kill errors
        }
        resolve(false);
      }, GIT_STATUS_CHECK_TIMEOUT);
    });
  } catch (error) {
    return false; // Assume tracked if anything fails
  }
}

/**
 * Handle file renaming based on AI-generated slug
 * @param {string} originalPath - Original file path
 * @param {string} ticketDir - Tickets directory
 * @returns {Promise<void>}
 */
async function handleFileRename(originalPath, ticketDir) {
  try {
    const filename = path.basename(originalPath);
    const isUntracked = await isFileUntracked(filename);
    
    if (!isUntracked) {
      return; // Don't rename tracked files
    }
    
    const { parseTicket } = await import('../../utils/ticket.js');
    const ticketData = parseTicket(originalPath);
    
    if (!ticketData.metadata.slug) {
      return; // No slug to use for renaming
    }
    
    const newFilename = `${ticketData.metadata.slug}.md`;
    const newPath = path.join(ticketDir, newFilename);
    
    if (newPath !== originalPath && !fs.existsSync(newPath)) {
      fs.renameSync(originalPath, newPath);
      logger.info(`Renamed ticket file to: ${newFilename}`);
    }
  } catch (error) {
    logger.debug(`File rename skipped - ${error.message}`);
  }
}

/**
 * Create a new ticket
 * @param {Array} args - Command arguments
 * @returns {Promise<void>}
 * @throws {Error} If ticket creation fails
 */
async function newCommand(args) {
  try {
    // Parse and validate arguments
    const { title, priority, status } = parseArguments(args);
    
    // Check required files and paths
    const configPath = path.join(process.cwd(), '.vibe', 'config.yml');
    const templatePath = path.join(process.cwd(), '.vibe', '.templates', 'default.md');
    
    if (!fs.existsSync(configPath)) {
      throw new Error('Missing config.yml. Run "vibe init" first.');
    }
    
    if (!fs.existsSync(templatePath)) {
      throw new Error('Missing default.md template. Run "vibe init" first.');
    }
    
    // Load configuration and template
    let config, template;
    try {
      config = yaml.load(fs.readFileSync(configPath, 'utf-8'));
      template = fs.readFileSync(templatePath, 'utf-8');
    } catch (readError) {
      throw new Error(`Failed to read configuration or template: ${readError.message}`);
    }
    
    if (!config) {
      throw new Error('Configuration file is empty or invalid');
    }
    
    // Validate options against config
    const validatedOptions = validateOptions(priority, status, config);
    
    // Generate ticket data
    const ticketId = getNextTicketId();
    const simpleSlug = createSlug(title, config);
    const ticketSlug = `${ticketId}-${simpleSlug}`;
    const filename = `${ticketId}-${simpleSlug}.md`;
    const timestamp = new Date().toISOString();
    
    const ticketData = {
      ticketId,
      title,
      slug: ticketSlug,
      priority: validatedOptions.priority,
      status: validatedOptions.status,
      timestamp
    };
    
    // Create ticket content
    const content = createTicketContent(template, ticketData);
    
    // Write ticket file
    const ticketDir = path.join(process.cwd(), config.tickets?.path || '.vibe/tickets');
    const outputPath = path.join(ticketDir, filename);
    
    try {
      fs.writeFileSync(outputPath, content, 'utf-8');
    } catch (writeError) {
      throw new Error(`Failed to create ticket file: ${writeError.message}`);
    }
    
    logger.success(`Created ticket: ${filename} (priority: ${ticketData.priority}, status: ${ticketData.status})`);
    
    // Offer AI enhancement if available
    if (checkAiEnabled(config)) {
      await offerAiEnhancement(ticketId, outputPath, ticketDir);
    }
    
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

/**
 * Offer AI enhancement for newly created ticket
 * @param {string} ticketId - The ticket ID
 * @param {string} outputPath - Path to the ticket file
 * @param {string} ticketDir - Tickets directory
 * @returns {Promise<void>}
 */
async function offerAiEnhancement(ticketId, outputPath, ticketDir) {
  logger.ai('AI enhancement is available for this ticket.');
  
  const shouldRefine = await confirmPrompt('🚀', 'Do you want to refine this ticket automatically based on your codebase?', true);
  
  if (!shouldRefine) {
    return;
  }
  
  logger.step('Starting AI enhancement...');
  
  try {
    // Import and run refine command
    const refineModule = await import('../refine/index.js');
    const refineCommand = refineModule.default;
    
    // Extract ticket number for refine command
    const ticketNumber = ticketId.replace('TKT-', '');
    await refineCommand([ticketNumber], { fromNewCommand: true });
    
    // Handle potential file renaming based on AI-generated slug
    await handleFileRename(outputPath, ticketDir);
    
  } catch (error) {
    logger.error(`Failed to enhance ticket: ${error.message}`);
    const ticketNumber = ticketId.replace('TKT-', '');
    logger.tip(`You can manually enhance it later with: vibe refine ${ticketNumber}`);
  }
}

export default newCommand;
