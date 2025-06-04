import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getTicketsDir, getConfig, getNextTicketId, createSlug } from '../../utils/index.js';

// The sample ticket creation and get-started functionality has been moved to src/commands/get-started/index.js

/**
 * Create a new ticket
 * @param {string[]} args Command arguments
 */
function newCommand(args) {
  // Parse arguments and flags
  let titleArg = "";
  let priority = "medium"; // Default priority
  let status = "open";     // Default status
  
  // Process arguments to extract title and flags
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--priority" && i + 1 < args.length) {
      priority = args[i + 1];
      i++; // Skip the next argument as it's the priority value
    } else if (args[i] === "--status" && i + 1 < args.length) {
      status = args[i + 1];
      i++; // Skip the next argument as it's the status value
    } else if (!args[i].startsWith("--")) {
      // If not a flag, it's part of the title
      titleArg += (titleArg ? " " : "") + args[i];
    }
  }
  
  if (!titleArg) {
    console.error("❌ Please provide a title for the new ticket.");
    process.exit(1);
  }
  
  // No special handling for "get started" anymore - it's a separate command now

  const configPath = path.join(process.cwd(), ".vibe", "config.yml");
  const templatePath = path.join(process.cwd(), ".vibe", ".templates", "default.md");

  if (!fs.existsSync(configPath) || !fs.existsSync(templatePath)) {
    console.error("❌ Missing config.yml or default.md template.");
    process.exit(1);
  }

  const config = yaml.load(fs.readFileSync(configPath, "utf-8"));
  const template = fs.readFileSync(templatePath, "utf-8");
  const ticketDir = path.join(process.cwd(), config.tickets?.path || ".vibe/tickets");

  const ticketId = getNextTicketId();
  const paddedId = ticketId.replace("TKT-", "");
  const now = new Date().toISOString(); // Use full ISO timestamp

  const slug = createSlug(titleArg);
  const filename = `${ticketId}-${slug}.md`;
  
  // Validate priority and status against config options if available
  if (config.tickets?.priority_options && !config.tickets.priority_options.includes(priority)) {
    console.warn(`⚠️  Priority '${priority}' not in config options. Using default.`);
    priority = "medium";
  }
  
  if (config.tickets?.status_options && !config.tickets.status_options.includes(status)) {
    console.warn(`⚠️  Status '${status}' not in config options. Using default.`);
    status = "open";
  }
  
  // Replace template placeholders with actual values
  let content = template
    .replace(/{id}/g, paddedId)
    .replace(/{title}/g, titleArg)
    .replace(/{date}/g, now);
    
  // Replace priority and status in the frontmatter
  content = content.replace(/^priority: .*$/m, `priority: ${priority}`);
  content = content.replace(/^status: .*$/m, `status: ${status}`);

  const outputPath = path.join(ticketDir, filename);
  fs.writeFileSync(outputPath, content, "utf-8");

  console.log(`✅ Created ticket: ${filename} (priority: ${priority}, status: ${status})`);
}

export default newCommand;
