import fs from 'fs';
import path from 'path';

/**
 * Normalize ticket ID to find the actual ticket file
 * Handles formats: 9, 009, TKT-9, TKT-009
 * @param {string|number} input - The ticket identifier
 * @returns {Object|null} Ticket info object or null if not found
 * @throws {Error} If input is invalid or tickets directory is inaccessible
 */
export function resolveTicketId(input) {
  // Validate input
  if (!input && input !== 0) {
    return null;
  }
  
  const ticketsDir = path.join(process.cwd(), '.vibe', 'tickets');
  
  try {
    if (!fs.existsSync(ticketsDir)) {
      return null;
    }
    
    const files = fs.readdirSync(ticketsDir).filter(f => f.endsWith('.md'));
    
    // Clean and validate input
    let cleanInput = input.toString().trim().toUpperCase();
    
    // Remove TKT- prefix if present
    if (cleanInput.startsWith('TKT-')) {
      cleanInput = cleanInput.replace('TKT-', '');
    }
    
    // Validate numeric part
    if (!/^\d+$/.test(cleanInput)) {
      throw new Error(`Invalid ticket ID format: ${input}. Expected numeric ID or TKT-XXX format.`);
    }
    
    // Pad with zeros to make it 3 digits
    const paddedNumber = cleanInput.padStart(3, '0');
    const fullId = `TKT-${paddedNumber}`;
    
    // Find file that starts with this ID
    const matchingFile = files.find(file => file.startsWith(fullId));
    
    if (matchingFile) {
      return {
        id: fullId,
        file: matchingFile,
        path: path.join(ticketsDir, matchingFile)
      };
    }
    
    return null;
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied accessing tickets directory: ${ticketsDir}`);
    }
    throw error;
  }
}

/**
 * Parse ticket markdown file while preserving exact format
 * @param {string} filePath - Path to the ticket file
 * @returns {Object} Parsed ticket data with metadata and content
 * @throws {Error} If file cannot be read or parsed
 */
export function parseTicket(filePath) {
  // Validate input
  if (typeof filePath !== 'string') {
    throw new Error('File path must be a string');
  }
  
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Ticket file not found: ${filePath}`);
    }
    
    // Check if file is readable
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (accessError) {
      throw new Error(`Cannot read ticket file: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.trim()) {
      throw new Error('Ticket file is empty');
    }
    
    const lines = content.split('\n');
    
    // Validate YAML frontmatter structure
    if (lines.length < 3) {
      throw new Error('Invalid ticket format: file too short to contain valid frontmatter');
    }
    
    if (lines[0] !== '---') {
      throw new Error('Invalid ticket format: missing opening YAML frontmatter delimiter (---)'); 
    }
    
    const yamlEndIndex = lines.findIndex((line, index) => index > 0 && line === '---');
    if (yamlEndIndex === -1) {
      throw new Error('Invalid ticket format: missing closing YAML frontmatter delimiter (---)');
    }
    
    const yamlLines = lines.slice(1, yamlEndIndex);
    const contentLines = lines.slice(yamlEndIndex + 1);
    
    // Parse YAML manually to preserve exact formatting
    const metadata = {};
    const invalidLines = [];
    
    for (let i = 0; i < yamlLines.length; i++) {
      const line = yamlLines[i];
      if (line.trim() === '') continue; // Skip empty lines
      
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        
        if (key) {
          metadata[key] = value;
        } else {
          invalidLines.push(i + 2); // +2 for 0-based index and skipping first ---
        }
      } else if (line.trim() !== '') {
        invalidLines.push(i + 2);
      }
    }
    
    if (invalidLines.length > 0) {
      console.warn(`⚠️  Warning: Invalid YAML lines found at line(s) ${invalidLines.join(', ')} in ${path.basename(filePath)}`);
    }
    
    // Validate required metadata fields
    if (!metadata.id) {
      console.warn(`⚠️  Warning: Missing 'id' field in ticket metadata`);
    }
    
    if (!metadata.title) {
      console.warn(`⚠️  Warning: Missing 'title' field in ticket metadata`);
    }
    
    return {
      metadata,
      yamlLines,
      contentLines,
      fullContent: content,
      filePath
    };
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Ticket file not found: ${filePath}`);
    }
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied reading ticket file: ${filePath}`);
    }
    if (error.code === 'EISDIR') {
      throw new Error(`Expected file but found directory: ${filePath}`);
    }
    
    throw new Error(`Failed to parse ticket ${path.basename(filePath)}: ${error.message}`);
  }
}

/**
 * Update ticket file while preserving exact format
 * @param {string} filePath - Path to the ticket file
 * @param {Object} ticketData - Parsed ticket data
 * @param {Object} updates - Updates to apply to the ticket
 * @returns {Object} Update result with success status and new path
 * @throws {Error} If update operation fails
 */
export function updateTicket(filePath, ticketData, updates) {
  // Validate inputs
  if (typeof filePath !== 'string') {
    throw new Error('File path must be a string');
  }
  
  if (!ticketData || typeof ticketData !== 'object') {
    throw new Error('Ticket data must be a valid object');
  }
  
  if (!updates || typeof updates !== 'object') {
    throw new Error('Updates must be a valid object');
  }
  
  if (Object.keys(updates).length === 0) {
    return { success: true, newPath: filePath, message: 'No updates to apply' };
  }
  
  try {
    // Check if original file exists and is writable
    if (!fs.existsSync(filePath)) {
      throw new Error(`Original ticket file not found: ${filePath}`);
    }
    
    try {
      fs.accessSync(filePath, fs.constants.W_OK);
    } catch (accessError) {
      throw new Error(`Cannot write to ticket file: ${filePath}`);
    }
    
    let newFilePath = filePath;
    
    // Determine new file path if slug is being updated
    if (updates.slug) {
      const ticketId = ticketData.metadata.id || 'TKT-000';
      const cleanSlug = updates.slug.toString().trim();
      
      if (!cleanSlug) {
        throw new Error('Slug cannot be empty');
      }
      
      const newSlug = `${ticketId}-${cleanSlug}`;
      const newFileName = `${newSlug}.md`;
      const ticketsDir = path.dirname(filePath);
      newFilePath = path.join(ticketsDir, newFileName);
      
      // Check if target file already exists (unless it's the same file)
      if (newFilePath !== filePath && fs.existsSync(newFilePath)) {
        throw new Error(`Target file already exists: ${path.basename(newFilePath)}`);
      }
    }
    
    // Create updated YAML lines with timestamp
    const timestamp = new Date().toISOString();
    const updatedYamlLines = [...ticketData.yamlLines];
    
    // Update existing fields or add new ones
    let updatedTimestamp = false;
    let updatedSlug = false;
    let updatedTitle = false;
    
    for (let i = 0; i < updatedYamlLines.length; i++) {
      const line = updatedYamlLines[i];
      
      if (line.startsWith('updated_at:')) {
        updatedYamlLines[i] = `updated_at: ${timestamp}`;
        updatedTimestamp = true;
      } else if (line.startsWith('slug:') && updates.slug) {
        const ticketId = ticketData.metadata.id || 'TKT-000';
        const fullSlug = `${ticketId}-${updates.slug}`;
        updatedYamlLines[i] = `slug: ${fullSlug}`;
        updatedSlug = true;
      } else if (line.startsWith('title:') && updates.title) {
        // Ensure title is properly quoted if it contains special characters
        const cleanTitle = updates.title.trim();
        const needsQuotes = /[:\[\]{}|>]/.test(cleanTitle) || cleanTitle.includes('#');
        const formattedTitle = needsQuotes ? `"${cleanTitle.replace(/"/g, '\\"')}"` : cleanTitle;
        updatedYamlLines[i] = `title: ${formattedTitle}`;
        updatedTitle = true;
      }
    }
    
    // Add missing fields
    if (!updatedTimestamp) {
      updatedYamlLines.push(`updated_at: ${timestamp}`);
    }
    
    if (updates.slug && !updatedSlug) {
      const ticketId = ticketData.metadata.id || 'TKT-000';
      const fullSlug = `${ticketId}-${updates.slug}`;
      updatedYamlLines.push(`slug: ${fullSlug}`);
    }
    
    if (updates.title && !updatedTitle) {
      const cleanTitle = updates.title.trim();
      const needsQuotes = /[:\[\]{}|>]/.test(cleanTitle) || cleanTitle.includes('#');
      const formattedTitle = needsQuotes ? `"${cleanTitle.replace(/"/g, '\\"')}"` : cleanTitle;
      updatedYamlLines.push(`title: ${formattedTitle}`);
    }
    
    // Update content sections
    let newContentLines = [...ticketData.contentLines];
    const updatedSections = [];
    
    Object.keys(updates).forEach(key => {
      if (key !== 'slug' && updates[key]) {
        const sectionHeader = `## ${key}`;
        if (hasSectionContent(newContentLines, sectionHeader)) {
          newContentLines = replaceSectionContent(newContentLines, sectionHeader, updates[key]);
          updatedSections.push(key);
        }
      }
    });
    
    // Reconstruct file content
    const reconstructed = [
      '---',
      ...updatedYamlLines,
      '---',
      ...newContentLines
    ].join('\n');
    
    // Write to new file path
    try {
      fs.writeFileSync(newFilePath, reconstructed, 'utf8');
    } catch (writeError) {
      if (writeError.code === 'ENOSPC') {
        throw new Error('Not enough disk space to update ticket');
      }
      if (writeError.code === 'EACCES') {
        throw new Error(`Permission denied writing to: ${newFilePath}`);
      }
      throw new Error(`Failed to write updated ticket: ${writeError.message}`);
    }
    
    // Handle file rename if necessary
    if (newFilePath !== filePath) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (deleteError) {
        console.warn(`⚠️  Warning: Could not remove old file ${path.basename(filePath)}: ${deleteError.message}`);
      }
    }
    
    const result = { 
      success: true, 
      newPath: newFilePath,
      updatedSections,
      renamed: newFilePath !== filePath
    };
    
    if (result.renamed) {
      result.message = `Renamed ticket file to: ${path.basename(newFilePath)}`;
    }
    
    return result;
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Ticket file not found: ${filePath}`);
    }
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied updating ticket: ${filePath}`);
    }
    
    throw new Error(`Failed to update ticket ${path.basename(filePath)}: ${error.message}`);
  }
}

/**
 * Replace content of a specific section
 * @param {string[]} lines - Array of content lines
 * @param {string} sectionHeader - Section header to find (e.g., "## Description")
 * @param {string} newContent - New content for the section
 * @returns {string[]} Updated lines array
 */
function replaceSectionContent(lines, sectionHeader, newContent) {
  if (!Array.isArray(lines)) {
    throw new Error('Lines must be an array');
  }
  
  if (typeof sectionHeader !== 'string' || !sectionHeader.trim()) {
    throw new Error('Section header must be a non-empty string');
  }
  
  if (typeof newContent !== 'string') {
    throw new Error('New content must be a string');
  }
  
  const sectionIndex = lines.findIndex(line => 
    line && typeof line === 'string' && line.trim() === sectionHeader.trim()
  );
  
  if (sectionIndex === -1) {
    return lines; // Section not found, return unchanged
  }
  
  // Find next section or end of content
  let nextSectionIndex = lines.length;
  for (let i = sectionIndex + 1; i < lines.length; i++) {
    if (lines[i] && typeof lines[i] === 'string' && lines[i].match(/^##\s+/)) {
      nextSectionIndex = i;
      break;
    }
  }
  
  // Replace section content
  const before = lines.slice(0, sectionIndex + 1);
  const after = lines.slice(nextSectionIndex);
  
  // Format new content with proper spacing
  const newSectionContent = newContent.trim() ? ['', newContent.trim(), ''] : ['', ''];
  
  return [...before, ...newSectionContent, ...after];
}

/**
 * Check if section exists in content
 * @param {string[]} lines - Array of content lines
 * @param {string} sectionHeader - Section header to find
 * @returns {boolean} True if section exists
 */
function hasSectionContent(lines, sectionHeader) {
  if (!Array.isArray(lines)) {
    return false;
  }
  
  if (typeof sectionHeader !== 'string' || !sectionHeader.trim()) {
    return false;
  }
  
  const sectionIndex = lines.findIndex(line => 
    line && typeof line === 'string' && line.trim() === sectionHeader.trim()
  );
  
  return sectionIndex !== -1;
}

