import { createInterface } from 'readline';

/**
 * CLI Colors and Styling Constants
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

/**
 * Create a clean readline interface
 */
function createCleanInterface() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  // Ensure clean state
  process.stdout.write('\x1b[?25h'); // Show cursor
  
  return rl;
}

/**
 * Logger utilities
 */
export const logger = {
  info: (message) => {
    console.log(`${colors.cyan}ℹ${colors.reset} ${message}`);
  },
  
  success: (message) => {
    console.log(`${colors.green}✓${colors.reset} ${message}`);
  },
  
  error: (message) => {
    console.log(`${colors.red}✗${colors.reset} ${message}`);
  },
  
  warning: (message) => {
    console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
  },
  
  debug: (message) => {
    console.log(`${colors.gray}[DEBUG]${colors.reset} ${message}`);
  },
  
  ai: (message) => {
    console.log(`${colors.magenta}🤖${colors.reset} ${message}`);
  },
  
  step: (message) => {
    console.log(`${colors.blue}▶${colors.reset} ${message}`);
  },
  
  tip: (message) => {
    console.log(`${colors.yellow}💡${colors.reset} ${message}`);
  }
};

/**
 * Simple input prompt with validation and error handling
 * @param {string} message - The prompt message
 * @param {Object} options - Configuration options
 * @param {string|null} options.defaultValue - Default value if no input provided
 * @param {boolean} options.required - Whether input is required
 * @param {Function} options.validate - Optional validation function
 * @returns {Promise<string>} User's input
 * @throws {Error} If input operation fails
 */
export async function input(message, options = {}) {
  const { defaultValue = null, required = false, validate = null } = options;
  
  if (typeof message !== 'string') {
    throw new Error('Message must be a string');
  }
  
  while (true) {
    let rl;
    
    try {
      // Ensure clean terminal state
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      
      rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
        historySize: 0
      });
      
      // Build prompt text
      let promptText = `${colors.green}➤${colors.reset} ${colors.bright}${message}${colors.reset}`;
      
      if (defaultValue) {
        promptText += ` ${colors.gray}(${defaultValue})${colors.reset}`;
      }
      
      promptText += ': ';
      process.stdout.write(promptText);
      
      // Get user input
      const answer = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Input timeout after 5 minutes'));
        }, 300000); // 5 minute timeout
        
        const handleLine = (line) => {
          clearTimeout(timeout);
          rl.removeListener('line', handleLine);
          rl.removeListener('error', handleError);
          resolve(line.trim());
        };
        
        const handleError = (error) => {
          clearTimeout(timeout);
          rl.removeListener('line', handleLine);
          rl.removeListener('error', handleError);
          reject(error);
        };
        
        rl.on('line', handleLine);
        rl.on('error', handleError);
      });
      
      rl.close();
      
      const finalAnswer = answer || defaultValue;
      
      // Validate required field
      if (required && !finalAnswer) {
        console.log(`${colors.red}✗${colors.reset} This field is required`);
        continue;
      }
      
      // Run custom validation if provided
      if (finalAnswer && validate) {
        try {
          const validationResult = await validate(finalAnswer);
          if (validationResult !== true) {
            console.log(`${colors.red}✗${colors.reset} ${validationResult || 'Invalid input'}`);
            continue;
          }
        } catch (validationError) {
          console.log(`${colors.red}✗${colors.reset} Validation error: ${validationError.message}`);
          continue;
        }
      }
      
      return finalAnswer;
      
    } catch (error) {
      if (rl) {
        try {
          rl.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }
      
      if (error.message.includes('timeout')) {
        throw new Error('Input operation timed out');
      }
      
      throw new Error(`Input operation failed: ${error.message}`);
    }
  }
}

/**
 * Confirmation prompt with validation
 * @param {string} message - The confirmation message
 * @param {boolean} defaultValue - Default confirmation value
 * @returns {Promise<boolean>} User's confirmation
 * @throws {Error} If confirmation operation fails
 */
export async function confirm(message, defaultValue = false) {
  if (typeof message !== 'string') {
    throw new Error('Message must be a string');
  }
  
  try {
    const defaultText = defaultValue ? 'Y/n' : 'y/N';
    const grayDefault = defaultValue ? 
      `${colors.gray}default: yes${colors.reset}` : 
      `${colors.gray}default: no${colors.reset}`;
    const promptText = `${message} (${defaultText}, ${grayDefault})`;
    const answer = await input(promptText);
    
    if (!answer) {
      return defaultValue;
    }
    
    const normalized = answer.toLowerCase().trim();
    
    // Accept various positive responses
    if (['y', 'yes', 'true', '1'].includes(normalized)) {
      return true;
    }
    
    // Accept various negative responses
    if (['n', 'no', 'false', '0'].includes(normalized)) {
      return false;
    }
    
    // Invalid response, return default
    console.log(`${colors.yellow}⚠${colors.reset} Invalid response, using default (${defaultValue ? 'yes' : 'no'})`);
    return defaultValue;
    
  } catch (error) {
    throw new Error(`Confirmation operation failed: ${error.message}`);
  }
}

/**
 * Selection prompt with validation and error handling
 * @param {string} message - The selection prompt message
 * @param {Array} choices - Array of choice objects with name and value properties
 * @param {string|null} defaultValue - Default selected value
 * @returns {Promise<string>} Selected choice value
 * @throws {Error} If selection operation fails or choices are invalid
 */
export async function select(message, choices, defaultValue = null) {
  // Validate inputs
  if (typeof message !== 'string') {
    throw new Error('Message must be a string');
  }
  
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('Choices must be a non-empty array');
  }
  
  // Validate choice objects
  const validChoices = choices.every(choice => 
    choice && (choice.name || choice.value)
  );
  
  if (!validChoices) {
    throw new Error('All choices must have a name or value property');
  }
  
  // Display choices
  console.log(`${colors.green}➤${colors.reset} ${colors.bright}${message}${colors.reset}\n`);
  
  choices.forEach((choice, index) => {
    const number = index + 1;
    const isDefault = choice.value === defaultValue;
    const marker = isDefault ? `${colors.green}❯${colors.reset}` : ' ';
    const name = choice.name || choice.value || 'Unknown';
    console.log(`${marker} ${colors.gray}${number}.${colors.reset} ${name}`);
  });
  
  console.log();
  
  while (true) {
    let rl;
    
    try {
      // Ensure clean terminal state
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      
      rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
        historySize: 0
      });
      
      process.stdout.write(`${colors.gray}Enter choice (1-${choices.length}):${colors.reset} `);
      
      const answer = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Selection timeout after 5 minutes'));
        }, 300000);
        
        const handleLine = (line) => {
          clearTimeout(timeout);
          rl.removeListener('line', handleLine);
          rl.removeListener('error', handleError);
          resolve(line.trim());
        };
        
        const handleError = (error) => {
          clearTimeout(timeout);
          rl.removeListener('line', handleLine);
          rl.removeListener('error', handleError);
          reject(error);
        };
        
        rl.on('line', handleLine);
        rl.on('error', handleError);
      });
      
      rl.close();
      
      // Handle empty input with default
      if (answer === '' && defaultValue) {
        const defaultChoice = choices.find(c => c.value === defaultValue);
        if (defaultChoice) {
          const choiceName = defaultChoice.name || defaultChoice.value;
          console.log(`${colors.green}✓${colors.reset} Selected: ${choiceName}\n`);
          return defaultChoice.value;
        }
      }
      
      // Parse and validate numeric input
      const choiceIndex = parseInt(answer, 10) - 1;
      if (Number.isInteger(choiceIndex) && choiceIndex >= 0 && choiceIndex < choices.length) {
        const selectedChoice = choices[choiceIndex];
        const choiceName = selectedChoice.name || selectedChoice.value;
        console.log(`${colors.green}✓${colors.reset} Selected: ${choiceName}\n`);
        return selectedChoice.value;
      }
      
      console.log(`${colors.red}✗${colors.reset} Invalid choice. Please enter a number between 1 and ${choices.length}`);
      
    } catch (error) {
      if (rl) {
        try {
          rl.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }
      
      if (error.message.includes('timeout')) {
        throw new Error('Selection operation timed out');
      }
      
      throw new Error(`Selection operation failed: ${error.message}`);
    }
  }
}

/**
 * Progress spinner with improved error handling and lifecycle management
 * @param {string} message - Initial spinner message
 * @returns {Object} Spinner control object
 */
export function spinner(message = 'Loading...') {
  if (typeof message !== 'string') {
    throw new Error('Spinner message must be a string');
  }
  
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIndex = 0;
  let currentMessage = message;
  let isActive = true;
  let interval = null;
  
  // Start the spinner
  const startSpinner = () => {
    if (interval) return; // Already running
    
    interval = setInterval(() => {
      if (isActive && process.stdout.isTTY) {
        try {
          process.stdout.write(`\r${colors.cyan}${frames[frameIndex]}${colors.reset} ${currentMessage}`);
          frameIndex = (frameIndex + 1) % frames.length;
        } catch (error) {
          // Ignore write errors to prevent spinner crashes
        }
      }
    }, 100);
  };
  
  // Clear the spinner safely
  const clearSpinner = () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    
    if (process.stdout.isTTY) {
      try {
        process.stdout.write('\r\x1b[2K'); // Clear line
      } catch (error) {
        // Ignore clear errors
      }
    }
  };
  
  // Start immediately
  startSpinner();
  
  return {
    /**
     * Update spinner message
     * @param {string} newMessage - New message to display
     */
    update: (newMessage) => {
      if (typeof newMessage === 'string') {
        currentMessage = newMessage;
      }
    },
    
    /**
     * Stop spinner without message
     */
    stop: () => {
      isActive = false;
      clearSpinner();
    },
    
    /**
     * Stop spinner with success message
     * @param {string} successMessage - Success message to display
     */
    succeed: (successMessage) => {
      isActive = false;
      clearSpinner();
      if (typeof successMessage === 'string') {
        console.log(`${colors.green}✓${colors.reset} ${successMessage}`);
      }
    },
    
    /**
     * Stop spinner with failure message
     * @param {string} failMessage - Failure message to display
     */
    fail: (failMessage) => {
      isActive = false;
      clearSpinner();
      if (typeof failMessage === 'string') {
        console.log(`${colors.red}✗${colors.reset} ${failMessage}`);
      }
    }
  };
}

/**
 * Display a table
 */
export function table(headers, rows) {
  const columnWidths = headers.map((header, index) => {
    const maxRowWidth = Math.max(...rows.map(row => String(row[index] || '').length));
    return Math.max(header.length, maxRowWidth);
  });
  
  // Header
  const headerRow = headers.map((header, index) => 
    header.padEnd(columnWidths[index])
  ).join(' │ ');
  
  console.log(`${colors.bright}${headerRow}${colors.reset}`);
  console.log('─'.repeat(headerRow.length));
  
  // Rows
  rows.forEach(row => {
    const rowStr = row.map((cell, index) => 
      String(cell || '').padEnd(columnWidths[index])
    ).join(' │ ');
    console.log(rowStr);
  });
}

/**
 * Display a progress bar
 */
export function progressBar(current, total, message = '') {
  const width = 40;
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const progressText = `${colors.cyan}${bar}${colors.reset} ${percentage}% ${message}`;
  
  process.stdout.write(`\r${progressText}`);
  
  if (current >= total) {
    process.stdout.write('\n');
  }
}