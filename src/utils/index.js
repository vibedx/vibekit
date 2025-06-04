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
 * Create a slug from a title
 * @param {string} title The title to slugify
 * @returns {string} The slugified title
 */
function createSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export {
  getTicketsDir,
  getConfig,
  getNextTicketId,
  createSlug
};
