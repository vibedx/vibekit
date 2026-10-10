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
import fs from 'fs';

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

  describe('JSON output and filters', () => {
    const tickets = [
      { id: 'TKT-010', title: 'A full ticket title that is longer than forty characters', status: 'open', priority: 'high', assignee: 'Alice', author: 'Bob', worktree_path: '/tmp/branch' },
      { id: 'TKT-002', title: 'Earlier', status: 'done', assignee: 'alice' },
      { id: 'TKT-003', title: 'Other assignee', status: 'open', assignee: 'Charlie' }
    ];

    function jsonResult(args = []) {
      listCommand(['--json', ...args]);
      return JSON.parse(consoleMock.logs.log.join('\n'));
    }

    it('emits full fields and sorts by numeric ticket ID without table output', () => {
      const project = createMockVibeProject(tempDir, { withTickets: tickets });
      const ticketPath = project.ticketPaths[0];
      fs.writeFileSync(ticketPath, fs.readFileSync(ticketPath, 'utf-8').replace('priority: high', 'priority: high\nauthor: Bob\nworktree_path: /tmp/branch'));
      const result = jsonResult();
      expect(result.map(ticket => ticket.id)).toEqual(['TKT-002', 'TKT-003', 'TKT-010']);
      expect(result[2]).toEqual({ ...tickets[0], file: 'TKT-010-a-full-ticket-title-that-is-longer-than-forty-characters.md' });
    });

    it('emits an empty array for an empty directory', () => {
      createMockVibeProject(tempDir);
      expect(jsonResult()).toEqual([]);
      expect(exitMock.exitCalls).toEqual([]);
    });

    it.each([
      ['--status=open', '--assignee=ALICE'],
      ['--status', 'open', '--assignee', 'ALICE'],
      ['--status=open', '--owner', 'alice'],
      ['--status', 'open', '--owner=alice']
    ])('combines filters with either syntax: %s %s', (...args) => {
      createMockVibeProject(tempDir, { withTickets: tickets });
      expect(jsonResult(args).map(ticket => ticket.id)).toEqual(['TKT-010']);
    });

    it('emits an empty array when filters match nothing', () => {
      createMockVibeProject(tempDir, { withTickets: tickets });
      expect(jsonResult(['--assignee', 'nobody'])).toEqual([]);
    });

    it('supports spaced filters in the default table', () => {
      createMockVibeProject(tempDir, { withTickets: tickets });
      listCommand(['--status', 'open', '--assignee', 'alice']);
      const output = consoleMock.logs.log.join('\n');
      expect(output).toContain('VibeKit Tickets');
      expect(output).toContain('TKT-010');
      expect(output).not.toContain('TKT-002');
      expect(output).not.toContain('TKT-003');
    });

    it.each([['--status'], ['--assignee'], ['--owner'], ['--status='], ['--assignee', '--json']])('rejects missing filter values: %s', (...args) => {
      createMockVibeProject(tempDir, { withTickets: tickets });
      expect(() => listCommand(args)).toThrow('process.exit(1)');
      expect(consoleMock.logs.error.join('\n')).toContain('requires a value');
      expect(consoleMock.logs.log).toEqual([]);
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