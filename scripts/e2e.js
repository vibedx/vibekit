#!/usr/bin/env node

/**
 * @fileoverview End-to-end integration tests for VibeKit CLI commands.
 * Runs all commands against the local index.js in a fresh isolated temp directory.
 *
 * Usage:
 *   node scripts/e2e.js
 *   npm run test:e2e
 *
 * Exit codes:
 *   0 — all tests passed
 *   1 — one or more tests failed
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INDEX_JS = path.resolve(__dirname, '..', 'index.js');

// ─── runner ───────────────────────────────────────────────────────────────────

/**
 * Run a vibe CLI command via node and return the result.
 * @param {string[]} args - Arguments to pass after `node index.js`
 * @param {Object} opts
 * @param {string} opts.cwd - Working directory for the command
 * @param {string} [opts.input] - stdin to pipe in
 * @param {number} [opts.timeout] - Timeout in ms (default: 15000)
 * @returns {{ stdout: string, stderr: string, exitCode: number }}
 */
function run(args, { cwd, input = null, timeout = 15000 } = {}) {
  const result = spawnSync('node', [INDEX_JS, ...args], {
    cwd,
    input,
    encoding: 'utf-8',
    timeout,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status ?? 1
  };
}

/**
 * Run a raw git command in the given directory.
 * @param {string[]} args
 * @param {string} cwd
 */
function git(args, cwd) {
  spawnSync('git', args, { cwd, encoding: 'utf-8' });
}

// ─── assertions ───────────────────────────────────────────────────────────────

/**
 * Assert the exit code matches the expected value.
 * @param {{ exitCode: number, stdout: string, stderr: string }} result
 * @param {number} expected
 */
function assertExitCode(result, expected) {
  if (result.exitCode !== expected) {
    throw new Error(
      `Expected exit code ${expected}, got ${result.exitCode}\n` +
      `stdout: ${result.stdout.trim()}\n` +
      `stderr: ${result.stderr.trim()}`
    );
  }
}

/**
 * Assert stdout or stderr contains the given substring.
 * @param {{ stdout: string, stderr: string }} result
 * @param {string} text
 */
function assertContains(result, text) {
  const combined = result.stdout + result.stderr;
  if (!combined.includes(text)) {
    throw new Error(
      `Expected output to contain "${text}"\n` +
      `stdout: ${result.stdout.trim()}\n` +
      `stderr: ${result.stderr.trim()}`
    );
  }
}

/**
 * Assert a file or directory exists at the given path.
 * @param {string} filePath
 */
function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected file/directory to exist: ${filePath}`);
  }
}

// ─── workspace lifecycle ─────────────────────────────────────────────────────

/**
 * Create an isolated temp workspace with git initialised.
 * @returns {string} Path to the temp directory
 */
function setupWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibekit-e2e-'));

  git(['-c', 'init.defaultBranch=main', 'init'], dir);
  git(['config', 'user.email', 'e2e@vibekit.test'], dir);
  git(['config', 'user.name', 'VibeKit E2E'], dir);
  git(['commit', '--allow-empty', '-m', 'init'], dir);

  return dir;
}

/**
 * Remove the temp workspace.
 * @param {string} dir
 */
function teardownWorkspace(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── test runner ─────────────────────────────────────────────────────────────

const results = [];

/**
 * Register and run a named test case, recording pass/fail.
 * @param {string} name
 * @param {Function} fn
 */
function test(name, fn) {
  try {
    fn();
    results.push({ name, passed: true });
  } catch (err) {
    results.push({ name, passed: false, error: err.message });
  }
}

/**
 * Print a results summary table and exit with the appropriate code.
 */
function printSummary() {
  const divider = '─'.repeat(58);

  console.log(`\n${divider}`);
  console.log('  VibeKit E2E Test Results');
  console.log(divider);

  for (const { name, passed, error } of results) {
    const icon = passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
    console.log(`  ${icon}  ${name}`);
    if (!passed) {
      error.split('\n').forEach(line => console.log(`        ${line}`));
    }
  }

  const passedCount = results.filter(r => r.passed).length;
  const total = results.length;

  console.log(divider);
  console.log(`  ${passedCount}/${total} passed`);
  console.log(`${divider}\n`);

  process.exit(passedCount === total ? 0 : 1);
}

// ─── test suite ───────────────────────────────────────────────────────────────

const tmpDir = setupWorkspace();
console.log(`\n  Workspace: ${tmpDir}`);

try {
  test('vibe init', () => {
    const r = run(['init'], { cwd: tmpDir });
    assertExitCode(r, 0);
    assertContains(r, 'initialized');
    assertFileExists(path.join(tmpDir, '.vibe/config.yml'));
    assertFileExists(path.join(tmpDir, '.vibe/.templates/default.md'));
  });

  test('vibe get-started', () => {
    const r = run(['get-started'], { cwd: tmpDir });
    assertExitCode(r, 0);
    const tickets = fs.readdirSync(path.join(tmpDir, '.vibe/tickets')).filter(f => f.endsWith('.md'));
    if (tickets.length === 0) throw new Error('Expected sample tickets to be created');
  });

  test('vibe new "E2E test ticket"', () => {
    const r = run(['new', 'E2E test ticket'], { cwd: tmpDir });
    assertExitCode(r, 0);
    assertContains(r, 'Created ticket');
    assertContains(r, 'TKT-');
  });

  test('vibe list', () => {
    const r = run(['list'], { cwd: tmpDir });
    assertExitCode(r, 0);
    assertContains(r, 'VibeKit Tickets');
    assertContains(r, 'TKT-');
  });

  test('vibe list --status=open', () => {
    const r = run(['list', '--status=open'], { cwd: tmpDir });
    assertExitCode(r, 0);
    assertContains(r, 'VibeKit Tickets');
  });

  test('vibe list --json exposes full fields and supports combined filters', () => {
    const title = 'An E2E ticket with a title longer than the table can display';
    assertExitCode(run(['new', title, '-n', '--assignee', 'Alice', '--author', 'Bob', '--priority', 'high'], { cwd: tmpDir }), 0);
    const r = run(['list', '--json', '--status', 'open', '--assignee=alice'], { cwd: tmpDir });
    assertExitCode(r, 0);
    const tickets = JSON.parse(r.stdout);
    if (tickets.length !== 1 || tickets[0].title !== title || tickets[0].assignee !== 'Alice' || tickets[0].author !== 'Bob' || tickets[0].priority !== 'high' || !tickets[0].file.endsWith('.md')) {
      throw new Error(`Unexpected JSON ticket fields: ${r.stdout}`);
    }
    const owner = run(['list', '--json', '--status=open', '--owner', 'ALICE'], { cwd: tmpDir });
    assertExitCode(owner, 0);
    if (JSON.stringify(JSON.parse(owner.stdout)) !== JSON.stringify(tickets)) throw new Error('Owner alias should return the same tickets');
    const all = run(['list', '--json'], { cwd: tmpDir });
    assertExitCode(all, 0);
    const ids = JSON.parse(all.stdout).map(t => Number(t.id.replace('TKT-', '')));
    if (ids.some((id, i) => i > 0 && id < ids[i - 1])) throw new Error('JSON tickets must be sorted numerically');
  });

  test('vibe list --json returns [] for unmatched filters and empty projects', () => {
    const unmatched = run(['list', '--json', '--owner=nobody'], { cwd: tmpDir });
    assertExitCode(unmatched, 0);
    if (JSON.stringify(JSON.parse(unmatched.stdout)) !== '[]') throw new Error('Expected empty JSON array');
    const emptyDir = setupWorkspace();
    try {
      assertExitCode(run(['init'], { cwd: emptyDir }), 0);
      const empty = run(['list', '--json'], { cwd: emptyDir });
      assertExitCode(empty, 0);
      if (JSON.stringify(JSON.parse(empty.stdout)) !== '[]') throw new Error('Expected empty JSON array');
    } finally {
      teardownWorkspace(emptyDir);
    }
  });

  test('vibe list rejects missing filter values instead of listing everything', () => {
    const r = run(['list', '--assignee', '--json'], { cwd: tmpDir });
    assertExitCode(r, 1);
    assertContains(r, 'requires a value');
  });

  test('vibe lint --fix', () => {
    const r = run(['lint', '--fix'], { cwd: tmpDir });
    assertContains(r, 'Summary');
  });

  test('vibe lint', () => {
    const r = run(['lint'], { cwd: tmpDir });
    assertExitCode(r, 0);
    assertContains(r, 'Files checked');
  });

  // Commit all vibe files so the repo is clean before vibe start
  git(['add', '-A'], tmpDir);
  git(['commit', '-m', 'chore: vibe project files'], tmpDir);

  test('vibe start TKT-001', () => {
    const r = run(['start', 'TKT-001'], { cwd: tmpDir });
    assertExitCode(r, 0);
    assertContains(r, 'TKT-001');
  });

  test('vibe close TKT-001', () => {
    const r = run(['close', 'TKT-001'], { cwd: tmpDir });
    assertExitCode(r, 0);
    assertContains(r, 'TKT-001');
  });

  test('vibe review --help', () => {
    const r = run(['review', '--help'], { cwd: tmpDir });
    assertExitCode(r, 0);
    assertContains(r, 'Usage:');
    assertContains(r, 'ticket-id');
  });

  test('vibe link (prompts to install Claude Code if not found)', () => {
    const r = run(['link'], { cwd: tmpDir, timeout: 8000 });
    // Link command may succeed (if Claude Code is installed) or fail gracefully (if not)
    // Check that it provides helpful guidance in either case
    assertContains(r, 'Linking VibeKit to Claude Code');
    if (r.exitCode === 0) {
      assertContains(r, 'linked successfully');
    } else {
      assertContains(r, 'Claude Code CLI not found');
      assertContains(r, 'npm install -g @anthropic-ai/claude-code');
    }
  });

  test('vibe refine (gracefully handles disabled AI)', () => {
    const r = run(['refine', '1'], { cwd: tmpDir, input: '4\n', timeout: 8000 });
    // Refine should either work (if AI is enabled) or show error message (if not)
    const output = r.stdout + r.stderr;
    if (!output.includes('AI is not enabled')) {
      assertContains(r, 'Analyzing ticket');
    } else {
      assertContains(r, 'AI is not enabled');
    }
  });

} finally {
  teardownWorkspace(tmpDir);
}

printSummary();
