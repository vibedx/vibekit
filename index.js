#!/usr/bin/env node

/**
 * VibeKit - A developer-focused ticket and task management CLI tool
 * 
 * This is the main entry point for the VibeKit CLI application.
 * It handles command routing and provides a consistent interface
 * for all VibeKit operations.
 * 
 * @fileoverview Main CLI entry point for VibeKit
 * @author VibeKit Team
 * @version 1.0.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Available commands in VibeKit, grouped by where they fall in the workflow.
// Keep this the single source of truth — AVAILABLE_COMMANDS is derived from it
// so the command list and the help text cannot drift apart.
const COMMAND_GROUPS = [
  {
    title: 'Setup',
    commands: [
      ['init', 'Set up .vibe/ in the current project'],
      ['get-started', 'Guided walkthrough of the vibe workflow'],
      ['team', 'Manage the team roster in .vibe/team.yml'],
    ],
  },
  {
    title: 'Tickets',
    commands: [
      ['new', 'Create a new ticket'],
      ['list', 'List tickets, filterable by status'],
      ['status', 'Show or change a ticket status'],
      ['refine', 'Flesh out a ticket with more detail'],
      ['ready', 'Mark a ticket ready to be picked up'],
      ['close', 'Close a ticket as done'],
      ['lint', 'Validate ticket files and frontmatter'],
    ],
  },
  {
    title: 'Workflow',
    commands: [
      ['start', 'Start a ticket and create its branch'],
      ['plan', 'Turn a plan into tickets'],
      ['review', 'Review the diff for a ticket'],
      ['pr', 'Open a pull request for the current ticket'],
      ['swarm', 'Work multiple ready tickets in parallel'],
      ['stats', 'Show ticket and throughput stats'],
    ],
  },
  {
    title: 'Integrations',
    commands: [
      ['link', 'Link vibekit into an AI coding agent'],
      ['unlink', 'Remove a previously linked agent'],
      ['skills', 'Install and manage vibekit skills'],
      ['docs', 'Open the vibekit documentation'],
    ],
  },
];

const AVAILABLE_COMMANDS = COMMAND_GROUPS.flatMap(
  (group) => group.commands.map(([name]) => name)
);

/**
 * Display available commands to the user
 */
function showAvailableCommands() {
  console.log(`Available commands: ${AVAILABLE_COMMANDS.join(', ')}`);
}

/**
 * Read the CLI version from package.json
 * @returns {string} The current version, or 'unknown' if it can't be read
 */
function getVersion() {
  try {
    const pkgPath = path.join(__dirname, 'package.json');
    return JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Print grouped usage with a one-line description per command
 */
function showHelp() {
  const width = Math.max(
    ...AVAILABLE_COMMANDS.map((name) => name.length)
  );

  console.log('🎆 VibeKit - Developer-focused ticket management\n');
  console.log('Usage: vibe <command> [options]\n');

  for (const group of COMMAND_GROUPS) {
    console.log(`${group.title}:`);
    for (const [name, description] of group.commands) {
      console.log(`  ${name.padEnd(width)}  ${description}`);
    }
    console.log('');
  }

  console.log('Options:');
  console.log(`  ${'-h, --help'.padEnd(width + 2)}  Show this help`);
  console.log(`  ${'-v, --version'.padEnd(width + 2)}  Show the installed version`);
}

/**
 * Execute a VibeKit command
 * @param {string} command - The command to execute
 * @param {Array} args - Arguments to pass to the command
 */
async function executeCommand(command, args) {
  const commandPath = path.join(__dirname, 'src', 'commands', command, 'index.js');
  
  try {
    // Dynamic import for ESM
    const commandModule = await import(commandPath);
    const commandFunction = commandModule.default;
    
    if (typeof commandFunction === 'function') {
      await commandFunction(args);
    } else {
      console.error(`❌ Command '${command}' is not executable.`);
      process.exit(1);
    }
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      showAvailableCommands();
      console.error(`❌ Command '${command}' not found.`);
    } else {
      console.error(`❌ Error executing command '${command}': ${err.message}`);
      
      // Only show stack trace in debug mode or development
      if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
        console.error(err.stack);
      }
    }
    process.exit(1);
  }
}

/**
 * Main application entry point
 */
async function main() {
  // Parse command line arguments
  const [command, ...commandArgs] = process.argv.slice(2);
  
  try {
    // Version and help are handled here so they never reach the command loader
    if (['-v', '--version', 'version'].includes(command)) {
      console.log(getVersion());
      process.exit(0);
    }

    if (!command || ['-h', '--help', 'help'].includes(command)) {
      showHelp();
      process.exit(0);
    }
    
    // Execute the requested command
    await executeCommand(command, commandArgs);
    
  } catch (err) {
    console.error(`❌ Unexpected error: ${err.message}`);
    
    // Only show stack trace in debug mode or development
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.error(err.stack);
    }
    
    process.exit(1);
  }
}

// Run the application
main().catch((error) => {
  console.error(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});