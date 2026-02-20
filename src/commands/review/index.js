import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import chalk from 'chalk';
import { getTicketsDir, getConfig } from '../../utils/index.js';
import { isGitRepository, getCurrentBranch } from '../../utils/git.js';

/**
 * Extract ticket ID from branch name
 * @returns {string|null} Ticket ID or null if not found
 */
function extractTicketFromBranch() {
  try {
    const branch = getCurrentBranch();
    if (!branch) return null;
    
    const match = branch.match(/TKT-\d{3}/);
    return match ? match[0] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Normalize ticket ID format with input sanitization
 * @param {string} input - Input ticket ID or number
 * @returns {string|null} Normalized ticket ID (TKT-XXX format) or null if invalid
 */
function normalizeTicketId(input) {
  // Handle null, undefined, or non-string inputs
  if (!input || typeof input !== 'string') {
    return null;
  }
  
  // Sanitize input: trim whitespace and convert to uppercase
  const sanitized = input.trim().toUpperCase();
  
  // Handle empty string after trimming
  if (!sanitized) {
    return null;
  }
  
  // Validate maximum length to prevent potential issues
  if (sanitized.length > 20) {
    return null;
  }
  
  // If it's just a number, convert to TKT-XXX format
  if (/^\d+$/.test(sanitized)) {
    const num = parseInt(sanitized, 10);
    
    // Validate reasonable range (1-999)
    if (num < 1 || num > 999) {
      return null;
    }
    
    const paddedNumber = sanitized.padStart(3, '0');
    return `TKT-${paddedNumber}`;
  }
  
  // If it's already in TKT-XXX format, validate and return
  if (/^TKT-\d{3}$/.test(sanitized)) {
    const num = parseInt(sanitized.substring(4), 10);
    
    // Validate reasonable range (1-999)
    if (num < 1 || num > 999) {
      return null;
    }
    
    return sanitized;
  }
  
  // Handle partial formats like "TKT001" or "TKT-1"
  if (/^TKT\d{1,3}$/.test(sanitized)) {
    const numPart = sanitized.substring(3);
    const num = parseInt(numPart, 10);
    
    if (num < 1 || num > 999) {
      return null;
    }
    
    const paddedNumber = numPart.padStart(3, '0');
    return `TKT-${paddedNumber}`;
  }
  
  if (/^TKT-\d{1,2}$/.test(sanitized)) {
    const numPart = sanitized.substring(4);
    const num = parseInt(numPart, 10);
    
    if (num < 1 || num > 999) {
      return null;
    }
    
    const paddedNumber = numPart.padStart(3, '0');
    return `TKT-${paddedNumber}`;
  }
  
  // Invalid format
  return null;
}

/**
 * Validate ticket ID format and existence
 * @param {string} ticketId - The ticket ID to validate
 * @returns {Object} Validation result with isValid flag and error message
 */
function validateTicketId(ticketId) {
  if (!ticketId) {
    return { isValid: false, error: 'Ticket ID is required' };
  }

  const normalizedId = normalizeTicketId(ticketId);
  if (!normalizedId) {
    return { isValid: false, error: `Invalid ticket ID format: ${ticketId}. Expected format: TKT-XXX or just the number (e.g., TKT-001 or 1)` };
  }

  const ticketsDir = getTicketsDir();
  const ticketFiles = fs.readdirSync(ticketsDir)
    .filter(file => file.endsWith('.md') && file.startsWith(normalizedId));

  if (ticketFiles.length === 0) {
    return { isValid: false, error: `Ticket not found: ${normalizedId}` };
  }

  return { isValid: true, ticketFile: path.join(ticketsDir, ticketFiles[0]), ticketId: normalizedId };
}

/**
 * Parse ticket content and extract requirements
 * @param {string} filePath - Path to the ticket file
 * @returns {Object} Parsed ticket data
 */
function parseTicketRequirements(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    if (!content.startsWith('---')) {
      throw new Error('Invalid ticket format: missing frontmatter');
    }

    const parts = content.split('---');
    if (parts.length < 3) {
      throw new Error('Invalid ticket format: malformed frontmatter');
    }

    const frontmatter = yaml.load(parts[1]);
    const ticketContent = parts.slice(2).join('---');

    // Extract sections
    const sections = {};
    const sectionRegex = /^##\s+(.+?)$([\s\S]*?)(?=^##\s+|$)/gm;
    let match;

    while ((match = sectionRegex.exec(ticketContent)) !== null) {
      const sectionName = match[1].trim();
      const sectionContent = match[2].trim();
      sections[sectionName] = sectionContent;
    }

    return {
      metadata: {
        id: frontmatter.id,
        title: frontmatter.title,
        status: frontmatter.status,
        priority: frontmatter.priority
      },
      sections
    };
  } catch (error) {
    throw new Error(`Failed to parse ticket: ${error.message}`);
  }
}

/**
 * Get staged changes from git
 * @returns {string} Staged changes diff
 */
function getStagedChanges() {
  try {
    return execSync('git diff --staged', { encoding: 'utf-8' });
  } catch (error) {
    throw new Error(`Failed to get staged changes: ${error.message}`);
  }
}

/**
 * Get list of staged files
 * @returns {string[]} Array of staged file paths
 */
function getStagedFiles() {
  try {
    const output = execSync('git diff --staged --name-only', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(file => file.length > 0);
  } catch (error) {
    return [];
  }
}

/**
 * Create ticket information section for AI prompt
 * @param {Object} metadata - Ticket metadata
 * @returns {string} Formatted ticket information
 */
function createTicketInfoSection(metadata) {
  return `TICKET INFORMATION:
ID: ${metadata.id}
Title: ${metadata.title}
Status: ${metadata.status}
Priority: ${metadata.priority}`;
}

/**
 * Create requirements section for AI prompt
 * @param {Object} sections - Ticket sections
 * @returns {string} Formatted requirements section
 */
function createRequirementsSection(sections) {
  return `REQUIREMENTS:
${sections['Description'] || 'No description provided'}

ACCEPTANCE CRITERIA:
${sections['Acceptance Criteria'] || 'No acceptance criteria provided'}

CODE QUALITY REQUIREMENTS:
${sections['Code Quality'] || 'No code quality requirements specified'}

IMPLEMENTATION NOTES:
${sections['Implementation Notes'] || 'No implementation notes provided'}

TESTING REQUIREMENTS:
${sections['Testing & Test Cases'] || 'No testing requirements specified'}`;
}

/**
 * Create code changes section for AI prompt
 * @param {string[]} stagedFiles - List of staged files
 * @param {string} stagedChanges - Git diff of staged changes
 * @returns {string} Formatted code changes section
 */
function createCodeChangesSection(stagedFiles, stagedChanges) {
  return `STAGED FILES:
${stagedFiles.map(file => `- ${file}`).join('\n')}

STAGED CHANGES:
\`\`\`diff
${stagedChanges}
\`\`\``;
}

/**
 * Create analysis instructions for AI prompt
 * @returns {string} Formatted analysis instructions
 */
function createAnalysisInstructions() {
  return `Please analyze and provide SPECIFIC feedback with:
1. Overall completion percentage (0-100%)
2. Detailed breakdown referencing specific functions, files, or line ranges where possible
3. Code quality assessment with specific examples
4. Any issues with exact locations (file:function or file:line when possible)
5. Specific, actionable recommendations

BE SPECIFIC: Reference actual function names, file paths, and specific code patterns from the diff. 
For issues and recommendations, provide concrete examples like "In src/commands/review/index.js:validateTicketId(), consider..." or "Lines 45-60 in file.js should..."`;
}

/**
 * Create JSON response format for AI prompt
 * @returns {string} Formatted JSON schema
 */
function createResponseFormat() {
  return `Format your response as JSON:
{
  "completionPercentage": 85,
  "status": "good|warning|poor",
  "summary": "Brief overall assessment",
  "completed": [
    "Specific completed requirements with file/function references"
  ],
  "missing": [
    "Specific missing requirements with suggested locations"
  ],
  "issues": [
    "Specific code quality issues with file:function or file:line references"
  ],
  "recommendations": [
    "Specific actionable recommendations with exact locations"
  ]
}`;
}

/**
 * Create AI review prompt
 * @param {Object} ticket - Parsed ticket data
 * @param {string} stagedChanges - Git diff of staged changes
 * @param {string[]} stagedFiles - List of staged files
 * @returns {string} AI prompt for review
 */
function createReviewPrompt(ticket, stagedChanges, stagedFiles) {
  const sections = [
    'Please review the following code changes against the ticket requirements and provide a detailed, specific analysis.',
    '',
    createTicketInfoSection(ticket.metadata),
    '',
    createRequirementsSection(ticket.sections),
    '',
    createCodeChangesSection(stagedFiles, stagedChanges),
    '',
    createAnalysisInstructions(),
    '',
    createResponseFormat()
  ];

  return sections.join('\n');
}

/**
 * Call Claude Code CLI for code review with timeout handling
 * @param {string} prompt - Review prompt
 * @param {number} timeoutMs - Timeout in milliseconds (default: 60000)
 * @returns {Promise<Object>} AI review response
 */
async function callClaudeForReview(prompt, timeoutMs = 60000) {
  console.log(chalk.yellow('🤖 Analyzing changes with Claude...'));
  
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Claude analysis timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      return timeoutId;
    });

    // Create the actual Claude processing promise
    const claudeProcessingPromise = new Promise(async (resolve, reject) => {
      try {
        // Call Claude Code CLI with --print flag for non-interactive output
        const claudeResponse = execSync(
          'claude --print',
          { 
            input: prompt,
            encoding: 'utf-8',
            timeout: timeoutMs - 5000, // Leave 5s buffer for cleanup
            maxBuffer: 1024 * 1024 * 5 // 5MB buffer
          }
        );

        // Parse Claude's response as JSON
        let parsedResponse;
        try {
          // Try to extract JSON from Claude's response
          const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsedResponse = JSON.parse(jsonMatch[0]);
          } else {
            // Fallback: create structured response from text
            parsedResponse = parseTextResponse(claudeResponse);
          }
        } catch (parseError) {
          // If JSON parsing fails, create a structured response
          parsedResponse = parseTextResponse(claudeResponse);
        }

        // Validate response structure
        const validatedResponse = validateClaudeResponse(parsedResponse);
        resolve(validatedResponse);

      } catch (error) {
        if (error.code === 'ENOENT') {
          reject(new Error('Claude CLI not found. Please ensure Claude Code is installed and accessible.'));
        } else if (error.signal === 'SIGTERM') {
          reject(new Error('Claude analysis was terminated due to timeout'));
        } else {
          reject(new Error(`Claude analysis failed: ${error.message}`));
        }
      }
    });

    // Race between timeout and Claude processing
    const result = await Promise.race([claudeProcessingPromise, timeoutPromise]);
    return result;

  } catch (error) {
    // Handle timeout and other errors gracefully
    if (error.message.includes('timed out') || error.message.includes('timeout')) {
      console.error(chalk.yellow('⚠️  Claude analysis timed out. Manual review recommended.'));
      throw new Error('Claude analysis timed out - please review manually or increase timeout');
    }
    
    if (error.message.includes('not found')) {
      console.error(chalk.red('❌ Claude CLI not available.'));
      throw new Error('Claude CLI not found - please ensure Claude Code is installed');
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Parse Claude's text response into structured format
 * @param {string} textResponse - Raw text response from Claude
 * @returns {Object} Structured response object
 */
function parseTextResponse(textResponse) {
  // Extract completion percentage
  const percentageMatch = textResponse.match(/(\d+)%/);
  const completionPercentage = percentageMatch ? parseInt(percentageMatch[1], 10) : 0;
  
  // Determine status based on percentage
  let status = 'poor';
  if (completionPercentage >= 80) status = 'good';
  else if (completionPercentage >= 60) status = 'warning';
  
  // Extract sections using common patterns
  const extractSection = (sectionName) => {
    const patterns = [
      new RegExp(`${sectionName}:?\\s*([\\s\\S]*?)(?=\\n\\n|\\n[A-Z][^:]*:|$)`, 'i'),
      new RegExp(`${sectionName}\\s*([\\s\\S]*?)(?=\\n\\n|\\n[A-Z][^:]*:|$)`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = textResponse.match(pattern);
      if (match) {
        return match[1].trim().split('\n')
          .map(line => line.replace(/^[-•*]\s*/, '').trim())
          .filter(line => line.length > 0);
      }
    }
    return [];
  };
  
  return {
    completionPercentage,
    status,
    summary: textResponse.split('\n')[0] || 'Code review completed',
    completed: extractSection('completed|done|implemented|working'),
    missing: extractSection('missing|incomplete|todo|needed'),
    issues: extractSection('issues|problems|concerns|bugs'),
    recommendations: extractSection('recommendations|suggestions|improvements|consider')
  };
}

/**
 * Validate and normalize Claude's response
 * @param {Object} response - Response object from Claude
 * @returns {Object} Validated response
 */
function validateClaudeResponse(response) {
  const validated = {
    completionPercentage: Math.max(0, Math.min(100, response.completionPercentage || 0)),
    status: ['good', 'warning', 'poor'].includes(response.status) ? response.status : 'warning',
    summary: response.summary || 'Code review completed',
    completed: Array.isArray(response.completed) ? response.completed : [],
    missing: Array.isArray(response.missing) ? response.missing : [],
    issues: Array.isArray(response.issues) ? response.issues : [],
    recommendations: Array.isArray(response.recommendations) ? response.recommendations : []
  };
  
  // Ensure status matches percentage
  if (validated.completionPercentage >= 80 && validated.status === 'poor') {
    validated.status = 'good';
  } else if (validated.completionPercentage >= 60 && validated.status === 'poor') {
    validated.status = 'warning';
  }
  
  return validated;
}



/**
 * Display review results with color coding based on configuration thresholds
 * @param {Object} review - AI review results
 * @param {number} review.completionPercentage - Completion percentage (0-100)
 * @param {string} review.status - Review status (good|warning|poor)
 * @param {string} review.summary - Brief assessment summary
 * @param {string[]} review.completed - List of completed requirements
 * @param {string[]} review.missing - List of missing requirements
 * @param {string[]} review.issues - List of identified issues
 * @param {string[]} review.recommendations - List of recommendations
 * @param {Object} ticket - Ticket metadata
 * @param {Object} ticket.metadata - Ticket metadata object
 * @param {string} ticket.metadata.id - Ticket ID
 * @param {string} ticket.metadata.title - Ticket title
 * @param {Object} config - Configuration object
 * @param {Object} [config.review] - Review configuration
 * @param {number} [config.review.good_threshold=80] - Threshold for green status
 * @param {number} [config.review.warning_threshold=60] - Threshold for yellow status
 */
function displayReviewResults(review, ticket, config) {
  const percentage = review.completionPercentage;
  const thresholds = config.review || {};
  const goodThreshold = thresholds.good_threshold || 80;
  const warningThreshold = thresholds.warning_threshold || 60;
  
  let percentageColor;
  let statusIcon;

  if (percentage >= goodThreshold) {
    percentageColor = chalk.green;
    statusIcon = '✅';
  } else if (percentage >= warningThreshold) {
    percentageColor = chalk.yellow;
    statusIcon = '⚠️';
  } else {
    percentageColor = chalk.red;
    statusIcon = '❌';
  }

  console.log(chalk.blue('\n🔍 AI Code Review Results'));
  console.log(chalk.blue('═'.repeat(50)));
  console.log(`${chalk.bold('Ticket:')} ${ticket.metadata.id} - ${ticket.metadata.title}`);
  console.log(`${chalk.bold('Completion:')} ${statusIcon} ${percentageColor(`${percentage}%`)}`);
  console.log(`${chalk.bold('Summary:')} ${review.summary}`);
  console.log(chalk.blue('═'.repeat(50)));

  // Completed items
  if (review.completed.length > 0) {
    console.log(chalk.green('\n✅ Completed Requirements:'));
    review.completed.forEach(item => {
      console.log(chalk.green(`  • ${item}`));
    });
  }

  // Missing items
  if (review.missing.length > 0) {
    console.log(chalk.red('\n❌ Missing/Incomplete:'));
    review.missing.forEach(item => {
      console.log(chalk.red(`  • ${item}`));
    });
  }

  // Issues
  if (review.issues.length > 0) {
    console.log(chalk.yellow('\n⚠️  Issues Found:'));
    review.issues.forEach(item => {
      console.log(chalk.yellow(`  • ${item}`));
    });
  }

  // Recommendations
  if (review.recommendations.length > 0) {
    console.log(chalk.blue('\n💡 Recommendations:'));
    review.recommendations.forEach(item => {
      console.log(chalk.blue(`  • ${item}`));
    });
  }

  console.log(chalk.gray('\n📋 Use --copy or -c to copy detailed feedback to clipboard'));
}

/**
 * Format review results for clipboard in plain text format
 * @param {Object} review - AI review results
 * @param {number} review.completionPercentage - Completion percentage
 * @param {string} review.summary - Review summary
 * @param {string[]} review.completed - Completed items
 * @param {string[]} review.missing - Missing items
 * @param {string[]} review.issues - Issues found
 * @param {string[]} review.recommendations - Recommendations
 * @param {Object} ticket - Ticket metadata
 * @param {Object} ticket.metadata - Ticket metadata object
 * @param {string} ticket.metadata.id - Ticket ID
 * @param {string} ticket.metadata.title - Ticket title
 * @returns {string} Formatted text for clipboard with proper spacing and sections
 * @example
 * const formattedText = formatReviewForClipboard(reviewResult, ticketData);
 * // Returns formatted string ready for clipboard
 */
function formatReviewForClipboard(review, ticket) {
  let output = `Code Review Results - ${ticket.metadata.id}\n`;
  output += `${'='.repeat(50)}\n`;
  output += `Ticket: ${ticket.metadata.id} - ${ticket.metadata.title}\n`;
  output += `Completion: ${review.completionPercentage}%\n`;
  output += `Summary: ${review.summary}\n\n`;

  if (review.completed.length > 0) {
    output += `Completed Requirements:\n`;
    review.completed.forEach(item => {
      output += `  • ${item}\n`;
    });
    output += '\n';
  }

  if (review.missing.length > 0) {
    output += `Missing/Incomplete:\n`;
    review.missing.forEach(item => {
      output += `  • ${item}\n`;
    });
    output += '\n';
  }

  if (review.issues.length > 0) {
    output += `Issues Found:\n`;
    review.issues.forEach(item => {
      output += `  • ${item}\n`;
    });
    output += '\n';
  }

  if (review.recommendations.length > 0) {
    output += `Recommendations:\n`;
    review.recommendations.forEach(item => {
      output += `  • ${item}\n`;
    });
  }

  return output;
}

/**
 * Copy text to clipboard with platform-specific commands and fallback to cache file
 * @param {string} text - Text to copy to clipboard
 * @param {string} ticketId - Ticket ID for cache file naming
 * @returns {boolean} True if copied to clipboard, false if saved to cache file
 */
function copyToClipboard(text, ticketId) {
  const commands = {
    darwin: 'pbcopy',
    win32: 'clip', 
    linux: ['xclip -selection clipboard', 'xsel --clipboard --input']
  };

  const platform = process.platform;
  const platformCommands = commands[platform] || commands.linux;
  const commandList = Array.isArray(platformCommands) ? platformCommands : [platformCommands];

  // Try each clipboard command
  for (const command of commandList) {
    try {
      execSync(command, { input: text, stdio: 'pipe' });
      console.log(chalk.green('\n📋 Review results copied to clipboard!'));
      return true;
    } catch (error) {
      continue; // Try next command
    }
  }

  // Fallback: save to cache file
  const cacheDir = path.join(process.cwd(), `.vibe/.cache/review/logs/${ticketId}`);
  fs.mkdirSync(cacheDir, { recursive: true });

  const gitignorePath = path.join(process.cwd(), '.vibe/.cache/.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, '*\n!.gitignore\n');
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const tempFile = path.join(cacheDir, `review-${timestamp}.txt`);
  fs.writeFileSync(tempFile, text);
  
  console.log(chalk.yellow('\n📋 Clipboard not available. Review results saved to:'));
  console.log(chalk.cyan(`   ${tempFile}`));
  console.log(chalk.gray('   Copy manually or run: vibe review clean'));

  // Auto-cleanup after 60 seconds
  setTimeout(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      cleanupEmptyDirs(path.dirname(tempFile));
    }
  }, 60000);

  return false;
}

/**
 * Recursively remove empty directories from cache structure
 * @param {string} dirPath - Directory path to clean up
 * @throws {Error} Silently handles and ignores cleanup errors
 * @example
 * cleanupEmptyDirs('.vibe/.cache/review/logs/TKT-001');
 */
function cleanupEmptyDirs(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return;
    
    const entries = fs.readdirSync(dirPath);
    if (entries.length === 0) {
      fs.rmdirSync(dirPath);
      // Recursively check parent directory
      const parentDir = path.dirname(dirPath);
      if (parentDir !== dirPath && parentDir.includes('.vibe/.cache')) {
        cleanupEmptyDirs(parentDir);
      }
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

/**
 * Clean review cache files with optional ticket filtering
 * @param {string[]} args - Command arguments for filtering specific tickets
 * @param {string} [args[0]] - Optional ticket ID to clean specific ticket files
 * @example
 * cleanReviewFiles([]); // Clean all review cache files
 * cleanReviewFiles(['TKT-001']); // Clean only TKT-001 cache files
 * cleanReviewFiles(['11']); // Clean TKT-011 cache files (auto-normalized)
 */
function cleanReviewFiles(args) {
  const cacheBasePath = path.join(process.cwd(), '.vibe/.cache/review');
  
  if (!fs.existsSync(cacheBasePath)) {
    console.log(chalk.green('✅ No review cache files to clean'));
    return;
  }

  // Check for specific ticket ID
  let targetPath = cacheBasePath;
  let ticketFilter = null;
  
  if (args.length > 0 && args[0] !== 'clean') {
    const ticketId = args[0];
    const normalizedId = normalizeTicketId(ticketId);
    if (normalizedId) {
      targetPath = path.join(cacheBasePath, 'logs', normalizedId);
      ticketFilter = normalizedId;
    }
  }

  try {
    if (!fs.existsSync(targetPath)) {
      if (ticketFilter) {
        console.log(chalk.yellow(`⚠️  No cache files found for ticket ${ticketFilter}`));
      } else {
        console.log(chalk.green('✅ No review cache files to clean'));
      }
      return;
    }

    // Count files before deletion
    let fileCount = 0;
    function countFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          fileCount++;
        } else if (entry.isDirectory()) {
          countFiles(path.join(dir, entry.name));
        }
      }
    }
    countFiles(targetPath);

    // Remove the directory and all contents
    fs.rmSync(targetPath, { recursive: true, force: true });
    
    // Clean up empty parent directories
    cleanupEmptyDirs(path.dirname(targetPath));

    if (ticketFilter) {
      console.log(chalk.green(`🧹 Cleaned ${fileCount} review files for ticket ${ticketFilter}`));
    } else {
      console.log(chalk.green(`🧹 Cleaned ${fileCount} review cache files`));
    }

  } catch (error) {
    console.error(chalk.red(`❌ Failed to clean cache files: ${error.message}`));
  }
}

/**
 * Main review command implementation with AI-powered code analysis
 * @param {string[]} args - Command line arguments
 * @param {string} [args[0]] - Subcommand ('clean') or ticket ID
 * @param {string} [args[1]] - Additional arguments (ticket ID for clean, flags)
 * @description Analyzes staged git changes against ticket requirements using AI.
 * Supports auto-detection of ticket ID from branch names, clipboard functionality,
 * configurable acceptance thresholds, and organized cache management.
 * 
 * @example
 * // Basic usage
 * await reviewCommand(['TKT-011']); // Review TKT-011
 * await reviewCommand(['11']); // Same as above (auto-normalized)
 * await reviewCommand([]); // Auto-detect from branch
 * 
 * // With options
 * await reviewCommand(['TKT-011', '--copy']); // Copy results to clipboard
 * await reviewCommand(['TKT-011', '-c']); // Same as above
 * 
 * // Clean commands
 * await reviewCommand(['clean']); // Clean all cache files
 * await reviewCommand(['clean', 'TKT-011']); // Clean specific ticket
 * 
 * // Help
 * await reviewCommand(['--help']); // Show help
 * 
 * @throws {Error} Exits process with code 1 for validation errors or review failures
 * @throws {Error} Exits process with code 0 for successful reviews above threshold
 */
async function reviewCommand(args) {
  // Check for clean subcommand
  if (args[0] === 'clean') {
    cleanReviewFiles(args.slice(1));
    return;
  }

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
${chalk.blue('🔍 vibe review')} - AI-powered code review against ticket requirements

${chalk.bold('Usage:')}
  vibe review [ticket-id] [options]
  vibe review clean [ticket-id]

${chalk.bold('Arguments:')}
  ticket-id    Ticket ID to review against (e.g., TKT-001, 1, 11)
               If omitted, extracts ticket ID from current branch name

${chalk.bold('Commands:')}
  clean        Clean review temp files (all or specific ticket)

${chalk.bold('Options:')}
  --copy, -c     Copy detailed feedback to clipboard
  --verbose, -v  Show detailed debug information
  --help, -h     Show this help message

${chalk.bold('Examples:')}
  vibe review TKT-011         # Review staged changes against TKT-011
  vibe review 11              # Same as above (auto-formats to TKT-011)
  vibe review                 # Auto-detect from branch (feature/TKT-011-*)
  vibe review TKT-001 -c      # Review and copy results to clipboard
  vibe review TKT-001 -v      # Review with verbose debug output
  vibe review clean           # Clean all review temp files
  vibe review clean TKT-011   # Clean temp files for specific ticket

${chalk.bold('Description:')}
  Uses AI to analyze staged changes against ticket requirements.
  Provides completion percentage, identifies missing items, and gives recommendations.
  
${chalk.bold('Color Coding:')}
  🟢 80%+ - Good (Green)
  🟡 60-79% - Warning (Yellow)  
  🔴 <60% - Poor (Red)
    `);
    return;
  }

  // Check if we're in a git repository
  if (!isGitRepository()) {
    console.error(chalk.red('❌ Not in a git repository. Please run this command from within a git repository.'));
    process.exit(1);
  }

  // Parse arguments
  let ticketId = args[0];
  const shouldCopy = args.includes('--copy') || args.includes('-c');
  const isVerbose = args.includes('--verbose') || args.includes('-v');

  // If no ticket ID provided, try to extract from branch
  if (!ticketId) {
    ticketId = extractTicketFromBranch();
    if (!ticketId) {
      console.error(chalk.red('❌ Please provide a ticket ID or work on a feature branch'));
      console.error(chalk.gray('   Examples: vibe review TKT-011, vibe review 11, or work on feature/TKT-011-* branch'));
      process.exit(1);
    }
    console.log(chalk.blue(`🔍 Detected ticket from branch: ${ticketId}`));
  }

  // Load configuration
  let config;
  try {
    config = getConfig();
  } catch (error) {
    console.error(chalk.red(`❌ Failed to load configuration: ${error.message}`));
    process.exit(1);
  }

  // Validate ticket ID and existence
  const validation = validateTicketId(ticketId);
  if (!validation.isValid) {
    console.error(chalk.red(`❌ ${validation.error}`));
    process.exit(1);
  }

  try {
    // Parse ticket requirements
    const ticket = parseTicketRequirements(validation.ticketFile);

    // Get staged changes
    const stagedChanges = getStagedChanges();
    if (!stagedChanges.trim()) {
      console.error(chalk.yellow('⚠️  No staged changes found.'));
      console.error(chalk.gray('   Use "git add <files>" to stage changes for review.'));
      console.error(chalk.blue('💡 Remember: Only staged changes are reviewed, not all working directory changes.'));
      process.exit(1);
    }

    console.log(chalk.blue('ℹ️  Reviewing staged changes only. Make sure all changes you want reviewed are staged with "git add".'));

    const stagedFiles = getStagedFiles();

    // Create AI prompt
    const prompt = createReviewPrompt(ticket, stagedChanges, stagedFiles);

    // Debug output in verbose mode
    if (isVerbose) {
      console.log(chalk.gray('\n🔍 Verbose Debug Information:'));
      console.log(chalk.gray('═'.repeat(40)));
      console.log(chalk.gray(`Ticket ID: ${ticket.metadata.id}`));
      console.log(chalk.gray(`Staged files count: ${stagedFiles.length}`));
      console.log(chalk.gray(`Staged files: ${stagedFiles.join(', ')}`));
      console.log(chalk.gray(`Changes size: ${stagedChanges.length} characters`));
      console.log(chalk.gray(`Config acceptance threshold: ${config.review?.acceptance_threshold || 80}%`));
    }

    // Call AI for review
    const review = await callClaudeForReview(prompt);

    // More debug output in verbose mode
    if (isVerbose) {
      console.log(chalk.gray('\n🤖 AI Response Debug:'));
      console.log(chalk.gray('═'.repeat(40)));
      console.log(chalk.gray(`Response completion: ${review.completionPercentage}%`));
      console.log(chalk.gray(`Response status: ${review.status}`));
      console.log(chalk.gray(`Completed items: ${review.completed.length}`));
      console.log(chalk.gray(`Missing items: ${review.missing.length}`));
      console.log(chalk.gray(`Issues found: ${review.issues.length}`));
      console.log(chalk.gray(`Recommendations: ${review.recommendations.length}`));
      console.log(chalk.gray('═'.repeat(40)));
    }

    // Display results
    displayReviewResults(review, ticket, config);

    // Copy to clipboard if requested
    if (shouldCopy) {
      const clipboardText = formatReviewForClipboard(review, ticket);
      copyToClipboard(clipboardText, ticket.metadata.id);
    }

    // Exit with appropriate code for git hooks
    const reviewConfig = config.review || {};
    const acceptanceThreshold = reviewConfig.acceptance_threshold || 80;
    
    if (review.completionPercentage < acceptanceThreshold) {
      console.log(chalk.red(`\n🚫 Review failed: ${review.completionPercentage}% < ${acceptanceThreshold}% (acceptance threshold)`));
      console.log(chalk.gray('   Configure acceptance_threshold in .vibe/config.yml'));
      process.exit(1); // Fail git hook
    } else {
      console.log(chalk.green(`\n✅ Review passed: ${review.completionPercentage}% > ${acceptanceThreshold}% (acceptance threshold)`));
      process.exit(0); // Pass git hook
    }

  } catch (error) {
    console.error(chalk.red(`❌ ${error.message}`));
    process.exit(1);
  }
}

export default reviewCommand;