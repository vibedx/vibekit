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
      expect(consoleMock.logs.error[0]).toContain('Usage: vibe start');
    });

    it('should show error for invalid ticket ID format', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act
      expect(() => startCommand(['invalid-format'])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.error).toContain('❌ Invalid ticket ID: invalid-format');
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

  describe('--agent flag validation', () => {
    it('should error when --agent used without -w for multiple tickets', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-001', title: 'First', status: 'open' },
          { id: 'TKT-002', title: 'Second', status: 'open' }
        ]
      });

      // Act
      expect(() => startCommand(['TKT-001', 'TKT-002', '--agent'])).toThrow('process.exit(1)');

      // Assert
      expect(consoleMock.logs.error[0]).toContain('--agent without -w only supports a single ticket');
    });
  });
});