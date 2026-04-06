import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getTicketsDir } from '../../utils/index.js';

/**
 * List all tickets
 * @param {string[]} args Command arguments
 */
function listCommand(args) {
  // Parse arguments for filtering
  let statusFilter = null;
  let assigneeFilter = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--status=")) {
      statusFilter = args[i].split("=")[1];
    } else if (args[i].startsWith("--assignee=") || args[i].startsWith("--owner=")) {
      assigneeFilter = args[i].split("=")[1];
    }
  }
  
  // Get tickets directory
  const ticketDir = getTicketsDir();
  
  if (!fs.existsSync(ticketDir)) {
    console.error(`❌ Tickets directory not found: ${ticketDir}`);
    process.exit(1);
  }
  
  // Read all markdown files in the tickets directory
  const files = fs.readdirSync(ticketDir).filter(file => file.endsWith(".md"));
  
  if (files.length === 0) {
    console.log("No tickets found.");
    process.exit(0);
  }
  
  // Parse each file to extract frontmatter
  const tickets = [];
  
  for (const file of files) {
    try {
      const filePath = path.join(ticketDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      
      if (match) {
        const frontmatter = yaml.load(match[1]);
        tickets.push({
          id: frontmatter.id || "Unknown",
          title: frontmatter.title || "Untitled",
          status: frontmatter.status || "unknown",
          priority: frontmatter.priority || "medium",
          assignee: frontmatter.assignee || frontmatter.owner || "",
          author: frontmatter.author || "",
          file
        });
      }
    } catch (error) {
      console.warn(`⚠️  Could not parse ticket: ${file}`);
    }
  }
  
  // Filter tickets
  let filteredTickets = tickets;
  if (statusFilter) {
    filteredTickets = filteredTickets.filter(ticket => ticket.status === statusFilter);
  }
  if (assigneeFilter) {
    filteredTickets = filteredTickets.filter(ticket =>
      ticket.assignee.toLowerCase() === assigneeFilter.toLowerCase()
    );
  }
  
  // Sort tickets by ID
  filteredTickets.sort((a, b) => {
    const idA = parseInt(a.id.replace(/\D/g, "")) || 0;
    const idB = parseInt(b.id.replace(/\D/g, "")) || 0;
    return idA - idB;
  });
  
  if (filteredTickets.length === 0) {
    console.log(statusFilter 
      ? `No tickets found with status: ${statusFilter}`
      : "No tickets found.");
    process.exit(0);
  }
  
  // Display tickets in a formatted table
  console.log("\n✨ VibeKit Tickets ✨\n");
  
  // Calculate column widths
  const idWidth = 10;
  const statusWidth = 15;
  const assigneeWidth = 14;
  const titleWidth = 40;

  // Check if any tickets have assignees
  const hasAssignees = filteredTickets.some(t => t.assignee);

  // Print header
  if (hasAssignees) {
    console.log(
      `${"ID".padEnd(idWidth)}${"|"} ${"STATUS".padEnd(statusWidth)}${"|"} ${"ASSIGNEE".padEnd(assigneeWidth)}${"|"} TITLE`
    );
    console.log(`${'-'.repeat(idWidth)}+${'-'.repeat(statusWidth + 2)}+${'-'.repeat(assigneeWidth + 2)}+${'-'.repeat(titleWidth)}`);
  } else {
    console.log(
      `${"ID".padEnd(idWidth)}${"|"} ${"STATUS".padEnd(statusWidth)}${"|"} TITLE`
    );
    console.log(`${'-'.repeat(idWidth)}+${'-'.repeat(statusWidth + 2)}+${'-'.repeat(titleWidth)}`);
  }
  
  for (const ticket of filteredTickets) {
    let statusColor = "";
    
    // Add color based on status
    switch (ticket.status) {
      case "done":
        statusColor = "\x1b[32m"; // Green
        break;
      case "in_progress":
        statusColor = "\x1b[33m"; // Yellow
        break;
      case "review":
        statusColor = "\x1b[36m"; // Cyan
        break;
      default:
        statusColor = "\x1b[0m"; // Default
    }
    
    // Format each row
    const truncatedTitle = ticket.title.length > titleWidth - 3
      ? ticket.title.substring(0, titleWidth - 3) + "..."
      : ticket.title;

    if (hasAssignees) {
      console.log(
        `${ticket.id.padEnd(idWidth)}${"|"} ${
          statusColor + ticket.status.padEnd(statusWidth - 1) + "\x1b[0m"
        }${"|"} ${
          (ticket.assignee || "").padEnd(assigneeWidth - 1)
        }${"|"} ${truncatedTitle}`
      );
    } else {
      console.log(
        `${ticket.id.padEnd(idWidth)}${"|"} ${
          statusColor + ticket.status.padEnd(statusWidth - 1) + "\x1b[0m"
        }${"|"} ${truncatedTitle}`
      );
    }
  }

  if (hasAssignees) {
    console.log(`${'-'.repeat(idWidth)}+${'-'.repeat(statusWidth + 2)}+${'-'.repeat(assigneeWidth + 2)}+${'-'.repeat(titleWidth)}`);
  } else {
    console.log(`${'-'.repeat(idWidth)}+${'-'.repeat(statusWidth + 2)}+${'-'.repeat(titleWidth)}`);
  }

  const filters = [
    statusFilter ? `status: ${statusFilter}` : '',
    assigneeFilter ? `assignee: ${assigneeFilter}` : '',
  ].filter(Boolean).join(', ');
  console.log(`Found ${filteredTickets.length} ticket(s)${filters ? ` (${filters})` : ''}.\n`);
}

export default listCommand;
