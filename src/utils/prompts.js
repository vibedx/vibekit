import { input, select, confirm, spinner } from './cli.js';

/**
 * Enhanced prompt with emoji and consistent formatting
 * @param {string} emoji - Emoji to display with the prompt
 * @param {string} message - The prompt message
 * @param {Object} options - Configuration options
 * @param {string|null} options.defaultValue - Default value if user provides no input
 * @param {boolean} options.required - Whether input is required
 * @param {string} options.type - Type of prompt ('input' or 'confirm')
 * @returns {Promise<string|boolean>} User's response
 */
export async function emojiPrompt(emoji, message, options = {}) {
  const { defaultValue = null, required = false, type = 'input' } = options;
  const enhancedMessage = `${emoji} ${message}`;
  
  if (type === 'confirm') {
    return confirm(enhancedMessage, defaultValue);
  }
  
  return input(enhancedMessage, { defaultValue, required });
}

/**
 * Confirmation prompt with emoji
 * @param {string} emoji - Emoji to display
 * @param {string} message - Confirmation message
 * @param {boolean} defaultValue - Default confirmation value
 * @returns {Promise<boolean>} User's confirmation
 */
export async function confirmPrompt(emoji, message, defaultValue = true) {
  return emojiPrompt(emoji, message, { type: 'confirm', defaultValue });
}

/**
 * Input prompt with emoji
 * @param {string} emoji - Emoji to display
 * @param {string} message - Input message
 * @param {Object} options - Input options
 * @returns {Promise<string>} User's input
 */
export async function inputPrompt(emoji, message, options = {}) {
  return emojiPrompt(emoji, message, options);
}

// Re-export core CLI functions for convenience
export { input, select, confirm, spinner };