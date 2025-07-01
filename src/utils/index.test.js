import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { 
  createTempDir, 
  cleanupTempDir, 
  mockProcessCwd,
  createMockVibeProject
} from './test-helpers.js';
import { 
  getTicketsDir, 
  getConfig, 
  getNextTicketId, 
  createSlug, 
  createFullSlug 
} from './index.js';

describe('utils/index.js', () => {
  let tempDir;
  let restoreCwd;

  beforeEach(() => {
    tempDir = createTempDir('utils-test');
    restoreCwd = mockProcessCwd(tempDir);
  });

  afterEach(() => {
    restoreCwd();
    cleanupTempDir(tempDir);
  });

  describe('getTicketsDir', () => {
    it('should return default tickets directory when no config exists', () => {
      // Act
      const result = getTicketsDir();

      // Assert
      expect(result).toBe(path.join(tempDir, '.vibe', 'tickets'));
    });

    it('should return custom tickets directory from config', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        configData: `project:
  name: Test Project

tickets:
  path: custom/tickets
`
      });

      // Act
      const result = getTicketsDir();

      // Assert
      expect(result).toBe(path.join(tempDir, 'custom', 'tickets'));
    });

    it('should handle relative paths in config', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        configData: `tickets:
  path: ./my-tickets
`
      });

      // Act
      const result = getTicketsDir();

      // Assert
      expect(result).toBe(path.join(tempDir, 'my-tickets'));
    });

    it('should fallback to default when config path is invalid', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        configData: `tickets:
  path: null
`
      });

      // Act
      const result = getTicketsDir();

      // Assert
      expect(result).toBe(path.join(tempDir, '.vibe', 'tickets'));
    });
  });

  describe('getConfig', () => {
    it('should return empty object when no config exists', () => {
      // Act
      const result = getConfig();

      // Assert
      expect(result).toEqual({});
    });

    it('should return parsed config when file exists', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        configData: `project:
  name: Test Project
  version: 1.0.0

tickets:
  priority_options:
    - low
    - medium
    - high
`
      });

      // Act
      const result = getConfig();

      // Assert
      expect(result.project.name).toBe('Test Project');
      expect(result.project.version).toBe('1.0.0');
      expect(result.tickets.priority_options).toContain('medium');
    });

    it('should handle malformed YAML gracefully', () => {
      // Arrange
      const vibeDir = path.join(tempDir, '.vibe');
      fs.mkdirSync(vibeDir, { recursive: true });
      fs.writeFileSync(path.join(vibeDir, 'config.yml'), 'invalid: yaml: content: [', 'utf-8');

      // Mock console.error to suppress expected error output
      const originalError = console.error;
      console.error = jest.fn();

      // Act
      const result = getConfig();

      // Assert
      expect(result).toEqual({});
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Error reading config:')
      );

      // Restore console.error
      console.error = originalError;
    });

    it('should handle non-object YAML content', () => {
      // Arrange
      const vibeDir = path.join(tempDir, '.vibe');
      fs.mkdirSync(vibeDir, { recursive: true });
      fs.writeFileSync(path.join(vibeDir, 'config.yml'), 'just a string', 'utf-8');

      // Act
      const result = getConfig();

      // Assert
      expect(result).toEqual({});
    });
  });

  describe('getNextTicketId', () => {
    it('should return TKT-001 when no tickets exist', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act
      const result = getNextTicketId();

      // Assert
      expect(result).toBe('TKT-001');
    });

    it('should return TKT-001 when tickets directory does not exist', () => {
      // Act
      const result = getNextTicketId();

      // Assert
      expect(result).toBe('TKT-001');
    });

    it('should increment from existing tickets', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-001', title: 'First ticket' },
          { id: 'TKT-002', title: 'Second ticket' },
          { id: 'TKT-005', title: 'Fifth ticket' }
        ]
      });

      // Act
      const result = getNextTicketId();

      // Assert
      expect(result).toBe('TKT-006');
    });

    it('should handle non-ticket files in directory', () => {
      // Arrange
      const vibeProject = createMockVibeProject(tempDir, {
        withTickets: [{ id: 'TKT-003', title: 'Third ticket' }]
      });
      
      // Add non-ticket files
      fs.writeFileSync(path.join(vibeProject.ticketsDir, 'README.md'), 'Some readme', 'utf-8');
      fs.writeFileSync(path.join(vibeProject.ticketsDir, 'notes.txt'), 'Some notes', 'utf-8');

      // Act
      const result = getNextTicketId();

      // Assert
      expect(result).toBe('TKT-004');
    });

    it('should handle malformed ticket filenames', () => {
      // Arrange
      const vibeProject = createMockVibeProject(tempDir, {
        withTickets: [{ id: 'TKT-002', title: 'Valid ticket' }]
      });
      
      // Add invalid ticket files
      fs.writeFileSync(path.join(vibeProject.ticketsDir, 'TKT-invalid.md'), 'Invalid', 'utf-8');
      fs.writeFileSync(path.join(vibeProject.ticketsDir, 'TKT-.md'), 'Empty number', 'utf-8');

      // Act
      const result = getNextTicketId();

      // Assert
      expect(result).toBe('TKT-003');
    });
  });

  describe('createSlug', () => {
    it('should create basic slug from title', () => {
      // Act
      const result = createSlug('Fix User Authentication Bug');

      // Assert
      expect(result).toBe('fix-user-authentication-bug');
    });

    it('should handle empty or null title', () => {
      // Act & Assert
      expect(createSlug('')).toBe('');
      expect(createSlug(null)).toBe('');
      expect(createSlug(undefined)).toBe('');
    });

    it('should handle non-string input', () => {
      // Act & Assert
      expect(createSlug(123)).toBe('');
      expect(createSlug({})).toBe('');
    });

    it('should remove special characters', () => {
      // Act
      const result = createSlug('Add @user #login with $pecial ch@rs!');

      // Assert
      expect(result).toBe('add-user-login-with-pecial');
    });

    it('should limit words based on config', () => {
      // Arrange
      const config = {
        tickets: {
          slug: {
            word_limit: 3
          }
        }
      };

      // Act
      const result = createSlug('This is a very long title with many words', config);

      // Assert
      expect(result).toBe('this-is-a');
    });

    it('should limit length based on config', () => {
      // Arrange
      const config = {
        tickets: {
          slug: {
            max_length: 10
          }
        }
      };

      // Act
      const result = createSlug('Very long title that should be truncated', config);

      // Assert
      expect(result).toBe('very-long');
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should use default values for invalid config', () => {
      // Arrange
      const config = {
        tickets: {
          slug: {
            max_length: -5,
            word_limit: 0
          }
        }
      };

      // Act
      const result = createSlug('Test title', config);

      // Assert
      expect(result).toBe('t'); // Limited by clamped max_length
    });

    it('should return fallback for empty result', () => {
      // Act
      const result = createSlug('!@#$%^&*()');

      // Assert
      expect(result).toBe('untitled');
    });

    it('should handle multiple spaces and trim properly', () => {
      // Act
      const result = createSlug('  Multiple    Spaces   Between   Words  ');

      // Assert
      expect(result).toBe('multiple-spaces-between-words');
    });
  });

  describe('createFullSlug', () => {
    it('should combine ticket ID and slug', () => {
      // Act
      const result = createFullSlug('TKT-001', 'fix-auth-bug');

      // Assert
      expect(result).toBe('TKT-001-fix-auth-bug');
    });

    it('should handle empty ticket ID', () => {
      // Act & Assert
      expect(createFullSlug('', 'test-slug')).toBe('');
      expect(createFullSlug(null, 'test-slug')).toBe('');
      expect(createFullSlug(undefined, 'test-slug')).toBe('');
    });

    it('should handle empty slug text', () => {
      // Act & Assert
      expect(createFullSlug('TKT-001', '')).toBe('TKT-001');
      expect(createFullSlug('TKT-001', null)).toBe('TKT-001');
      expect(createFullSlug('TKT-001', undefined)).toBe('TKT-001');
    });

    it('should handle both empty inputs', () => {
      // Act & Assert
      expect(createFullSlug('', '')).toBe('');
      expect(createFullSlug(null, null)).toBe('');
    });

    it('should trim whitespace from inputs', () => {
      // Act
      const result = createFullSlug('  TKT-001  ', '  test-slug  ');

      // Assert
      expect(result).toBe('TKT-001-test-slug');
    });

    it('should handle non-string inputs', () => {
      // Act & Assert
      expect(createFullSlug(123, 'slug')).toBe('');
      expect(createFullSlug('TKT-001', 123)).toBe('TKT-001');
    });
  });
});