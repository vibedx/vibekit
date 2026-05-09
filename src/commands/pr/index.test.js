import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

jest.unstable_mockModule('child_process', () => ({
  execSync: jest.fn()
}));

jest.unstable_mockModule('../../utils/index.js', () => ({
  getTicketsDir: jest.fn(),
  getConfig: jest.fn(() => ({ git: { branch_prefix: 'feature/', default_base: 'main' } }))
}));

jest.unstable_mockModule('../../utils/git.js', () => ({
  isGitRepository: jest.fn(() => true),
  getCurrentBranch: jest.fn(() => 'feature/TKT-001-add-login'),
  getDefaultBaseBranch: jest.fn(() => 'main'),
  listWorktrees: jest.fn(() => []),
  getRepoRoot: jest.fn(() => '/tmp/test-repo')
}));

const { default: prCommand } = await import('./index.js');
const { getTicketsDir } = await import('../../utils/index.js');
const { isGitRepository, getCurrentBranch, listWorktrees, getRepoRoot } = await import('../../utils/git.js');
const childProcess = await import('child_process');

const TICKET_CONTENT = `---
id: TKT-001
title: Add login page
slug: TKT-001-add-login-page
status: in_progress
priority: high
assignee: dev1
author: pm
created_at: "2026-01-01T00:00:00Z"
updated_at: "2026-01-01T00:00:00Z"
---

## Description
Add a login page.
`;

describe('pr command', () => {
  let tempDir;
  let mockExit;
  let mockConsoleLog;
  let mockConsoleError;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join('/tmp', 'vibe-pr-test-'));
    const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
    fs.mkdirSync(ticketsDir, { recursive: true });
    fs.writeFileSync(path.join(ticketsDir, 'TKT-001-add-login-page.md'), TICKET_CONTENT);

    getTicketsDir.mockReturnValue(ticketsDir);
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Default: gh is installed, origin exists
    childProcess.execSync.mockImplementation((cmd) => {
      if (cmd === 'gh --version') return 'gh version 2.0.0';
      if (cmd.includes('remote get-url')) return 'git@github.com:org/repo.git';
      if (cmd.includes('git push')) return '';
      if (cmd.includes('gh pr create')) return 'https://github.com/org/repo/pull/1';
      return '';
    });
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  test('exits if not in git repo', async () => {
    isGitRepository.mockReturnValueOnce(false);
    await expect(prCommand([])).rejects.toThrow('process.exit');
    expect(mockConsoleError).toHaveBeenCalledWith('❌ Not in a git repository.');
  });

  test('exits if no remote', async () => {
    childProcess.execSync.mockImplementation((cmd) => {
      if (cmd.includes('remote get-url')) throw new Error('no remote');
      return '';
    });
    await expect(prCommand([])).rejects.toThrow('process.exit');
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('No git remote'));
  });

  test('exits if gh not installed', async () => {
    childProcess.execSync.mockImplementation((cmd) => {
      if (cmd === 'gh --version') throw new Error('not found');
      if (cmd.includes('remote get-url')) return 'git@github.com:org/repo.git';
      return '';
    });
    await expect(prCommand([])).rejects.toThrow('process.exit');
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('GitHub CLI'));
  });

  test('creates PR for current branch', async () => {
    await prCommand([]);
    expect(childProcess.execSync).toHaveBeenCalledWith(
      expect.stringContaining('gh pr create'),
      expect.any(Object)
    );
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('https://github.com'));
  });

  test('dry run shows branches without creating PRs', async () => {
    await prCommand(['--dry-run']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Dry run complete'));
    const prCreateCalls = childProcess.execSync.mock.calls.filter(([cmd]) =>
      typeof cmd === 'string' && cmd.includes('gh pr create')
    );
    expect(prCreateCalls.length).toBe(0);
  });

  test('errors when on base branch with no args', async () => {
    getCurrentBranch.mockReturnValueOnce('main');
    await expect(prCommand([])).rejects.toThrow('process.exit');
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining("You're on main"));
  });

  test('--all collects worktree branches', async () => {
    listWorktrees.mockReturnValueOnce([
      { path: '/tmp/test-repo', branch: 'main' },
      { path: '/tmp/wt-1', branch: 'feature/TKT-001-login' },
      { path: '/tmp/wt-2', branch: 'feature/TKT-002-signup' }
    ]);
    getRepoRoot.mockReturnValueOnce('/tmp/test-repo');

    await prCommand(['--all']);
    const prCalls = childProcess.execSync.mock.calls.filter(([cmd]) => cmd.includes('gh pr create'));
    expect(prCalls.length).toBe(2);
  });
});
