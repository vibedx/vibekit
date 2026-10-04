import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { 
  createTempDir, 
  cleanupTempDir, 
  mockProcessCwd, 
  createMockVibeProject
} from './test-helpers.js';
import {
  resolveTicketId,
  isTicketSectionEmpty,
  checkEmptySections,
  normalizeTicketId,
  markdownFilenameMatchesId,
  branchContainsTicketId
} from './ticket.js';

describe('ticket utilities', () => {
  let tempDir;
  let restoreCwd;

  beforeEach(() => {
    tempDir = createTempDir('ticket-utils-test');
    restoreCwd = mockProcessCwd(tempDir);
  });

  afterEach(() => {
    restoreCwd();
    cleanupTempDir(tempDir);
  });

  describe('resolveTicketId', () => {
    it('should return null for invalid input', () => {
      expect(resolveTicketId(null)).toBe(null);
      expect(resolveTicketId(undefined)).toBe(null);
      expect(resolveTicketId('')).toBe(null);
    });

    it('should return null when tickets directory does not exist', () => {
      // No vibe project created
      expect(resolveTicketId('1')).toBe(null);
    });

    it('should resolve numeric ticket ID', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-001', title: 'Test ticket', slug: 'test-ticket' }
        ]
      });

      // Act
      const result = resolveTicketId('1');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('TKT-001');
      expect(result.file).toBe('TKT-001-test-ticket.md');
      expect(result.path).toContain('TKT-001-test-ticket.md');
    });

    it('should resolve padded numeric ticket ID', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-001', title: 'Test ticket', slug: 'test-ticket' }
        ]
      });

      // Act
      const result = resolveTicketId('001');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('TKT-001');
    });

    it('should resolve full TKT-XXX format', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-001', title: 'Test ticket', slug: 'test-ticket' }
        ]
      });

      // Act
      const result = resolveTicketId('TKT-001');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('TKT-001');
    });

    it('should handle case insensitive input', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-001', title: 'Test ticket', slug: 'test-ticket' }
        ]
      });

      // Act
      const result = resolveTicketId('tkt-001');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('TKT-001');
    });

    it('should return null for non-existent ticket', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-001', title: 'Test ticket', slug: 'test-ticket' }
        ]
      });

      // Act
      const result = resolveTicketId('999');

      // Assert
      expect(result).toBe(null);
    });

    it('should throw error for invalid format', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act & Assert
      expect(() => resolveTicketId('invalid-id')).toThrow('Invalid ticket ID format');
      expect(() => resolveTicketId('TKT-abc')).toThrow('Invalid ticket ID format');
    });

    it('should handle zero as input', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-000', title: 'Zero ticket', slug: 'zero-ticket' }
        ]
      });

      // Act
      const result = resolveTicketId(0);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('TKT-000');
    });

    it('should handle multiple tickets and find correct one', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-001', title: 'First ticket', slug: 'first-ticket' },
          { id: 'TKT-002', title: 'Second ticket', slug: 'second-ticket' },
          { id: 'TKT-010', title: 'Tenth ticket', slug: 'tenth-ticket' }
        ]
      });

      // Act
      const result1 = resolveTicketId('2');
      const result10 = resolveTicketId('10');

      // Assert
      expect(result1).toBeDefined();
      expect(result1.id).toBe('TKT-002');
      expect(result10).toBeDefined();
      expect(result10.id).toBe('TKT-010');
    });

    it('should not treat a shorter id as a prefix of a longer id', () => {
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-1000', title: 'Thousand', slug: 'thousand' }
        ]
      });

      expect(resolveTicketId('100')).toBe(null);
      expect(resolveTicketId('TKT-100')).toBe(null);
      expect(resolveTicketId('1000').id).toBe('TKT-1000');
      expect(resolveTicketId('TKT-1000').file).toBe('TKT-1000-thousand.md');
    });

    it('should keep TKT-100 and TKT-1000 distinct when both exist', () => {
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-1000', title: 'Thousand', slug: 'thousand' },
          { id: 'TKT-100', title: 'Hundred', slug: 'hundred' },
          { id: 'TKT-001', title: 'First', slug: 'first' }
        ]
      });

      expect(resolveTicketId('TKT-01').file).toBe('TKT-001-first.md');
      expect(resolveTicketId('100').file).toBe('TKT-100-hundred.md');
      expect(resolveTicketId('1000').file).toBe('TKT-1000-thousand.md');
    });

    it('should validate return object structure', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-001', title: 'Test ticket', slug: 'test-ticket' }
        ]
      });

      // Act
      const result = resolveTicketId('1');

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('file');  
      expect(result).toHaveProperty('path');
      expect(typeof result.id).toBe('string');
      expect(typeof result.file).toBe('string');
      expect(typeof result.path).toBe('string');
    });
  });

  describe('normalizeTicketId', () => {
    it('pads short numeric and prefixed forms', () => {
      expect(normalizeTicketId('1')).toBe('TKT-001');
      expect(normalizeTicketId('01')).toBe('TKT-001');
      expect(normalizeTicketId('TKT-1')).toBe('TKT-001');
      expect(normalizeTicketId('TKT-01')).toBe('TKT-001');
      expect(normalizeTicketId('tkt-010')).toBe('TKT-010');
      expect(normalizeTicketId('TKT001')).toBe('TKT-001');
      expect(normalizeTicketId('TKT-10')).toBe('TKT-010');
      expect(normalizeTicketId('1000')).toBe('TKT-1000');
    });

    it('rejects values that are not ticket ids', () => {
      expect(normalizeTicketId('')).toBe(null);
      expect(normalizeTicketId('abc')).toBe(null);
      expect(normalizeTicketId('TKT-abc')).toBe(null);
      expect(normalizeTicketId(null)).toBe(null);
    });
  });

  describe('markdownFilenameMatchesId', () => {
    it('matches the id on a boundary', () => {
      expect(markdownFilenameMatchesId('TKT-001-slug.md', 'TKT-001')).toBe(true);
      expect(markdownFilenameMatchesId('TKT-001.md', 'TKT-001')).toBe(true);
      expect(markdownFilenameMatchesId('TKT-0010-slug.md', 'TKT-001')).toBe(false);
      expect(markdownFilenameMatchesId('TKT-010-slug.md', 'TKT-01')).toBe(false);
      expect(markdownFilenameMatchesId('notes.txt', 'TKT-001')).toBe(false);
    });
  });

  describe('branchContainsTicketId', () => {
    it('matches the id token and not a longer id', () => {
      expect(branchContainsTicketId('feature/TKT-001-slug', 'TKT-001')).toBe(true);
      expect(branchContainsTicketId('feature/TKT-0010-slug', 'TKT-001')).toBe(false);
      expect(branchContainsTicketId('feature/TKT-0010-slug', 'TKT-0010')).toBe(true);
      expect(branchContainsTicketId('TKT-010', 'TKT-01')).toBe(false);
    });
  });

  describe('isTicketSectionEmpty', () => {
    it('treats a missing section as empty', () => {
      expect(isTicketSectionEmpty('## Other\ncontent', 'Description')).toBe(true);
    });

    it('treats a comment-only section as empty', () => {
      const md = '## Description\n\n<!-- write here -->\n\n## Acceptance Criteria\n';
      expect(isTicketSectionEmpty(md, 'Description')).toBe(true);
    });

    it('treats a whitespace-only section as empty', () => {
      expect(isTicketSectionEmpty('## Description\n\n   \n\n## Next\n', 'Description')).toBe(true);
    });

    it('treats a section with real content as non-empty', () => {
      const md = '## Description\n\nBuild the login flow.\n\n## Next\n';
      expect(isTicketSectionEmpty(md, 'Description')).toBe(false);
    });

    it('treats brief content as non-empty (no false positives)', () => {
      expect(isTicketSectionEmpty('## Description\nFix typo.\n', 'Description')).toBe(false);
    });

    it('returns true for invalid input', () => {
      expect(isTicketSectionEmpty(null, 'Description')).toBe(true);
      expect(isTicketSectionEmpty('## Description\nx', null)).toBe(true);
    });
  });

  describe('checkEmptySections', () => {
    it('reports only the empty key sections', () => {
      const md = [
        '## Description',
        'A real description here.',
        '',
        '## Acceptance Criteria',
        '<!-- todo -->',
        '',
        '## Implementation Notes',
        ''
      ].join('\n');
      expect(checkEmptySections(md)).toEqual(['Acceptance Criteria', 'Implementation Notes']);
    });

    it('returns empty array when all key sections have content', () => {
      const md = [
        '## Description', 'd', '',
        '## Acceptance Criteria', '- [ ] a', '',
        '## Implementation Notes', 'notes'
      ].join('\n');
      expect(checkEmptySections(md)).toEqual([]);
    });
  });

  // Note: parseTicket and updateTicket have complex error handling and validation
  // that would require extensive mocking of file system operations and YAML parsing.
  // These functions are better tested through integration tests that test the 
  // commands that use them (like close, start, etc.)
});