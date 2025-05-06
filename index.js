#!/usr/bin/env node

console.log("VibeKit CLI running! 🚀");

// very basic command handling
const args = process.argv.slice(2);

if (args[0] === 'init') {
  console.log('📝 Running vibe init...');
  // TODO: Create .vibe/ folder here
} else {
  console.log('Available commands: init');
}