/**
 * Terminal color constants
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  red: '\x1b[31m'
};

// Terminal control sequences
const CURSOR_UP = '\x1b[1A';
const CLEAR_LINE = '\x1b[2K';
const SHOW_CURSOR = '\x1b[?25h';
const HIDE_CURSOR = '\x1b[?25l';

/**
 * Arrow key navigation selector with improved error handling and cleanup
 * @param {string} message - The selection prompt message
 * @param {Array} choices - Array of choice objects with name and value properties
 * @param {string|null} defaultValue - Default selected value
 * @returns {Promise<string>} Selected choice value
 * @throws {Error} If setup fails or user cancels
 */
export async function arrowSelect(message, choices, defaultValue = null) {
  // Validate inputs
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('Choices must be a non-empty array');
  }
  
  return new Promise((resolve, reject) => {
    let selectedIndex = 0;
    let isFirstRender = true;
    let isActive = true;
    
    // Find default selection index
    if (defaultValue) {
      const defaultIndex = choices.findIndex(choice => choice.value === defaultValue);
      if (defaultIndex >= 0) {
        selectedIndex = defaultIndex;
      }
    }
    
    const stdin = process.stdin;
    const stdout = process.stdout;
    const menuHeight = choices.length + 4;
    
    // Store original terminal state
    const originalRawMode = stdin.isRaw;
    const originalFlowing = stdin.readableFlowing !== null;
    
    /**
     * Render the selection menu
     */
    function render() {
      if (!isActive) return;
      
      try {
        // Clear previous render (except first time)
        if (!isFirstRender) {
          for (let i = 0; i < menuHeight; i++) {
            stdout.write(CURSOR_UP + CLEAR_LINE);
          }
        }
        isFirstRender = false;
        
        // Hide cursor during rendering
        stdout.write(HIDE_CURSOR);
        
        // Render prompt message
        stdout.write(`${colors.bright}${message}${colors.reset}\n\n`);
        
        // Render choices
        choices.forEach((choice, index) => {
          const isSelected = index === selectedIndex;
          const marker = isSelected ? `${colors.green}▶${colors.reset}` : ' ';
          const color = isSelected ? colors.cyan : colors.gray;
          const name = choice.name || choice.value || 'Unknown';
          stdout.write(`${marker} ${color}${name}${colors.reset}\n`);
        });
        
        // Show instructions
        stdout.write(`\n${colors.gray}↑↓ Navigate • Enter Select • 1-${choices.length} Quick select • Ctrl+C Cancel${colors.reset}\n`);
        
        // Show cursor
        stdout.write(SHOW_CURSOR);
      } catch (error) {
        cleanup();
        reject(new Error(`Render failed: ${error.message}`));
      }
    }
    
    /**
     * Clean up terminal state and event listeners
     */
    function cleanup() {
      if (!isActive) return;
      isActive = false;
      
      try {
        // Show cursor
        stdout.write(SHOW_CURSOR);
        
        // Restore terminal state
        if (stdin.isTTY) {
          stdin.setRawMode(originalRawMode);
        }
        
        if (!originalFlowing) {
          stdin.pause();
        }
        
        // Remove event listeners
        stdin.removeAllListeners('data');
        stdin.removeAllListeners('error');
        
      } catch (cleanupError) {
        // Ignore cleanup errors to prevent double-throw
      }
    }
    
    /**
     * Handle user selection and resolve promise
     */
    function handleSelection() {
      if (!isActive) return;
      
      const selectedChoice = choices[selectedIndex];
      cleanup();
      
      try {
        // Clear menu
        for (let i = 0; i < menuHeight; i++) {
          stdout.write(CURSOR_UP + CLEAR_LINE);
        }
        
        // Show selection confirmation
        const choiceName = selectedChoice.name || selectedChoice.value;
        stdout.write(`${colors.green}✓${colors.reset} Selected: ${colors.cyan}${choiceName}${colors.reset}\n\n`);
        
        resolve(selectedChoice.value);
      } catch (error) {
        reject(new Error(`Selection failed: ${error.message}`));
      }
    }
    
    /**
     * Process different key inputs and update selection
     * @param {string} key - The key that was pressed
     */
    function processKeyInput(key) {
      switch (key) {
        case '\u001b[A': // Up arrow
          selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : choices.length - 1;
          render();
          break;
          
        case '\u001b[B': // Down arrow
          selectedIndex = selectedIndex < choices.length - 1 ? selectedIndex + 1 : 0;
          render();
          break;
          
        case '\r':
        case '\n': // Enter
          handleSelection();
          break;
          
        case '\u0003': // Ctrl+C
          cleanup();
          stdout.write(`\n${colors.red}✗${colors.reset} Cancelled\n`);
          reject(new Error('User cancelled selection'));
          break;
          
        default:
          // Handle numeric selection (1-9)
          const num = parseInt(key, 10);
          if (num >= 1 && num <= choices.length) {
            selectedIndex = num - 1;
            handleSelection();
          }
          // Ignore other keys
          break;
      }
    }
    
    /**
     * Handle user input
     */
    function handleInput(chunk) {
      if (!isActive) return;
      
      const key = chunk.toString();
      
      try {
        processKeyInput(key);
      } catch (error) {
        cleanup();
        reject(new Error(`Input handling failed: ${error.message}`));
      }
    }
    
    // Set up terminal and start interaction
    try {
      // Ensure clean state
      stdin.removeAllListeners('data');
      stdin.removeAllListeners('error');
      
      // Configure terminal
      if (stdin.isTTY) {
        stdin.setRawMode(true);
      }
      
      stdin.resume();
      stdin.setEncoding('utf8');
      
      // Set up event handlers
      stdin.on('data', handleInput);
      stdin.on('error', (error) => {
        cleanup();
        reject(new Error(`Terminal input error: ${error.message}`));
      });
      
      // Initial render
      render();
      
    } catch (error) {
      cleanup();
      reject(new Error(`Setup failed: ${error.message}`));
    }
  });
}