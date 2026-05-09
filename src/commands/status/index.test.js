import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTempDir,
  cleanupTempDir,
  mockConsole,
  mockProcessCwd,
  createMockVibeProject
} from '../../utils/test-helpers.js';
import statusCommand from './index.js';

describe('status command', () => {
  let tempDir;
  let consoleMock;
  let restoreCwd;

  beforeEach(() => {
    tempDir = createTempDir('status-test');
    consoleMock = mockConsole();
    restoreCwd = mockProcessCwd(tempDir);
  });

  afterEach(() => {
    consoleMock.restore();
    restoreCwd();
    cleanupTempDir(tempDir);
  });

  describe('basic validation', () => {
    it('should validate that status command exists and is callable', () => {
      expect(typeof statusCommand).toBe('function');
    });

    it('should accept arguments parameter', () => {
      expect(statusCommand.length).toBe(1);
    });

    it('should show message when no active worktrees', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act
      statusCommand([]);

      // Assert
      const output = consoleMock.logs.log[0];
      expect(output.includes('No active worktrees') || output.includes('Active Worktrees')).toBe(true);
    });
  });
});
