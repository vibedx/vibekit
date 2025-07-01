import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  createTempDir, 
  cleanupTempDir, 
  mockConsole,
  createMockGitRepo
} from './test-helpers.js';

// Mock child_process
const mockExecSync = jest.fn();
jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync
}));

describe('git utilities', () => {
  let tempDir;
  let consoleMock;
  let gitModule;

  beforeEach(async () => {
    tempDir = createTempDir('git-test');
    consoleMock = mockConsole();
    mockExecSync.mockReset();
    
    // Import after mocking
    gitModule = await import('./git.js');
  });

  afterEach(() => {
    consoleMock.restore();
    cleanupTempDir(tempDir);
    jest.clearAllMocks();
  });

  describe('isGitRepository', () => {
    it('should return true when in git repository', () => {
      // Arrange
      mockExecSync.mockReturnValue('true');

      // Act
      const result = gitModule.isGitRepository();

      // Assert
      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    });

    it('should return false when not in git repository', () => {
      // Arrange
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      // Act
      const result = gitModule.isGitRepository();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', () => {
      // Arrange
      mockExecSync.mockReturnValue('feature/test-branch\n');

      // Act
      const result = gitModule.getCurrentBranch();

      // Assert
      expect(result).toBe('feature/test-branch');
      expect(mockExecSync).toHaveBeenCalledWith('git branch --show-current', { encoding: 'utf-8' });
    });

    it('should return null when git command fails', () => {
      // Arrange
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      // Act
      const result = gitModule.getCurrentBranch();

      // Assert
      expect(result).toBe(null);
    });

    it('should handle empty branch name', () => {
      // Arrange
      mockExecSync.mockReturnValue('');

      // Act
      const result = gitModule.getCurrentBranch();

      // Assert
      expect(result).toBe('');
    });
  });

  describe('branchExistsLocally', () => {
    it('should return true when branch exists locally', () => {
      // Arrange
      mockExecSync.mockReturnValue('');

      // Act
      const result = gitModule.branchExistsLocally('feature/test');

      // Assert
      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git show-ref --verify --quiet refs/heads/feature/test');
    });

    it('should return false when branch does not exist locally', () => {
      // Arrange
      mockExecSync.mockImplementation(() => {
        throw new Error('Branch not found');
      });

      // Act
      const result = gitModule.branchExistsLocally('nonexistent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('branchExistsRemotely', () => {
    it('should return true when branch exists remotely', () => {
      // Arrange
      mockExecSync.mockReturnValue('abc123\trefs/heads/feature/test\n');

      // Act
      const result = gitModule.branchExistsRemotely('feature/test');

      // Assert
      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git ls-remote --heads origin feature/test', { encoding: 'utf-8' });
    });

    it('should return false when branch does not exist remotely', () => {
      // Arrange
      mockExecSync.mockReturnValue('');

      // Act
      const result = gitModule.branchExistsRemotely('nonexistent');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when git command fails', () => {
      // Arrange
      mockExecSync.mockImplementation(() => {
        throw new Error('Network error');
      });

      // Act
      const result = gitModule.branchExistsRemotely('test');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getDefaultBaseBranch', () => {
    it('should return main when origin/main exists', () => {
      // Arrange
      mockExecSync.mockReturnValue('  origin/main\n  origin/develop\n');

      // Act
      const result = gitModule.getDefaultBaseBranch();

      // Assert
      expect(result).toBe('main');
    });

    it('should return master when origin/master exists but not main', () => {
      // Arrange
      mockExecSync.mockReturnValue('  origin/master\n  origin/develop\n');

      // Act
      const result = gitModule.getDefaultBaseBranch();

      // Assert
      expect(result).toBe('master');
    });

    it('should default to main when neither exists', () => {
      // Arrange
      mockExecSync.mockReturnValue('  origin/develop\n  origin/feature\n');

      // Act
      const result = gitModule.getDefaultBaseBranch();

      // Assert
      expect(result).toBe('main');
    });

    it('should handle git command failure', () => {
      // Arrange
      mockExecSync.mockImplementation(() => {
        throw new Error('Git error');
      });

      // Act
      const result = gitModule.getDefaultBaseBranch();

      // Assert
      expect(result).toBe('main');
    });
  });

  describe('createAndCheckoutBranch', () => {
    it('should create and checkout new branch successfully', () => {
      // Arrange
      mockExecSync.mockImplementation((command) => {
        if (command.includes('fetch')) return '';
        if (command.includes('checkout -b')) return '';
        return '';
      });

      // Act
      const result = gitModule.createAndCheckoutBranch('feature/new-branch');

      // Assert
      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('checkout -b feature/new-branch'),
        { stdio: 'pipe' }
      );
    });

    it('should use custom base branch when provided', () => {
      // Arrange
      mockExecSync.mockImplementation(() => '');

      // Act
      const result = gitModule.createAndCheckoutBranch('feature/test', 'develop');

      // Assert
      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('develop'),
        expect.any(Object)
      );
    });

    it('should return false when branch creation fails', () => {
      // Arrange
      mockExecSync.mockImplementation((command) => {
        if (command.includes('checkout -b')) {
          throw new Error('Branch creation failed');
        }
        return '';
      });

      // Act
      const result = gitModule.createAndCheckoutBranch('invalid/branch');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('checkoutBranch', () => {
    it('should checkout existing branch successfully', () => {
      // Arrange
      mockExecSync.mockReturnValue('');

      // Act
      const result = gitModule.checkoutBranch('existing-branch');

      // Assert
      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('git checkout existing-branch', { stdio: 'pipe' });
    });

    it('should return false when checkout fails', () => {
      // Arrange
      mockExecSync.mockImplementation(() => {
        throw new Error('Branch not found');
      });

      // Act
      const result = gitModule.checkoutBranch('nonexistent');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getGitStatus', () => {
    it('should return git status output', () => {
      // Arrange
      const statusOutput = 'M file1.js\nA file2.js\n';
      mockExecSync.mockReturnValue(statusOutput);

      // Act
      const result = gitModule.getGitStatus();

      // Assert
      expect(result).toBe('M file1.js\nA file2.js');
      expect(mockExecSync).toHaveBeenCalledWith('git status --porcelain', { encoding: 'utf-8' });
    });

    it('should return empty string when no changes', () => {
      // Arrange
      mockExecSync.mockReturnValue('');

      // Act
      const result = gitModule.getGitStatus();

      // Assert
      expect(result).toBe('');
    });

    it('should return empty string when git command fails', () => {
      // Arrange
      mockExecSync.mockImplementation(() => {
        throw new Error('Not a git repository');
      });

      // Act
      const result = gitModule.getGitStatus();

      // Assert
      expect(result).toBe('');
    });
  });
});