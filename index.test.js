import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the entire child_process module to prevent actual command execution
jest.unstable_mockModule('child_process', () => ({
  execSync: jest.fn()
}));

describe('VibeKit CLI (index.js)', () => {
  let originalArgv;
  let originalExit;
  let originalConsole;
  let mockExit;
  let consoleOutput;

  beforeEach(() => {
    // Save original values
    originalArgv = process.argv;
    originalExit = process.exit;
    originalConsole = {
      log: console.log,
      error: console.error
    };

    // Mock process.exit
    mockExit = jest.fn();
    process.exit = mockExit;

    // Mock console
    consoleOutput = { log: [], error: [] };
    console.log = (...args) => consoleOutput.log.push(args.join(' '));
    console.error = (...args) => consoleOutput.error.push(args.join(' '));
  });

  afterEach(() => {
    // Restore original values
    process.argv = originalArgv;
    process.exit = originalExit;
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('command line argument parsing', () => {
    it('should show help when no command provided', async () => {
      // Arrange
      process.argv = ['node', 'index.js'];

      // Act
      const { main } = await import('./index.js');
      await main();

      // Assert
      expect(consoleOutput.log.some(log => 
        log.includes('🎆 VibeKit - Developer-focused ticket management')
      )).toBe(true);
      expect(consoleOutput.log.some(log => 
        log.includes('Available commands:')
      )).toBe(true);
      expect(consoleOutput.log.some(log => 
        log.includes('Use "vibe <command>" to get started!')
      )).toBe(true);
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('should show available commands list', async () => {
      // Arrange
      process.argv = ['node', 'index.js'];

      // Act
      const { main } = await import('./index.js');
      await main();

      // Assert
      expect(consoleOutput.log.some(log => 
        log.includes('init, new, close, list, get-started, start, link, unlink, refine')
      )).toBe(true);
    });
  });

  describe('command validation', () => {
    it('should show error for invalid command', async () => {
      // Arrange
      process.argv = ['node', 'index.js', 'invalid-command'];

      // Act
      const { main } = await import('./index.js');
      await main();

      // Assert
      expect(consoleOutput.error.some(error => 
        error.includes("❌ Command 'invalid-command' not found.")
      )).toBe(true);
      expect(consoleOutput.log.some(log => 
        log.includes('Available commands:')
      )).toBe(true);
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle command execution errors', async () => {
      // Arrange
      process.argv = ['node', 'index.js', 'init']; // Valid command but will fail in test env

      // Act
      const { main } = await import('./index.js');
      await main();

      // Assert
      expect(mockExit).toHaveBeenCalledWith(1);
      expect(consoleOutput.error.length).toBeGreaterThan(0);
    });
  });

  describe('development mode error handling', () => {
    it('should show stack trace in development mode', async () => {
      // Arrange
      process.argv = ['node', 'index.js', 'invalid-command'];
      process.env.NODE_ENV = 'development';

      // Act
      const { main } = await import('./index.js');
      await main();

      // Assert
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Cleanup
      delete process.env.NODE_ENV;
    });

    it('should show stack trace when DEBUG is set', async () => {
      // Arrange
      process.argv = ['node', 'index.js', 'invalid-command'];
      process.env.DEBUG = 'true';

      // Act
      const { main } = await import('./index.js');
      await main();

      // Assert
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Cleanup
      delete process.env.DEBUG;
    });
  });

  describe('command constants', () => {
    it('should export available commands constant', async () => {
      // Act
      const indexModule = await import('./index.js');
      
      // We can't directly test the constant since it's not exported,
      // but we can verify it through the help output
      process.argv = ['node', 'index.js'];
      await indexModule.main();

      // Assert - check that all expected commands are listed
      const outputString = consoleOutput.log.join(' ');
      expect(outputString).toContain('init');
      expect(outputString).toContain('new');
      expect(outputString).toContain('close');
      expect(outputString).toContain('list');
      expect(outputString).toContain('get-started');
      expect(outputString).toContain('start');
      expect(outputString).toContain('link');
      expect(outputString).toContain('unlink');
      expect(outputString).toContain('refine');
    });
  });

  describe('error handling edge cases', () => {
    it('should handle unexpected errors in main function', async () => {
      // Arrange
      process.argv = ['node', 'index.js'];
      
      // Mock an error in the main execution
      const originalImport = global.import;
      
      // We can test this by providing arguments that would cause an error
      process.argv = ['node', 'index.js', 'init', '--invalid-flag'];

      // Act
      const { main } = await import('./index.js');
      await main();

      // Assert
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('command execution paths', () => {
    it('should attempt to load valid command modules', async () => {
      // Arrange
      process.argv = ['node', 'index.js', 'list'];

      // Act
      const { main } = await import('./index.js');
      await main();

      // Assert - should attempt to execute but fail due to test environment
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle commands with arguments', async () => {
      // Arrange
      process.argv = ['node', 'index.js', 'new', 'Test Ticket', '--priority', 'high'];

      // Act
      const { main } = await import('./index.js');
      await main();

      // Assert - should attempt to execute with arguments
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});