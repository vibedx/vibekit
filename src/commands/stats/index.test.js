import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTempDir,
  cleanupTempDir,
  mockConsole,
  mockProcessCwd,
  createMockVibeProject
} from '../../utils/test-helpers.js';
import statsCommand from './index.js';

describe('stats command', () => {
  let tempDir;
  let consoleMock;
  let restoreCwd;

  beforeEach(() => {
    tempDir = createTempDir('stats-test');
    consoleMock = mockConsole();
    restoreCwd = mockProcessCwd(tempDir);
  });

  afterEach(() => {
    consoleMock.restore();
    restoreCwd();
    cleanupTempDir(tempDir);
  });

  it('should show empty message when no tickets exist', () => {
    createMockVibeProject(tempDir);

    statsCommand([]);

    expect(consoleMock.logs.log.some(l => l.includes('No tickets found'))).toBe(true);
  });

  it('should show total count and completion percentage', () => {
    createMockVibeProject(tempDir, {
      withTickets: [
        { id: 'TKT-001', title: 'Open task', status: 'open', priority: 'high', slug: 'open-task' },
        { id: 'TKT-002', title: 'Done task', status: 'done', priority: 'medium', slug: 'done-task' },
        { id: 'TKT-003', title: 'WIP task', status: 'in_progress', priority: 'low', slug: 'wip-task' },
      ]
    });

    statsCommand([]);

    const output = consoleMock.logs.log.join('\n');
    expect(output).toContain('Total tickets: 3');
    expect(output).toContain('1/3');
    expect(output).toContain('33%');
  });

  it('should show status breakdown', () => {
    createMockVibeProject(tempDir, {
      withTickets: [
        { id: 'TKT-001', title: 'A', status: 'open', priority: 'medium', slug: 'a' },
        { id: 'TKT-002', title: 'B', status: 'open', priority: 'medium', slug: 'b' },
        { id: 'TKT-003', title: 'C', status: 'done', priority: 'high', slug: 'c' },
      ]
    });

    statsCommand([]);

    const output = consoleMock.logs.log.join('\n');
    expect(output).toContain('Status');
    expect(output).toContain('open');
    expect(output).toContain('done');
  });

  it('should show priority breakdown', () => {
    createMockVibeProject(tempDir, {
      withTickets: [
        { id: 'TKT-001', title: 'A', status: 'open', priority: 'critical', slug: 'a' },
        { id: 'TKT-002', title: 'B', status: 'open', priority: 'low', slug: 'b' },
      ]
    });

    statsCommand([]);

    const output = consoleMock.logs.log.join('\n');
    expect(output).toContain('Priority');
    expect(output).toContain('critical');
    expect(output).toContain('low');
  });

  it('should show assignee breakdown when tickets have assignees', () => {
    createMockVibeProject(tempDir, {
      withTickets: [
        { id: 'TKT-001', title: 'A', status: 'open', priority: 'medium', slug: 'a', assignee: 'alice' },
        { id: 'TKT-002', title: 'B', status: 'open', priority: 'medium', slug: 'b', assignee: 'alice' },
        { id: 'TKT-003', title: 'C', status: 'done', priority: 'medium', slug: 'c', assignee: 'bob' },
      ]
    });

    statsCommand([]);

    const output = consoleMock.logs.log.join('\n');
    expect(output).toContain('Assignees');
    expect(output).toContain('alice');
    expect(output).toContain('bob');
  });

  it('should handle tickets with no assignees gracefully', () => {
    createMockVibeProject(tempDir, {
      withTickets: [
        { id: 'TKT-001', title: 'A', status: 'open', priority: 'medium', slug: 'a' },
      ]
    });

    statsCommand([]);

    const output = consoleMock.logs.log.join('\n');
    expect(output).not.toContain('Assignees');
  });
});
