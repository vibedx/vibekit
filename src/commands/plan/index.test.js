import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Mock dependencies
jest.unstable_mockModule('child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn(() => ({ unref: jest.fn(), pid: 12345 }))
}));

jest.unstable_mockModule('../../utils/index.js', () => ({
  getTicketsDir: jest.fn(),
  getConfig: jest.fn(() => ({ git: { branch_prefix: 'feature/' } })),
  createSlug: jest.fn(title => title.toLowerCase().replace(/\s+/g, '-'))
}));

jest.unstable_mockModule('../../utils/git.js', () => ({
  isGitRepository: jest.fn(() => true),
  getRepoName: jest.fn(() => 'test-repo'),
  getRepoRoot: jest.fn(() => '/tmp/test-repo'),
  getWorktreePath: jest.fn((repo, branch) => `/tmp/.vibekit/worktrees/${repo}/${branch}`),
  createWorktree: jest.fn(),
  createWorktreeExistingBranch: jest.fn(),
  branchExistsLocally: jest.fn(() => false),
  branchExistsRemotely: jest.fn(() => false),
  getDefaultBaseBranch: jest.fn(() => 'main')
}));

const { default: planCommand } = await import('./index.js');
const { getTicketsDir, getConfig } = await import('../../utils/index.js');
const { isGitRepository, getWorktreePath, createWorktree } = await import('../../utils/git.js');
const childProcess = await import('child_process');

const TICKET_CONTENT = `---
id: TKT-001
title: Add login page
slug: TKT-001-add-login-page
status: open
priority: high
assignee: dev1
author: pm
created_at: "2026-01-01T00:00:00Z"
updated_at: "2026-01-01T00:00:00Z"
---

## Description
Add a login page.

## Acceptance Criteria
- [ ] Login form exists
`;

describe('plan command', () => {
  let tempDir;
  let mockExit;
  let mockConsoleLog;
  let mockConsoleError;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join('/tmp', 'vibe-plan-test-'));
    const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
    fs.mkdirSync(ticketsDir, { recursive: true });
    fs.writeFileSync(path.join(ticketsDir, 'TKT-001-add-login-page.md'), TICKET_CONTENT);

    getTicketsDir.mockReturnValue(ticketsDir);
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    childProcess.execSync.mockImplementation(() => '');

    // Worktree path doesn't exist yet
    getWorktreePath.mockReturnValue(path.join(tempDir, 'worktree-TKT-001'));
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  test('shows usage when no arguments provided', async () => {
    await expect(planCommand([])).rejects.toThrow('process.exit');
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
  });

  test('exits if not in git repo', async () => {
    isGitRepository.mockReturnValueOnce(false);
    await expect(planCommand(['TKT-001'])).rejects.toThrow('process.exit');
    expect(mockConsoleError).toHaveBeenCalledWith('❌ Not in a git repository.');
  });

  test('dry run shows plan without creating worktrees', async () => {
    await planCommand(['TKT-001', '--dry-run']);
    expect(mockConsoleLog).toHaveBeenCalledWith('🏁 Dry run complete. No changes made.');
    expect(createWorktree).not.toHaveBeenCalled();
  });

  test('creates worktree and spawns agent for ticket', async () => {
    await planCommand(['TKT-001', '--no-install']);
    expect(createWorktree).toHaveBeenCalled();
    expect(childProcess.spawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['-p']),
      expect.objectContaining({ stdio: 'ignore', detached: true })
    );
  });

  test('handles --status=open filter', async () => {
    await planCommand(['--status=open', '--dry-run']);
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('TKT-001'));
  });

  test('errors on invalid ticket ID', async () => {
    await expect(planCommand(['INVALID'])).rejects.toThrow('process.exit');
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid ticket ID'));
  });

  test('errors when ticket not found', async () => {
    await expect(planCommand(['TKT-999'])).rejects.toThrow('process.exit');
    expect(mockConsoleError).toHaveBeenCalledWith('❌ Ticket TKT-999 not found.');
  });
});
