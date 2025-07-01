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
import closeCommand from './index.js';

describe('close command', () => {
  let tempDir;
  let consoleMock;
  let restoreCwd;
  let exitMock;

  beforeEach(() => {
    tempDir = createTempDir('close-test');
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

  describe('argument validation', () => {
    it('should show error when no ticket ID provided', () => {
      // Act
      expect(() => closeCommand([])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.error).toContain('❌ Please provide a ticket ID or number.');
    });
  });

  describe('tickets directory validation', () => {
    it('should show error when tickets directory does not exist', () => {
      // Act - no vibe project created
      expect(() => closeCommand(['TKT-001'])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.error.some(log => 
        log.includes('❌ Tickets directory not found:')
      )).toBe(true);
    });
  });

  describe('ticket closing', () => {
    it('should mark ticket as done when found by full ID', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { 
            id: 'TKT-001', 
            title: 'Test ticket', 
            status: 'open',
            slug: 'test-ticket'
          }
        ]
      });

      // Act
      closeCommand(['TKT-001']);

      // Assert
      expect(consoleMock.logs.log).toContain('✅ Ticket TKT-001 marked as done.');
      
      // Verify file was updated
      const ticketPath = path.join(tempDir, '.vibe', 'tickets', 'TKT-001-test-ticket.md');
      const content = fs.readFileSync(ticketPath, 'utf-8');
      expect(content).toContain('status: done');
    });

    it('should mark ticket as done when found by number only', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { 
            id: 'TKT-002', 
            title: 'Another ticket', 
            status: 'in_progress',
            slug: 'another-ticket'
          }
        ]
      });

      // Act
      closeCommand(['2']);

      // Assert
      expect(consoleMock.logs.log).toContain('✅ Ticket TKT-002 marked as done.');
      
      // Verify file was updated
      const ticketPath = path.join(tempDir, '.vibe', 'tickets', 'TKT-002-another-ticket.md');
      const content = fs.readFileSync(ticketPath, 'utf-8');
      expect(content).toContain('status: done');
    });

    it('should preserve other frontmatter fields when updating status', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { 
            id: 'TKT-003', 
            title: 'Ticket with priority', 
            status: 'open',
            priority: 'high',
            slug: 'ticket-with-priority'
          }
        ]
      });

      // Act
      closeCommand(['TKT-003']);

      // Assert
      const ticketPath = path.join(tempDir, '.vibe', 'tickets', 'TKT-003-ticket-with-priority.md');
      const content = fs.readFileSync(ticketPath, 'utf-8');
      expect(content).toContain('status: done');
      expect(content).toContain('priority: high');
      expect(content).toContain('title: Ticket with priority');
    });

    it('should handle ticket not found', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { 
            id: 'TKT-001', 
            title: 'Existing ticket', 
            status: 'open',
            slug: 'existing-ticket'
          }
        ]
      });

      // Act
      closeCommand(['TKT-999']);

      // Assert
      expect(consoleMock.logs.log).toContain("❌ No ticket matching 'TKT-999' found.");
    });

    it('should handle multiple tickets and find correct one', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { 
            id: 'TKT-001', 
            title: 'First ticket', 
            status: 'open',
            slug: 'first-ticket'
          },
          { 
            id: 'TKT-002', 
            title: 'Second ticket', 
            status: 'in_progress',
            slug: 'second-ticket'
          },
          { 
            id: 'TKT-003', 
            title: 'Third ticket', 
            status: 'review',
            slug: 'third-ticket'
          }
        ]
      });

      // Act
      closeCommand(['2']);

      // Assert
      expect(consoleMock.logs.log).toContain('✅ Ticket TKT-002 marked as done.');
      
      // Verify only the targeted ticket was updated
      const ticket1Path = path.join(tempDir, '.vibe', 'tickets', 'TKT-001-first-ticket.md');
      const ticket2Path = path.join(tempDir, '.vibe', 'tickets', 'TKT-002-second-ticket.md');
      const ticket3Path = path.join(tempDir, '.vibe', 'tickets', 'TKT-003-third-ticket.md');
      
      expect(fs.readFileSync(ticket1Path, 'utf-8')).toContain('status: open');
      expect(fs.readFileSync(ticket2Path, 'utf-8')).toContain('status: done');
      expect(fs.readFileSync(ticket3Path, 'utf-8')).toContain('status: review');
    });
  });

  describe('error handling', () => {
    it('should skip directories in tickets folder', () => {
      // Arrange
      const vibeProject = createMockVibeProject(tempDir);
      
      // Create a subdirectory in tickets folder
      fs.mkdirSync(path.join(vibeProject.ticketsDir, 'subdirectory'));
      
      // Create a valid ticket
      const ticketContent = `---
id: TKT-001
title: Valid ticket
status: open
---

# Test ticket`;
      fs.writeFileSync(path.join(vibeProject.ticketsDir, 'TKT-001-valid.md'), ticketContent, 'utf-8');

      // Act
      closeCommand(['TKT-001']);

      // Assert
      expect(consoleMock.logs.log).toContain('✅ Ticket TKT-001 marked as done.');
    });

    it('should handle files without proper frontmatter', () => {
      // Arrange
      const vibeProject = createMockVibeProject(tempDir);
      
      // Create invalid file without frontmatter
      fs.writeFileSync(path.join(vibeProject.ticketsDir, 'invalid.md'), 'No frontmatter here', 'utf-8');
      
      // Act
      closeCommand(['TKT-001']);

      // Assert
      expect(consoleMock.logs.log).toContain("❌ No ticket matching 'TKT-001' found.");
    });
  });
});