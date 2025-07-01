import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { 
  createTempDir, 
  cleanupTempDir, 
  mockConsole, 
  mockProcessCwd, 
  mockProcessExit,
  createMockVibeProject
} from '../../utils/test-helpers.js';
import startCommand from './index.js';

describe('start command', () => {
  let tempDir;
  let consoleMock;
  let restoreCwd;
  let exitMock;

  beforeEach(() => {
    tempDir = createTempDir('start-test');
    consoleMock = mockConsole();
    restoreCwd = mockProcessCwd(tempDir);
    exitMock = mockProcessExit();
  });

  afterEach(() => {
    consoleMock.restore();
    restoreCwd();
    exitMock.restore();
    cleanupTempDir(tempDir);
  });

  describe('basic validation', () => {
    it('should validate that start command exists and is callable', () => {
      expect(typeof startCommand).toBe('function');
    });

    it('should accept arguments parameter', () => {
      expect(startCommand.length).toBe(1); // Takes one parameter (args array)
    });

    it('should show error when no ticket ID provided', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act
      expect(() => startCommand([])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.error).toContain('❌ Please provide a ticket ID (e.g., vibe start TKT-006)');
    });

    it('should show error for invalid ticket ID format', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act
      expect(() => startCommand(['invalid-format'])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.error).toContain('❌ Invalid ticket ID format. Expected TKT-XXX or just the number.');
    });
  });

  describe('ticket validation', () => {
    it('should show error when ticket does not exist', () => {
      // Arrange
      createMockVibeProject(tempDir); // No tickets

      // Act
      expect(() => startCommand(['TKT-001'])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.error).toContain('❌ Ticket TKT-001 not found.');
    });
  });

  // Note: Full git integration testing would require:
  // - Proper git repository setup
  // - Mocking all git utility functions
  // - Testing branch creation and checkout
  // - Testing ticket status updates
  // This is better handled in integration tests with proper git mocking
});