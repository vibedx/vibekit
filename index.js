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

/**
 * Read the CLI version from package.json
 * @returns {string} The version string, or 'unknown' if it can't be read
 */
function getVersion() {
  try {
    const pkgPath = path.join(__dirname, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Display the help text with available commands
 */
function showHelp() {
  console.log('🎆 VibeKit - Developer-focused ticket management\n');
  showAvailableCommands();
  console.log('\nUse "vibe <command>" to get started!');
  console.log('Run "vibe --version" to see the installed version.');
}

// Available commands in VibeKit
const AVAILABLE_COMMANDS = [
  'init', 'new', 'close', 'list', 'get-started',
  'start', 'link', 'unlink', 'refine', 'lint', 'review', 'team', 'skills',
  'status', 'stats', 'plan', 'pr', 'swarm', 'docs', 'ready'
];

/**
 * Display available commands to the user
 */
function showAvailableCommands() {
  console.log(`Available commands: ${AVAILABLE_COMMANDS.join(', ')}`);
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
export async function main() {
  // Parse command line arguments
  const [command, ...commandArgs] = process.argv.slice(2);
  
  try {
    // Show help if no command provided or help flag passed
    if (!command || command === '--help' || command === '-h') {
      showHelp();
      process.exit(0);
      return;
    }

    // Print version when requested
    if (command === '--version' || command === '-v') {
      console.log(getVersion());
      process.exit(0);
      return;
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

// Run the application (skip auto-run under test so it can be imported safely)
if (process.env.NODE_ENV !== 'test') {
  main().catch((error) => {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  });
}