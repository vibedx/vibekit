import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getTicketsDir, getConfig, getNextTicketId, createSlug } from '../../utils/index.js';

/**
 * Helper function to create sample tickets for the onboarding experience
 * @param {string} title - The title of the ticket
 * @param {string} description - The description of the ticket
 * @param {string} priority - The priority of the ticket (low, medium, high)
 * @param {string} status - The status of the ticket (open, in_progress, review, done)
 */
function createSampleTicket(title, description, priority = "medium", status = "open") {
  const configPath = path.join(process.cwd(), ".vibe", "config.yml");
  const templatePath = path.join(process.cwd(), ".vibe", ".templates", "default.md");
  
  if (!fs.existsSync(configPath) || !fs.existsSync(templatePath)) {
    console.error("❌ Missing config.yml or default.md template.");
    return false;
  }
  
  const config = yaml.load(fs.readFileSync(configPath, "utf-8"));
  const template = fs.readFileSync(templatePath, "utf-8");
  const ticketDir = path.join(process.cwd(), config.tickets?.path || ".vibe/tickets");
  
  const files = fs.readdirSync(ticketDir);
  const ticketNumbers = files
    .map(f => f.match(/^TKT-(\\d+)/))
    .filter(Boolean)
    .map(match => parseInt(match[1], 10));
  const nextId = Math.max(0, ...ticketNumbers) + 1;
  const paddedId = String(nextId).padStart(3, "0");
  const now = new Date().toISOString();
  
  const ticketId = `TKT-${paddedId}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const filename = `${ticketId}-${slug}.md`;
  
  // Replace template placeholders with actual values
  let content = template
    .replace(/{id}/g, paddedId)
    .replace(/{title}/g, title)
    .replace(/{date}/g, now);
    
  // Replace priority and status in the frontmatter
  content = content.replace(/^priority: .*$/m, `priority: ${priority}`);
  content = content.replace(/^status: .*$/m, `status: ${status}`);
  
  // Add description
  content = content.replace(/## Description\\s*\\n\\s*\\n/m, `## Description\\n\\n${description}\\n\\n`);
  
  // Add AI prompt for the feature request example
  if (title.includes("AI Prompt")) {
    content = content.replace(/## AI Prompt\\s*\\n\\s*\\n/m, 
      `## AI Prompt\\n\\nGenerate ideas for implementing this feature in a Node.js CLI application. Consider user experience, error handling, and performance.\\n\\n`);
  }
  
  const outputPath = path.join(ticketDir, filename);
  fs.writeFileSync(outputPath, content, "utf-8");
  
  console.log(`✅ Created sample ticket: ${filename}`);
  return true;
}

/**
 * Create onboarding materials for VibeKit
 * @param {string[]} args Command arguments
 */
function getStartedCommand(args) {
  console.log("✨ Welcome to VibeKit! Setting up your onboarding experience...");
  
  // Check if .vibe directory exists
  if (!fs.existsSync(path.join(process.cwd(), ".vibe"))) {
    console.error("❌ VibeKit is not initialized. Please run 'vibe init' first.");
    process.exit(1);
  }
  
  // Create .vibe/README.md with instructions
  const readmePath = path.join(process.cwd(), ".vibe", "README.md");
  const readmeContent = `# Welcome to VibeKit

VibeKit is a CLI tool for managing tickets, project context, and AI suggestions inside your repository.

## Getting Started

Here are the main commands you can use:

- \`vibe init\` - Initialize VibeKit in your repository
- \`vibe new "Ticket title"\` - Create a new ticket
- \`vibe list\` - List all tickets
- \`vibe close TKT-XXX\` - Mark a ticket as done
- \`vibe get-started\` - Create sample tickets and documentation

## Ticket Structure

Each ticket is a Markdown file with YAML frontmatter containing metadata like:
- id
- title
- status
- priority
- created_at
- updated_at

The body of the ticket contains sections for Description, Acceptance Criteria, Notes, and AI prompts.

## Next Steps

Check out the sample tickets we've created for you to see how VibeKit can be used in your workflow.
`;
  
  fs.writeFileSync(readmePath, readmeContent, "utf-8");
  console.log("✅ Created README.md with getting started instructions");
  
  // Create sample tickets
  createSampleTicket(
    "Simple Task Example", 
    "This is a simple task ticket example showing the basic structure.", 
    "low"
  );
  
  createSampleTicket(
    "Bug Report Example", 
    "This ticket demonstrates how to report and track bugs using VibeKit.", 
    "high",
    "in_progress"
  );
  
  createSampleTicket(
    "Feature Request with AI Prompt", 
    "This example shows how to use the AI prompt section to get assistance with implementing a feature.", 
    "medium"
  );
  
  console.log("✅ Created sample tickets to demonstrate VibeKit features");
  console.log("\n✨ You're all set! Try running 'vibe list' to see your tickets.\n");
}

export default getStartedCommand;
