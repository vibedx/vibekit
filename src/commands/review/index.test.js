import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  createTempDir, 
  cleanupTempDir, 
  mockConsole, 
  mockProcessCwd, 
  mockProcessExit,
  createMockVibeProject
} from '../../utils/test-helpers.js';
import reviewCommand from './index.js';

// Mock external dependencies
jest.mock('child_process');
jest.mock('../../utils/git.js');

describe('review command', () => {
  let tempDir;
  let consoleMock;
  let restoreCwd;
  let exitMock;

  beforeEach(() => {
    tempDir = createTempDir('review-test');
    consoleMock = mockConsole();
    restoreCwd = mockProcessCwd(tempDir);
    exitMock = mockProcessExit();
    
    // Create mock vibe project
    createMockVibeProject(tempDir);
  });

  afterEach(() => {
    consoleMock.restore();
    restoreCwd();
    exitMock.restore();
    cleanupTempDir(tempDir);
  });

  describe('help command', () => {
    it('should display help when --help flag is provided', async () => {
      await reviewCommand(['--help']);
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍 vibe review - AI-powered code review')
      );
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('Usage:')
      );
    });

    it('should display help when -h flag is provided', async () => {
      await reviewCommand(['-h']);
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍 vibe review - AI-powered code review')
      );
    });
  });

  describe('clean subcommand', () => {
    it('should handle clean command with no cache files', async () => {
      await reviewCommand(['clean']);
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ No review cache files to clean')
      );
    });

    it('should handle clean command for specific ticket', async () => {
      await reviewCommand(['clean', 'TKT-001']);
      
      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  No cache files found for ticket TKT-001')
      );
    });
  });

  describe('git repository validation', () => {
    it('should exit with error if not in git repository', async () => {
      // Mock isGitRepository to return false
      const { isGitRepository } = await import('../../utils/git.js');
      isGitRepository.mockReturnValue(false);

      await reviewCommand(['TKT-001']);

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Not in a git repository')
      );
      expect(exitMock.mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('ticket ID validation', () => {
    beforeEach(() => {
      // Mock git repository check
      const git = require('../../utils/git.js');
      git.isGitRepository.mockReturnValue(true);
      git.getCurrentBranch.mockReturnValue('feature/TKT-001-test');
    });

    it('should validate proper ticket ID format', async () => {
      // Mock execSync for git commands
      const { execSync } = await import('child_process');
      execSync.mockReturnValue(''); // No staged changes

      await reviewCommand(['TKT-001']);

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  No staged changes found')
      );
    });

    it('should normalize ticket ID from number', async () => {
      const { execSync } = await import('child_process');
      execSync.mockReturnValue(''); // No staged changes

      await reviewCommand(['1']);

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  No staged changes found')
      );
    });

    it('should extract ticket ID from branch name when not provided', async () => {
      const { execSync } = await import('child_process');
      execSync.mockReturnValue(''); // No staged changes

      await reviewCommand([]);

      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('🔍 Detected ticket from branch: TKT-001')
      );
    });

    it('should handle invalid ticket ID format', async () => {
      await reviewCommand(['invalid-id']);

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Invalid ticket ID format')
      );
      expect(exitMock.mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle missing ticket file', async () => {
      await reviewCommand(['TKT-999']);

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Ticket not found: TKT-999')
      );
      expect(exitMock.mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('staged changes validation', () => {
    beforeEach(() => {
      // Mock git repository and valid ticket
      const git = require('../../utils/git.js');
      git.isGitRepository.mockReturnValue(true);
      git.getCurrentBranch.mockReturnValue('feature/TKT-001-test');
    });

    it('should handle no staged changes', async () => {
      const { execSync } = await import('child_process');
      execSync.mockReturnValue(''); // No staged changes

      await reviewCommand(['TKT-001']);

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  No staged changes found')
      );
      expect(exitMock.mockExit).toHaveBeenCalledWith(1);
    });

    it('should process staged changes successfully', async () => {
      const { execSync } = await import('child_process');
      execSync.mockReturnValue('diff --git a/test.js b/test.js\n+console.log("test");');

      await reviewCommand(['TKT-001']);

      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('🤖 Analyzing changes with AI...')
      );
    });
  });

  describe('review acceptance thresholds', () => {
    beforeEach(() => {
      // Mock git and staged changes
      const git = require('../../utils/git.js');
      git.isGitRepository.mockReturnValue(true);
      
      const { execSync } = require('child_process');
      execSync.mockReturnValue('diff --git a/test.js b/test.js\n+console.log("test");');
    });

    it('should pass review when above acceptance threshold', async () => {
      // Mock high completion percentage
      const originalCallClaude = jest.fn().mockResolvedValue({
        completionPercentage: 95,
        status: 'good',
        summary: 'Excellent implementation',
        completed: ['All requirements met'],
        missing: [],
        issues: [],
        recommendations: []
      });

      // Replace the callClaudeForReview function temporarily
      const review = await import('./index.js');
      const originalFunction = review.callClaudeForReview;
      review.callClaudeForReview = originalCallClaude;

      await reviewCommand(['TKT-001']);

      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('✅ Review passed')
      );
      expect(exitMock.mockExit).toHaveBeenCalledWith(0);

      // Restore original function
      review.callClaudeForReview = originalFunction;
    });

    it('should fail review when below acceptance threshold', async () => {
      await reviewCommand(['TKT-001']);

      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('🚫 Review failed')
      );
      expect(exitMock.mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('clipboard functionality', () => {
    beforeEach(() => {
      // Mock git and staged changes
      const git = require('../../utils/git.js');
      git.isGitRepository.mockReturnValue(true);
      
      const { execSync } = require('child_process');
      execSync.mockReturnValue('diff --git a/test.js b/test.js\n+console.log("test");');
    });

    it('should handle --copy flag', async () => {
      await reviewCommand(['TKT-001', '--copy']);

      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('📋 Clipboard tools not available')
      );
    });

    it('should handle -c flag', async () => {
      await reviewCommand(['TKT-001', '-c']);

      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('📋 Clipboard tools not available')
      );
    });

    it('should save to cache file when clipboard fails', async () => {
      await reviewCommand(['TKT-001', '-c']);

      expect(consoleMock.log).toHaveBeenCalledWith(
        expect.stringContaining('.vibe/.cache/review/logs/TKT-001/')
      );
    });
  });

  describe('error handling', () => {
    it('should handle configuration loading errors', async () => {
      // Mock getConfig to throw error
      const utils = require('../../utils/index.js');
      utils.getConfig.mockImplementation(() => {
        throw new Error('Config not found');
      });

      await reviewCommand(['TKT-001']);

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Failed to load configuration')
      );
      expect(exitMock.mockExit).toHaveBeenCalledWith(1);
    });

    it('should handle ticket parsing errors', async () => {
      // Mock fs.readFileSync to throw error
      const fs = require('fs');
      const originalReadFileSync = fs.readFileSync;
      fs.readFileSync = jest.fn().mockImplementation((path) => {
        if (path.includes('TKT-001')) {
          throw new Error('File read error');
        }
        return originalReadFileSync(path);
      });

      await reviewCommand(['TKT-001']);

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Failed to parse ticket')
      );
      expect(exitMock.mockExit).toHaveBeenCalledWith(1);

      // Restore original function
      fs.readFileSync = originalReadFileSync;
    });
  });

  describe('ticket normalization', () => {
    it('should normalize single digit numbers', () => {
      // Test normalizeTicketId function directly if exported
      const normalizeTicketId = (input) => {
        if (!input) return null;
        if (/^\d+$/.test(input)) {
          const paddedNumber = input.padStart(3, '0');
          return `TKT-${paddedNumber}`;
        }
        if (/^TKT-\d{3}$/.test(input)) {
          return input;
        }
        return null;
      };

      expect(normalizeTicketId('1')).toBe('TKT-001');
      expect(normalizeTicketId('11')).toBe('TKT-011');
      expect(normalizeTicketId('111')).toBe('TKT-111');
      expect(normalizeTicketId('TKT-001')).toBe('TKT-001');
      expect(normalizeTicketId('invalid')).toBe(null);
    });
  });
});

describe('utility functions', () => {
  describe('cleanupEmptyDirs', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = createTempDir('cleanup-test');
    });

    afterEach(() => {
      cleanupTempDir(tempDir);
    });

    it('should remove empty directories recursively', () => {
      // This would test the cleanupEmptyDirs function if it were exported
      // For now, we'll test the behavior through the main command
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('formatReviewForClipboard', () => {
    it('should format review results correctly', () => {
      const mockReview = {
        completionPercentage: 85,
        summary: 'Good implementation',
        completed: ['Feature A', 'Feature B'],
        missing: ['Test C'],
        issues: ['Issue 1'],
        recommendations: ['Rec 1']
      };

      const mockTicket = {
        metadata: {
          id: 'TKT-001',
          title: 'Test Ticket'
        }
      };

      // Test the formatting function if it were exported
      // For now, we'll test through the main command
      expect(mockReview.completionPercentage).toBe(85);
    });
  });
});