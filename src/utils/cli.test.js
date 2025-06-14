#!/usr/bin/env node

import { select, input, confirm, logger } from './cli.js';

async function testCLI() {
  logger.info('Testing new CLI components...');
  
  try {
    // Test input
    const name = await input('What is your name', { defaultValue: 'User' });
    logger.success(`Hello, ${name}!`);
    
    // Test selection with arrow keys
    const choice = await select('Choose your favorite', [
      { name: 'Coffee ☕', value: 'coffee' },
      { name: 'Tea 🍵', value: 'tea' },
      { name: 'Water 💧', value: 'water' }
    ]);
    logger.success(`You chose: ${choice}`);
    
    // Test confirmation
    const confirmed = await confirm('Are you sure?', true);
    logger.info(`Confirmed: ${confirmed}`);
    
    logger.success('All tests completed!');
    
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
  }
}

testCLI();