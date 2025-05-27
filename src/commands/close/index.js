import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getTicketsDir } from '../../utils/index.js';

/**
 * Mark a ticket as done
 * @param {string[]} args Command arguments
 */
function closeCommand(args) {
  const ticketArg = args[0];

  if (!ticketArg) {
    console.error("❌ Please provide a ticket ID or number.");
    process.exit(1);
  }

  const ticketFolder = getTicketsDir();
  
  if (!fs.existsSync(ticketFolder)) {
    console.error(`❌ Tickets directory not found: ${ticketFolder}`);
    process.exit(1);
  }
  
  const files = fs.readdirSync(ticketFolder);
  const normalizedInput = ticketArg.startsWith("TKT-")
    ? ticketArg
    : `TKT-${ticketArg.padStart(3, "0")}`;

  let matchFound = false;

  for (const file of files) {
    const fullPath = path.join(ticketFolder, file);
    
    // Skip directories
    if (fs.statSync(fullPath).isDirectory()) {
      continue;
    }
    
    const content = fs.readFileSync(fullPath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (match) {
      const frontmatter = yaml.load(match[1]);
      if (
        frontmatter.id === normalizedInput ||
        file.includes(normalizedInput)
      ) {
        frontmatter.status = "done";

        const updated = `---\n${yaml.dump(frontmatter)}---${content.split("---").slice(2).join("---")}`;
        fs.writeFileSync(fullPath, updated, "utf-8");

        console.log(`✅ Ticket ${frontmatter.id} marked as done.`);
        matchFound = true;
        break;
      }
    }
  }

  if (!matchFound) {
    console.log(`❌ No ticket matching '${ticketArg}' found.`);
  }
}

export default closeCommand;
