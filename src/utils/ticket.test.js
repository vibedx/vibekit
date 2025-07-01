import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { 
  createTempDir, 
  cleanupTempDir, 
  mockProcessCwd, 
  createMockVibeProject
} from './test-helpers.js';
import { resolveTicketId } from './ticket.js';

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

  // Note: parseTicket and updateTicket have complex error handling and validation
  // that would require extensive mocking of file system operations and YAML parsing.
  // These functions are better tested through integration tests that test the 
  // commands that use them (like close, start, etc.)
});