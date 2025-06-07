import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * Get the path to the tickets directory from config or use default
 * @returns {string} Path to the tickets directory
 */
function getTicketsDir() {
  const configPath = path.join(process.cwd(), ".vibe", "config.yml");
  let ticketDir = path.join(process.cwd(), ".vibe", "tickets");
  
  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf-8");
      const config = yaml.load(configContent) || {};
      if (config.tickets?.path) {
        ticketDir = path.join(process.cwd(), config.tickets.path);
      }
    }
  } catch (error) {
    console.error(`❌ Error reading config: ${error.message}`);
  }
  
  return ticketDir;
}

/**
 * Get the configuration from .vibe/config.yml
 * @returns {object} The configuration object
 */
function getConfig() {
  const configPath = path.join(process.cwd(), ".vibe", "config.yml");
  let config = {};
  
  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, "utf-8");
      config = yaml.load(configContent) || {};
    }
  } catch (error) {
    console.error(`❌ Error reading config: ${error.message}`);
  }
  
  return config;
}

/**
 * Generate the next ticket ID based on existing tickets
 * @returns {string} The next ticket ID (e.g., "TKT-004")
 */
function getNextTicketId() {
  const ticketDir = getTicketsDir();
  
  if (!fs.existsSync(ticketDir)) {
    return "TKT-001";
  }
  
  const files = fs.readdirSync(ticketDir);
  const ticketNumbers = files
    .map(f => f.match(/^TKT-(\d+)/))
    .filter(Boolean)
    .map(match => parseInt(match[1], 10));
  
  const nextId = Math.max(0, ...ticketNumbers) + 1;
  const paddedId = String(nextId).padStart(3, "0");
  
  return `TKT-${paddedId}`;
}

/**
 * Create a slug from a title based on configuration
 * @param {string} title The title to slugify
 * @param {object} config Optional configuration object
 * @returns {string} The slugified title
 */
function createSlug(title, config = null) {
  if (!title) return '';
  
  // Get configuration
  const cfg = config || getConfig();
  const maxLength = cfg.tickets?.slug?.max_length || 30;
  const wordLimit = cfg.tickets?.slug?.word_limit || 5;
  
  // Split into words and limit the number of words
  const words = title.split(/\s+/).filter(Boolean);
  const limitedWords = words.slice(0, wordLimit).join(' ');
  
  // Create the basic slug
  let slug = limitedWords.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-|-$/g, '');      // Remove leading/trailing hyphens
  
  // Limit the length
  if (slug.length > maxLength) {
    slug = slug.substring(0, maxLength).replace(/-+$/, '');
  }
  
  return slug;
}

export {
  getTicketsDir,
  getConfig,
  getNextTicketId,
  createSlug
};
