import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Get the path to the tickets directory from config or use default
 * Reads the configuration file to determine the tickets directory path.
 * Falls back to default path if config is missing or invalid.
 * @returns {string} Absolute path to the tickets directory
 * @throws {Error} Logs error but doesn't throw - returns default path
 */
function getTicketsDir() {
  const configPath = path.join(process.cwd(), '.vibe', 'config.yml');
  let ticketDir = path.join(process.cwd(), '.vibe', 'tickets');
  
  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = yaml.load(configContent) || {};
      
      if (config.tickets?.path && typeof config.tickets.path === 'string') {
        const customPath = path.resolve(process.cwd(), config.tickets.path);
        ticketDir = customPath;
      }
    }
  } catch (error) {
    console.error(`❌ Error reading config: ${error.message}`);
  }
  
  return ticketDir;
}

/**
 * Get the configuration from .vibe/config.yml
 * Loads and parses the YAML configuration file for VibeKit.
 * Returns empty object if file doesn't exist or cannot be parsed.
 * @returns {Object} The configuration object (empty if file missing/invalid)
 * @example
 * const config = getConfig();
 * console.log(config.tickets?.path); // Access tickets path
 */
function getConfig() {
  const configPath = path.join(process.cwd(), '.vibe', 'config.yml');
  let config = {};
  
  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const parsedConfig = yaml.load(configContent);
      
      // Ensure we have a valid object
      if (parsedConfig && typeof parsedConfig === 'object') {
        config = parsedConfig;
      }
    }
  } catch (error) {
    console.error(`❌ Error reading config: ${error.message}`);
  }
  
  return config;
}

/**
 * Generate the next ticket ID based on existing tickets
 * Scans the tickets directory for existing ticket files and generates
 * the next sequential ID in the format TKT-XXX (zero-padded to 3 digits).
 * @returns {string} The next ticket ID (e.g., "TKT-004")
 * @example
 * const nextId = getNextTicketId();
 * console.log(nextId); // "TKT-005"
 */
function getNextTicketId() {
  const ticketDir = getTicketsDir();
  
  // If tickets directory doesn't exist, start with 001
  if (!fs.existsSync(ticketDir)) {
    return 'TKT-001';
  }
  
  try {
    const files = fs.readdirSync(ticketDir);
    const ticketNumbers = files
      .filter(f => f.endsWith('.md')) // Only consider markdown files
      .map(f => f.match(/^TKT-(\d+)/))
      .filter(Boolean)
      .map(match => parseInt(match[1], 10))
      .filter(num => !isNaN(num) && num > 0); // Filter out invalid numbers
    
    // Find the highest existing number and add 1
    const nextId = Math.max(0, ...ticketNumbers) + 1;
    const paddedId = String(nextId).padStart(3, '0');
    
    return `TKT-${paddedId}`;
  } catch (error) {
    console.error(`❌ Error scanning tickets directory: ${error.message}`);
    return 'TKT-001'; // Fallback to first ticket
  }
}

/**
 * Create a slug from a title based on configuration
 * Converts a human-readable title into a URL-friendly slug following
 * configuration rules for maximum length and word limits.
 * @param {string} title - The title to slugify
 * @param {Object|null} config - Optional configuration object (defaults to getConfig())
 * @returns {string} The slugified title (kebab-case, lowercase)
 * @example
 * createSlug('Fix User Authentication Bug'); // 'fix-user-authentication-bug'
 * createSlug('Very Long Title That Exceeds Limits', { tickets: { slug: { max_length: 10 } } }); // 'very-long'
 */
function createSlug(title, config = null) {
  if (!title || typeof title !== 'string') {
    return '';
  }
  
  // Get configuration with fallback defaults
  const cfg = config || getConfig();
  const maxLength = cfg.tickets?.slug?.max_length || 30;
  const wordLimit = cfg.tickets?.slug?.word_limit || 5;
  
  // Validate configuration values
  const safeMaxLength = Math.max(1, Math.min(100, maxLength)); // Clamp between 1-100
  const safeWordLimit = Math.max(1, Math.min(20, wordLimit)); // Clamp between 1-20
  
  // Split into words and limit the number of words
  const words = title.trim().split(/\s+/).filter(Boolean);
  const limitedWords = words.slice(0, safeWordLimit).join(' ');
  
  // Create the basic slug
  let slug = limitedWords.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '');    // Remove leading/trailing hyphens
  
  // Limit the length and ensure we don't cut in the middle of a word
  if (slug.length > safeMaxLength) {
    slug = slug.substring(0, safeMaxLength);
    // Remove trailing partial words (anything after the last hyphen)
    const lastHyphen = slug.lastIndexOf('-');
    if (lastHyphen > 0) {
      slug = slug.substring(0, lastHyphen);
    }
  }
  
  return slug || 'untitled'; // Fallback if slug is empty
}

/**
 * Create a full slug with ticket ID prefix
 * Combines a ticket ID with a descriptive slug to create a complete
 * filename-ready identifier.
 * @param {string} ticketId - The ticket ID (e.g., "TKT-009")
 * @param {string} slugText - The descriptive slug text part
 * @returns {string} Full slug with ticket ID prefix (e.g., "TKT-009-fix-auth-bug")
 * @example
 * createFullSlug('TKT-001', 'user-login-fix'); // 'TKT-001-user-login-fix'
 */
function createFullSlug(ticketId, slugText) {
  // Validate inputs
  if (!ticketId || typeof ticketId !== 'string') {
    return '';
  }
  
  if (!slugText || typeof slugText !== 'string') {
    return ticketId; // Return just the ticket ID if no slug text
  }
  
  // Clean inputs
  const cleanTicketId = ticketId.trim();
  const cleanSlugText = slugText.trim();
  
  if (!cleanTicketId || !cleanSlugText) {
    return cleanTicketId || '';
  }
  
  return `${cleanTicketId}-${cleanSlugText}`;
}

export {
  getTicketsDir,
  getConfig,
  getNextTicketId,
  createSlug,
  createFullSlug
};
