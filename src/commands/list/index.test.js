import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  createTempDir, 
  cleanupTempDir, 
  mockConsole, 
  mockProcessCwd, 
  mockProcessExit,
  createMockVibeProject
} from '../../utils/test-helpers.js';
import listCommand from './index.js';

describe('list command', () => {
  let tempDir;
  let consoleMock;
  let restoreCwd;
  let exitMock;

  beforeEach(() => {
    tempDir = createTempDir('list-test');
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

  describe('basic listing', () => {
    it('should show message when no tickets exist', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act
      expect(() => listCommand([])).toThrow('process.exit(0)');

      // Assert
      expect(exitMock.exitCalls).toContain(0);
      expect(consoleMock.logs.log.some(log => 
        log.includes('No tickets found')
      )).toBe(true);
    });

    it('should list all tickets with their details', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { 
            id: 'TKT-001', 
            title: 'First ticket', 
            status: 'open', 
            priority: 'high',
            slug: 'first-ticket'
          },
          { 
            id: 'TKT-002', 
            title: 'Second ticket', 
            status: 'in_progress', 
            priority: 'medium',
            slug: 'second-ticket'
          }
        ]
      });

      // Act
      listCommand([]);

      // Assert
      const output = consoleMock.logs.log.join(' ');
      expect(output).toContain('TKT-001');
      expect(output).toContain('First ticket');
      expect(output).toContain('TKT-002');
      expect(output).toContain('Second ticket');
    });

    it('should show ticket status and priority', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { 
            id: 'TKT-001', 
            title: 'Test ticket', 
            status: 'done', 
            priority: 'urgent',
            slug: 'test-ticket'
          }
        ]
      });

      // Act
      listCommand([]);

      // Assert
      const output = consoleMock.logs.log.join(' ');
      expect(output).toContain('done');
      expect(output).toContain('TKT-001');
    });
  });

  describe('error handling', () => {
    it('should handle missing vibe directory gracefully', () => {
      // Act - no vibe project created
      expect(() => listCommand([])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
    });

    it('should handle corrupted ticket files', async () => {
      // Arrange
      const vibeProject = createMockVibeProject(tempDir);
      
      // Create a corrupted ticket file
      const fs = await import('fs');
      fs.writeFileSync(
        `${vibeProject.ticketsDir}/TKT-001-corrupted.md`, 
        'invalid yaml content without frontmatter',
        'utf-8'
      );

      // Act
      expect(() => listCommand([])).toThrow('process.exit(0)');

      // Assert - should handle gracefully and continue
      expect(exitMock.exitCalls).toContain(0);
    });
  });

  describe('filtering and sorting', () => {
    it('should handle multiple tickets correctly', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-003', title: 'Third', status: 'open' },
          { id: 'TKT-001', title: 'First', status: 'done' },
          { id: 'TKT-002', title: 'Second', status: 'in_progress' }
        ]
      });

      // Act
      listCommand([]);

      // Assert
      const output = consoleMock.logs.log.join(' ');
      expect(output).toContain('TKT-001');
      expect(output).toContain('TKT-002');
      expect(output).toContain('TKT-003');
    });
  });
});