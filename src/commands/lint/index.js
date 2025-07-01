import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getTicketsDir, getConfigPath } from '../../utils/index.js';

/**
 * Load configuration from config.yml
 * @returns {Object} Configuration object
 */
function loadConfig() {
  const configPath = getConfigPath();
  
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Configuration file not found: ${configPath}`);
    console.error('Run "vibe init" to initialize a VibeKit project.');
    process.exit(1);
  }
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    return yaml.load(configContent);
  } catch (error) {
    console.error(`❌ Failed to parse configuration: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Extract required sections from template
 * @param {Object} config - Configuration object
 * @returns {string[]} Array of required section headers
 */
function getRequiredSections(config) {
  const templatePath = config.tickets?.default_template || '.vibe/.templates/default.md';
  const fullTemplatePath = path.resolve(templatePath);
  
  if (!fs.existsSync(fullTemplatePath)) {
    console.error(`❌ Template file not found: ${templatePath}`);
    process.exit(1);
  }
  
  try {
    const templateContent = fs.readFileSync(fullTemplatePath, 'utf-8');
    
    // Extract section headers from template (lines starting with ##)
    const sections = [];
    const lines = templateContent.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^##\s+(.+)/);
      if (match) {
        sections.push(match[1].trim());
      }
    }
    
    return sections;
  } catch (error) {
    console.error(`❌ Failed to read template: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Get required frontmatter fields from template
 * @param {Object} config - Configuration object
 * @returns {string[]} Array of required frontmatter fields
 */
function getRequiredFrontmatter(config) {
  const templatePath = config.tickets?.default_template || '.vibe/.templates/default.md';
  const fullTemplatePath = path.resolve(templatePath);
  
  if (!fs.existsSync(fullTemplatePath)) {
    return ['id', 'title', 'slug', 'status', 'priority', 'created_at', 'updated_at'];
  }
  
  try {
    const templateContent = fs.readFileSync(fullTemplatePath, 'utf-8');
    
    // Extract frontmatter from template
    if (!templateContent.startsWith('---')) {
      return ['id', 'title', 'slug', 'status', 'priority', 'created_at', 'updated_at'];
    }
    
    const parts = templateContent.split('---');
    if (parts.length < 3) {
      return ['id', 'title', 'slug', 'status', 'priority', 'created_at', 'updated_at'];
    }
    
    const frontmatter = yaml.load(parts[1]);
    return Object.keys(frontmatter || {});
  } catch (error) {
    // Fallback to default required fields
    return ['id', 'title', 'slug', 'status', 'priority', 'created_at', 'updated_at'];
  }
}

/**
 * Validate ticket frontmatter
 * @param {Object} frontmatter - Parsed frontmatter object
 * @param {string} filename - Filename for error reporting
 * @param {Object} config - Configuration object
 * @param {string[]} requiredFields - Required frontmatter fields
 * @returns {string[]} Array of validation errors
 */
function validateFrontmatter(frontmatter, filename, config, requiredFields) {
  const errors = [];

  // Check required fields
  for (const field of requiredFields) {
    if (!frontmatter[field]) {
      errors.push(`Missing required frontmatter field: ${field}`);
    }
  }

  // Get valid options from config
  const validStatuses = config.tickets?.status_options || ['open', 'in_progress', 'review', 'done'];
  const validPriorities = config.tickets?.priority_options || ['low', 'medium', 'high', 'urgent'];

  // Validate status
  if (frontmatter.status && !validStatuses.includes(frontmatter.status)) {
    errors.push(`Invalid status "${frontmatter.status}". Must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate priority
  if (frontmatter.priority && !validPriorities.includes(frontmatter.priority)) {
    errors.push(`Invalid priority "${frontmatter.priority}". Must be one of: ${validPriorities.join(', ')}`);
  }

  // Validate ID format
  if (frontmatter.id && !/^TKT-\d{3}$/.test(frontmatter.id)) {
    errors.push(`Invalid ID format "${frontmatter.id}". Must follow pattern: TKT-XXX (e.g., TKT-001)`);
  }

  // Validate filename matches ID
  if (frontmatter.id && !filename.startsWith(frontmatter.id)) {
    errors.push(`Filename should start with ticket ID "${frontmatter.id}"`);
  }

  // Validate dates
  if (frontmatter.created_at && isNaN(Date.parse(frontmatter.created_at))) {
    errors.push(`Invalid created_at date format: ${frontmatter.created_at}`);
  }

  if (frontmatter.updated_at && isNaN(Date.parse(frontmatter.updated_at))) {
    errors.push(`Invalid updated_at date format: ${frontmatter.updated_at}`);
  }

  return errors;
}

/**
 * Validate ticket content sections
 * @param {string} content - Ticket content (without frontmatter)
 * @param {string[]} requiredSections - Required section headers
 * @returns {string[]} Array of validation errors
 */
function validateSections(content, requiredSections) {
  const errors = [];
  
  for (const section of requiredSections) {
    const sectionRegex = new RegExp(`^##\\s+${section}`, 'm');
    if (!sectionRegex.test(content)) {
      errors.push(`Missing required section: ## ${section}`);
    }
  }

  // Check for empty sections
  const sections = content.split(/^##\s+/m).filter(s => s.trim());
  for (let i = 1; i < sections.length; i++) {
    const sectionContent = sections[i].split(/^##\s+/m)[0].trim();
    const sectionTitle = sectionContent.split('\n')[0];
    const sectionBody = sectionContent.substring(sectionTitle.length).trim();
    
    if (!sectionBody || sectionBody.length < 10) {
      errors.push(`Section "## ${sectionTitle}" appears to be empty or too short`);
    }
  }

  return errors;
}

/**
 * Parse and validate a single ticket file
 * @param {string} filePath - Path to the ticket file
 * @param {Object} config - Configuration object
 * @param {string[]} requiredFields - Required frontmatter fields
 * @param {string[]} requiredSections - Required section headers
 * @returns {Object} Validation result with errors and warnings
 */
function validateTicketFile(filePath, config, requiredFields, requiredSections) {
  const filename = path.basename(filePath);
  const result = {
    filename,
    errors: [],
    warnings: []
  };

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for frontmatter
    if (!content.startsWith('---')) {
      result.errors.push('File must start with YAML frontmatter (---)');
      return result;
    }

    // Split frontmatter and content
    const parts = content.split('---');
    if (parts.length < 3) {
      result.errors.push('Invalid frontmatter format. Must be enclosed in --- delimiters');
      return result;
    }

    // Parse frontmatter
    let frontmatter;
    try {
      frontmatter = yaml.load(parts[1]);
    } catch (error) {
      result.errors.push(`Invalid YAML frontmatter: ${error.message}`);
      return result;
    }

    // Validate frontmatter
    const frontmatterErrors = validateFrontmatter(frontmatter, filename, config, requiredFields);
    result.errors.push(...frontmatterErrors);

    // Validate content sections
    const ticketContent = parts.slice(2).join('---');
    const sectionErrors = validateSections(ticketContent, requiredSections);
    result.errors.push(...sectionErrors);

    // Add warnings for common issues
    if (ticketContent.includes('TODO') || ticketContent.includes('FIXME')) {
      result.warnings.push('Contains TODO or FIXME comments');
    }

    if (frontmatter.title && frontmatter.title.length > 80) {
      result.warnings.push('Title is longer than 80 characters');
    }

  } catch (error) {
    result.errors.push(`Failed to read file: ${error.message}`);
  }

  return result;
}

/**
 * Format validation results for display
 * @param {Object[]} results - Array of validation results
 * @param {boolean} verbose - Show warnings and details
 */
function displayResults(results, verbose = false) {
  let totalErrors = 0;
  let totalWarnings = 0;
  let filesWithIssues = 0;

  console.log('🔍 VibeKit Ticket Linter Results\n');

  for (const result of results) {
    const hasErrors = result.errors.length > 0;
    const hasWarnings = result.warnings.length > 0;

    if (hasErrors || hasWarnings) {
      filesWithIssues++;
      
      if (hasErrors) {
        console.log(`❌ ${result.filename}`);
        result.errors.forEach(error => {
          console.log(`   Error: ${error}`);
        });
        totalErrors += result.errors.length;
      } else {
        console.log(`⚠️  ${result.filename}`);
      }

      if (verbose && hasWarnings) {
        result.warnings.forEach(warning => {
          console.log(`   Warning: ${warning}`);
        });
      }
      totalWarnings += result.warnings.length;
      console.log('');
    } else if (verbose) {
      console.log(`✅ ${result.filename}`);
    }
  }

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Files checked: ${results.length}`);
  console.log(`   Files with issues: ${filesWithIssues}`);
  console.log(`   Total errors: ${totalErrors}`);
  console.log(`   Total warnings: ${totalWarnings}`);

  if (totalErrors === 0) {
    console.log('\n🎉 All tickets are properly formatted!');
  } else {
    console.log('\n💡 Fix the errors above to ensure consistent ticket formatting.');
  }
}

/**
 * Lint command implementation
 * @param {string[]} args Command arguments
 */
function lintCommand(args) {
  let verbose = false;
  let specificFile = null;

  // Parse arguments first to check for help
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--verbose' || args[i] === '-v') {
      verbose = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
🔍 vibe lint - Validate ticket documentation formatting

Usage:
  vibe lint [options] [file]

Options:
  --verbose, -v    Show detailed output including warnings
  --help, -h       Show this help message

Examples:
  vibe lint                           # Lint all tickets
  vibe lint --verbose                 # Show detailed output
  vibe lint TKT-001-example.md        # Lint specific file

Validation Rules:
  - Required frontmatter fields: id, title, slug, status, priority, created_at, updated_at
  - Required sections: Description, Acceptance Criteria, Code Quality, etc.
  - Valid statuses: defined in config.yml
  - Valid priorities: defined in config.yml
  - ID format: TKT-XXX (e.g., TKT-001)
      `);
      process.exit(0);
    } else if (!args[i].startsWith('--')) {
      specificFile = args[i];
    }
  }

  // Load configuration after help check
  const config = loadConfig();
  const requiredFields = getRequiredFrontmatter(config);
  const requiredSections = getRequiredSections(config);
  const validStatuses = config.tickets?.status_options || ['open', 'in_progress', 'review', 'done'];
  const validPriorities = config.tickets?.priority_options || ['low', 'medium', 'high', 'urgent'];

  // Get tickets directory
  const ticketDir = getTicketsDir();
  
  if (!fs.existsSync(ticketDir)) {
    console.error(`❌ Tickets directory not found: ${ticketDir}`);
    console.error('Run "vibe init" to initialize a VibeKit project.');
    process.exit(1);
  }

  let filesToCheck;
  
  if (specificFile) {
    // Check specific file
    const filePath = path.isAbsolute(specificFile) 
      ? specificFile 
      : path.join(ticketDir, specificFile);
      
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${specificFile}`);
      process.exit(1);
    }
    
    filesToCheck = [filePath];
  } else {
    // Check all markdown files
    const files = fs.readdirSync(ticketDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(ticketDir, file));
      
    if (files.length === 0) {
      console.log('📝 No ticket files found to lint.');
      process.exit(0);
    }
    
    filesToCheck = files;
  }

  // Validate all files
  const results = filesToCheck.map(filePath => 
    validateTicketFile(filePath, config, requiredFields, requiredSections)
  );
  
  // Display results
  displayResults(results, verbose);
  
  // Exit with error code if there are errors
  const hasErrors = results.some(result => result.errors.length > 0);
  process.exit(hasErrors ? 1 : 0);
}

export default lintCommand;