#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const args = process.argv.slice(2);
const command = args[0];
const targetFolder = args[1] || ".vibe";

// Use real files instead of hardcoded template strings
const templateSrc = path.join(__dirname, "assets", "default.md");
const configSrc = path.join(__dirname, "assets", "config.yml");

if (command === "init") {
  if (fs.existsSync(targetFolder)) {
    console.log(`⚠️  Folder '${targetFolder}' already exists. Skipping creation.`);
    process.exit(0);
  }

  fs.mkdirSync(targetFolder, { recursive: true });
  fs.mkdirSync(path.join(targetFolder, "tickets"), { recursive: true });
  fs.mkdirSync(path.join(targetFolder, ".templates"), { recursive: true });

  // Copy files from assets directory instead of using hardcoded templates
  fs.copyFileSync(configSrc, path.join(targetFolder, "config.yml"));
  fs.copyFileSync(templateSrc, path.join(targetFolder, ".templates", "default.md"));

  console.log(`✅ '${targetFolder}' initialized with config, tickets/, and .templates/default.md`);
} else {
  console.log("Available commands: init [folderName]");
}


if (command === "close") {
  const ticketArg = args[1];

  if (!ticketArg) {
    console.error("❌ Please provide a ticket ID or number.");
    process.exit(1);
  }

  const ticketFolder = path.join(process.cwd(), ".vibe", "tickets");
  const files = fs.readdirSync(ticketFolder);
  const normalizedInput = ticketArg.startsWith("TKT-")
    ? ticketArg
    : `TKT-${ticketArg.padStart(3, "0")}`;

  let matchFound = false;

  for (const file of files) {
    const fullPath = path.join(ticketFolder, file);
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

  process.exit(0);
}


if (command === "new") {
  // Parse arguments and flags
  let titleArg = "";
  let priority = "medium"; // Default priority
  let status = "open";     // Default status
  
  // Process arguments to extract title and flags
  for (let i = 1; i < args.length; i++) {
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

  const configPath = path.join(process.cwd(), ".vibe", "config.yml");
  const templatePath = path.join(process.cwd(), ".vibe", ".templates", "default.md");

  if (!fs.existsSync(configPath) || !fs.existsSync(templatePath)) {
    console.error("❌ Missing config.yml or default.md template.");
    process.exit(1);
  }

  const config = yaml.load(fs.readFileSync(configPath, "utf-8"));
  const template = fs.readFileSync(templatePath, "utf-8");
  const ticketDir = path.join(process.cwd(), config.tickets?.path || ".vibe/tickets");

  const files = fs.readdirSync(ticketDir);
  const ticketNumbers = files
    .map(f => f.match(/^TKT-(\d+)/))
    .filter(Boolean)
    .map(match => parseInt(match[1], 10));
  const nextId = Math.max(0, ...ticketNumbers) + 1;
  const paddedId = String(nextId).padStart(3, "0");
  const now = new Date().toISOString(); // Use full ISO timestamp

  const ticketId = `TKT-${paddedId}`;
  const slug = titleArg.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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