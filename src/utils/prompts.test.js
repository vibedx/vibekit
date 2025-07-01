import { describe, it, expect, jest } from '@jest/globals';

// Mock the CLI module
jest.unstable_mockModule('./cli.js', () => ({
  input: jest.fn(),
  select: jest.fn(),
  confirm: jest.fn(),
  spinner: jest.fn()
}));

describe('prompts utilities', () => {
  let mockCli;

  beforeEach(async () => {
    // Import the mocked CLI module
    mockCli = await import('./cli.js');
    
    // Reset all mocks
    Object.values(mockCli).forEach(mock => mock.mockClear());
  });

  describe('emojiPrompt', () => {
    it('should call input with emoji-enhanced message', async () => {
      // Arrange
      mockCli.input.mockResolvedValue('test response');
      const { emojiPrompt } = await import('./prompts.js');

      // Act
      const result = await emojiPrompt('🎯', 'What is your goal?', { defaultValue: 'none' });

      // Assert
      expect(mockCli.input).toHaveBeenCalledWith('🎯 What is your goal?', { defaultValue: 'none', required: false });
      expect(result).toBe('test response');
    });

    it('should call confirm when type is confirm', async () => {
      // Arrange
      mockCli.confirm.mockResolvedValue(true);
      const { emojiPrompt } = await import('./prompts.js');

      // Act
      const result = await emojiPrompt('❓', 'Are you sure?', { type: 'confirm', defaultValue: false });

      // Assert
      expect(mockCli.confirm).toHaveBeenCalledWith('❓ Are you sure?', false);
      expect(result).toBe(true);
    });

    it('should handle required input option', async () => {
      // Arrange
      mockCli.input.mockResolvedValue('required response');
      const { emojiPrompt } = await import('./prompts.js');

      // Act
      const result = await emojiPrompt('⚠️', 'Required field:', { required: true });

      // Assert
      expect(mockCli.input).toHaveBeenCalledWith('⚠️ Required field:', { defaultValue: null, required: true });
      expect(result).toBe('required response');
    });

    it('should use default options when none provided', async () => {
      // Arrange
      mockCli.input.mockResolvedValue('default response');
      const { emojiPrompt } = await import('./prompts.js');

      // Act
      const result = await emojiPrompt('📝', 'Enter text:');

      // Assert
      expect(mockCli.input).toHaveBeenCalledWith('📝 Enter text:', { defaultValue: null, required: false });
      expect(result).toBe('default response');
    });
  });

  describe('confirmPrompt', () => {
    it('should call emojiPrompt with confirm type', async () => {
      // Arrange
      mockCli.confirm.mockResolvedValue(true);
      const { confirmPrompt } = await import('./prompts.js');

      // Act
      const result = await confirmPrompt('🤔', 'Do you want to continue?');

      // Assert
      expect(mockCli.confirm).toHaveBeenCalledWith('🤔 Do you want to continue?', true);
      expect(result).toBe(true);
    });

    it('should use custom default value', async () => {
      // Arrange
      mockCli.confirm.mockResolvedValue(false);
      const { confirmPrompt } = await import('./prompts.js');

      // Act
      const result = await confirmPrompt('🛑', 'Cancel operation?', false);

      // Assert
      expect(mockCli.confirm).toHaveBeenCalledWith('🛑 Cancel operation?', false);
      expect(result).toBe(false);
    });
  });

  describe('inputPrompt', () => {
    it('should call emojiPrompt with input type', async () => {
      // Arrange
      mockCli.input.mockResolvedValue('user input');
      const { inputPrompt } = await import('./prompts.js');

      // Act
      const result = await inputPrompt('💬', 'Enter your message:', { defaultValue: 'hello' });

      // Assert
      expect(mockCli.input).toHaveBeenCalledWith('💬 Enter your message:', { defaultValue: 'hello', required: false });
      expect(result).toBe('user input');
    });

    it('should handle empty options', async () => {
      // Arrange
      mockCli.input.mockResolvedValue('empty options response');
      const { inputPrompt } = await import('./prompts.js');

      // Act
      const result = await inputPrompt('📋', 'Enter data:');

      // Assert
      expect(mockCli.input).toHaveBeenCalledWith('📋 Enter data:', { defaultValue: null, required: false });
      expect(result).toBe('empty options response');
    });
  });

  describe('re-exported functions', () => {
    it('should re-export input function', async () => {
      // Act
      const { input } = await import('./prompts.js');

      // Assert
      expect(input).toBe(mockCli.input);
    });

    it('should re-export select function', async () => {
      // Act
      const { select } = await import('./prompts.js');

      // Assert
      expect(select).toBe(mockCli.select);
    });

    it('should re-export confirm function', async () => {
      // Act
      const { confirm } = await import('./prompts.js');

      // Assert
      expect(confirm).toBe(mockCli.confirm);
    });

    it('should re-export spinner function', async () => {
      // Act
      const { spinner } = await import('./prompts.js');

      // Assert
      expect(spinner).toBe(mockCli.spinner);
    });
  });
});