#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const [command, ...commandArgs] = process.argv.slice(2);

try {
  if (!command) {
    console.log("Available commands: init, new, close, list, get-started, start");
    process.exit(0);
  }
  
  const commandPath = path.join(__dirname, "src", "commands", command, "index.js");
  
  try {
    // Dynamic import for ESM
    const commandModule = await import(commandPath);
    const commandFunction = commandModule.default;
    
    if (typeof commandFunction === "function") {
      commandFunction(commandArgs);
    } else {
      console.error(`❌ Command '${command}' is not executable.`);
    }
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.log("Available commands: init, new, close, list, get-started, start");
      console.error(`❌ Command '${command}' not found.`);
    } else {
      console.error(`❌ Error executing command '${command}': ${err.message}`);
      console.error(err.stack);
    }
  }
} catch (err) {
  console.error(`❌ Unexpected error: ${err.message}`);
  console.error(err.stack);
}