#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const args = process.argv.slice(2);
const command = args[0];
const targetFolder = args[1] || ".vibe";

const configTemplate = `# VibeKit Configuration
# Created: ${new Date().toISOString().split("T")[0]}

project:
  name: ""
  description: ""

tickets:
  path: "${targetFolder}/tickets"
  id_format: "TKT-{number}"
  default_template: "${targetFolder}/.templates/default.md"
  status_options:
    - open
    - in_progress
    - review
    - done
  priority_options:
    - low
    - medium
    - high
    - critical

ai:
  enabled: true
  provider: "openai"
  model: "gpt-4"
  context_window: 10

ui:
  theme: "default"
  color_scheme: "dark"

hooks:
  pre_commit: false
  post_checkout: false
`;

const ticketTemplate = `---
id: TKT-XXX
title: ""
status: open
priority: medium
created_at: YYYY-MM-DD
---

## Description

<!-- Fill in the details of the task here -->
`;

if (command === "init") {
  if (fs.existsSync(targetFolder)) {
    console.log(`⚠️  Folder '${targetFolder}' already exists. Skipping creation.`);
    process.exit(0);
  }

  fs.mkdirSync(targetFolder, { recursive: true });
  fs.mkdirSync(path.join(targetFolder, "tickets"), { recursive: true });
  fs.mkdirSync(path.join(targetFolder, ".templates"), { recursive: true });

  fs.writeFileSync(path.join(targetFolder, "config.yml"), configTemplate);
  fs.writeFileSync(path.join(targetFolder, ".templates", "default.md"), ticketTemplate);

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