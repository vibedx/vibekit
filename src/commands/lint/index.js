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
 * @returns {Object} Object with errors and missing sections
 */
function validateSections(content, requiredSections) {
  const errors = [];
  const missingSections = [];
  
  for (const section of requiredSections) {
    const sectionRegex = new RegExp(`^##\\s+${section}`, 'm');
    if (!sectionRegex.test(content)) {
      errors.push(`Missing required section: ## ${section}`);
      missingSections.push(section);
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

  return { errors, missingSections };
}

/**
 * Extract section content from template
 * @param {Object} config - Configuration object
 * @returns {Object} Object mapping section names to their default content
 */
function getSectionDefaults(config) {
  const templatePath = config.tickets?.default_template || '.vibe/.templates/default.md';
  const fullTemplatePath = path.resolve(templatePath);
  
  const sectionDefaults = {};
  
  if (!fs.existsSync(fullTemplatePath)) {
    return sectionDefaults;
  }
  
  try {
    const templateContent = fs.readFileSync(fullTemplatePath, 'utf-8');
    
    // Split by frontmatter to get only content part
    const parts = templateContent.split('---');
    if (parts.length < 3) {
      return sectionDefaults;
    }
    
    const contentPart = parts.slice(2).join('---');
    
    // Split content by section headers
    const sections = contentPart.split(/^##\s+/m);
    
    // First element is content before any section headers (ignore)
    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      const lines = section.split('\n');
      const sectionName = lines[0].trim();
      const sectionContent = lines.slice(1).join('\n');
      
      sectionDefaults[sectionName] = sectionContent;
    }
  } catch (error) {
    console.error(`❌ Failed to read template for section defaults: ${error.message}`);
  }
  
  return sectionDefaults;
}

/**
 * Get frontmatter defaults from template
 * @param {Object} config - Configuration object
 * @returns {Object} Object with default frontmatter values
 */
function getFrontmatterDefaults(config) {
  const templatePath = config.tickets?.default_template || '.vibe/.templates/default.md';
  const fullTemplatePath = path.resolve(templatePath);
  
  const defaults = {};
  
  if (!fs.existsSync(fullTemplatePath)) {
    return defaults;
  }
  
  try {
    const templateContent = fs.readFileSync(fullTemplatePath, 'utf-8');
    
    if (!templateContent.startsWith('---')) {
      return defaults;
    }
    
    const parts = templateContent.split('---');
    if (parts.length < 3) {
      return defaults;
    }
    
    const frontmatter = yaml.load(parts[1]);
    return frontmatter || {};
  } catch (error) {
    console.error(`❌ Failed to read template for frontmatter defaults: ${error.message}`);
  }
  
  return defaults;
}

/**
 * Fix missing frontmatter fields
 * @param {Object} frontmatter - Current frontmatter object
 * @param {string[]} missingFields - Array of missing field names
 * @param {Object} config - Configuration object
 * @param {string} filename - Filename for generating values
 * @returns {Object} Fixed frontmatter object
 */
function fixMissingFrontmatter(frontmatter, missingFields, config, filename) {
  const fixedFrontmatter = { ...frontmatter };
  const defaults = getFrontmatterDefaults(config);
  const currentDate = new Date().toISOString();
  
  for (const field of missingFields) {
    if (field === 'slug') {
      // Generate slug from title or filename
      const title = fixedFrontmatter.title || filename.replace('.md', '').replace(/^TKT-\d+-/, '');
      fixedFrontmatter.slug = fixedFrontmatter.id ? 
        `${fixedFrontmatter.id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}` : 
        title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    } else if (field === 'created_at' || field === 'updated_at') {
      fixedFrontmatter[field] = currentDate;
    } else if (defaults[field] !== undefined) {
      // Use template default if available
      fixedFrontmatter[field] = defaults[field];
    } else {
      // Provide sensible defaults for common fields
      switch (field) {
        case 'status':
          fixedFrontmatter[field] = config.tickets?.status_options?.[0] || 'open';
          break;
        case 'priority':
          fixedFrontmatter[field] = 'medium';
          break;
        case 'title':
          fixedFrontmatter[field] = filename.replace('.md', '').replace(/^TKT-\d+-/, '').replace(/-/g, ' ');
          break;
        case 'id':
          const match = filename.match(/^(TKT-\d+)/);
          if (match) {
            fixedFrontmatter[field] = match[1];
          }
          break;
        default:
          fixedFrontmatter[field] = '';
      }
    }
  }
  
  return fixedFrontmatter;
}

/**
 * Fix missing sections in ticket content
 * @param {string} content - Original ticket content
 * @param {string[]} missingSections - Array of missing section names
 * @param {Object} config - Configuration object
 * @returns {string} Fixed content with added sections
 */
function fixMissingSections(content, missingSections, config) {
  let fixedContent = content;
  
  // Ensure content ends with newline for proper section spacing
  if (fixedContent && !fixedContent.endsWith('\n')) {
    fixedContent += '\n';
  }
  
  // Get section defaults from template
  const sectionDefaults = getSectionDefaults(config);
  
  // Add missing sections at the end
  for (const section of missingSections) {
    const defaultContent = sectionDefaults[section] || '\nTODO: Add content for this section\n';
    fixedContent += `\n## ${section}${defaultContent}`;
  }

  return fixedContent;
}

/**
 * Parse and validate a single ticket file
 * @param {string} filePath - Path to the ticket file
 * @param {Object} config - Configuration object
 * @param {string[]} requiredFields - Required frontmatter fields
 * @param {string[]} requiredSections - Required section headers
 * @param {boolean} fixMode - Whether to fix issues automatically
 * @returns {Object} Validation result with errors, warnings, and fixes
 */
function validateTicketFile(filePath, config, requiredFields, requiredSections, fixMode = false) {
  const filename = path.basename(filePath);
  const result = {
    filename,
    errors: [],
    warnings: [],
    fixed: false,
    missingSections: []
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
    const sectionValidation = validateSections(ticketContent, requiredSections);
    result.errors.push(...sectionValidation.errors);
    result.missingSections = sectionValidation.missingSections;

    // Identify missing frontmatter fields for fixing
    const missingFrontmatterFields = [];
    for (const field of requiredFields) {
      if (!frontmatter[field]) {
        missingFrontmatterFields.push(field);
      }
    }

    // Apply fixes if in fix mode
    if (fixMode && (result.missingSections.length > 0 || missingFrontmatterFields.length > 0)) {
      let fixedFrontmatter = frontmatter;
      let fixedContent = ticketContent;
      let fixedCount = 0;

      // Fix missing frontmatter fields
      if (missingFrontmatterFields.length > 0) {
        fixedFrontmatter = fixMissingFrontmatter(frontmatter, missingFrontmatterFields, config, filename);
        fixedCount += missingFrontmatterFields.length;
      }

      // Fix missing sections
      if (result.missingSections.length > 0) {
        fixedContent = fixMissingSections(ticketContent, result.missingSections, config);
        fixedCount += result.missingSections.length;
      }

      // Write the fixed content
      if (fixedCount > 0) {
        const fixedFrontmatterYaml = yaml.dump(fixedFrontmatter, { 
          defaultStyle: null, 
          quotingType: '"',
          forceQuotes: false
        });
        const newFileContent = '---\n' + fixedFrontmatterYaml + '---' + fixedContent;
        
        try {
          fs.writeFileSync(filePath, newFileContent, 'utf-8');
          result.fixed = true;
          
          // Remove the errors that were fixed
          result.errors = result.errors.filter(error => 
            !error.startsWith('Missing required section:') &&
            !error.startsWith('Missing required frontmatter field:')
          );
          
          // Add success message for fixes
          const messages = [];
          if (missingFrontmatterFields.length > 0) {
            messages.push(`${missingFrontmatterFields.length} missing frontmatter fields`);
          }
          if (result.missingSections.length > 0) {
            messages.push(`${result.missingSections.length} missing sections`);
          }
          result.warnings.push(`Fixed ${messages.join(' and ')}`);
        } catch (error) {
          result.errors.push(`Failed to write fixes: ${error.message}`);
        }
      }
    }

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
 * @param {boolean} fixMode - Whether fixes were applied
 */
function displayResults(results, verbose = false, fixMode = false) {
  let totalErrors = 0;
  let totalWarnings = 0;
  let filesWithIssues = 0;
  let filesFixed = 0;

  console.log('🔍 VibeKit Ticket Linter Results\n');

  for (const result of results) {
    const hasErrors = result.errors.length > 0;
    const hasWarnings = result.warnings.length > 0;
    const wasFixed = result.fixed;

    if (wasFixed) {
      filesFixed++;
      console.log(`🔧 ${result.filename} (FIXED)`);
      if (verbose || fixMode) {
        result.warnings.forEach(warning => {
          console.log(`   Fixed: ${warning}`);
        });
      }
    }

    if (hasErrors || hasWarnings) {
      if (!wasFixed) filesWithIssues++;
      
      if (hasErrors) {
        if (!wasFixed) console.log(`❌ ${result.filename}`);
        result.errors.forEach(error => {
          console.log(`   Error: ${error}`);
        });
        totalErrors += result.errors.length;
      } else if (!wasFixed) {
        console.log(`⚠️  ${result.filename}`);
      }

      if ((verbose || fixMode) && hasWarnings && !wasFixed) {
        result.warnings.forEach(warning => {
          console.log(`   Warning: ${warning}`);
        });
      }
      totalWarnings += result.warnings.length;
      console.log('');
    } else if (verbose && !wasFixed) {
      console.log(`✅ ${result.filename}`);
    }
  }

  // Summary
  console.log(`\n📊 Summary:`);
  console.log(`   Files checked: ${results.length}`);
  console.log(`   Files with issues: ${filesWithIssues}`);
  if (filesFixed > 0) {
    console.log(`   Files fixed: ${filesFixed}`);
  }
  console.log(`   Total errors: ${totalErrors}`);
  console.log(`   Total warnings: ${totalWarnings}`);

  if (totalErrors === 0) {
    if (filesFixed > 0) {
      console.log('\n🎉 All issues have been fixed! Tickets are now properly formatted.');
    } else {
      console.log('\n🎉 All tickets are properly formatted!');
    }
  } else {
    if (fixMode) {
      console.log('\n💡 Some errors could not be automatically fixed. Please review and fix manually.');
    } else {
      console.log('\n💡 Fix the errors above to ensure consistent ticket formatting.');
      console.log('💡 Use --fix flag to automatically fix missing sections.');
    }
  }
}

/**
 * Lint command implementation
 * @param {string[]} args Command arguments
 */
function lintCommand(args) {
  let verbose = false;
  let fixMode = false;
  let specificFile = null;

  // Parse arguments first to check for help
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--verbose' || args[i] === '-v') {
      verbose = true;
    } else if (args[i] === '--fix') {
      fixMode = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
🔍 vibe lint - Validate ticket documentation formatting

Usage:
  vibe lint [options] [file]

Options:
  --verbose, -v    Show detailed output including warnings
  --fix            Automatically fix missing sections using template defaults
  --help, -h       Show this help message

Examples:
  vibe lint                           # Lint all tickets
  vibe lint --verbose                 # Show detailed output
  vibe lint --fix                     # Lint and auto-fix missing sections
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
    validateTicketFile(filePath, config, requiredFields, requiredSections, fixMode)
  );
  
  // Display results
  displayResults(results, verbose, fixMode);
  
  // Exit with error code if there are errors
  const hasErrors = results.some(result => result.errors.length > 0);
  process.exit(hasErrors ? 1 : 0);
}

export default lintCommand;