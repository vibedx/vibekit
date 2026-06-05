import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

let ticketIdCounter = 1;
jest.unstable_mockModule('../../utils/index.js', () => ({
  getTicketsDir: jest.fn(),
  getConfig: jest.fn(() => ({})),
  createSlug: jest.fn(title => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')),
  getNextTicketId: jest.fn(() => `TKT-${String(ticketIdCounter++).padStart(3, '0')}`)
}));

const mockChild = {
  stdout: { on: jest.fn() },
  stderr: { on: jest.fn() },
  stdin: { write: jest.fn(), end: jest.fn() },
  on: jest.fn()
};

jest.unstable_mockModule('child_process', () => ({
  spawn: jest.fn(() => mockChild)
}));

const { default: toTicketCommand } = await import('./to-ticket.js');
const { getTicketsDir } = await import('../../utils/index.js');
const childProcess = await import('child_process');

const PLAN_CONTENT = `# Feature Plan

## Goals
- Build a login page
- Add a settings page
`;

const CLAUDE_TICKETS = {
  tickets: [
    {
      title: 'Build login page',
      description: 'Create the login form',
      acceptance_criteria: ['Form renders', 'Submits credentials'],
      priority: 'high',
      estimated_hours: 4
    },
    {
      title: 'Add settings page',
      description: 'User settings screen',
      acceptance_criteria: ['Settings persist'],
      priority: 'medium',
      estimated_hours: 2
    }
  ]
};

// Drive the mocked Claude process: feed it a JSON envelope and close.
function primeClaude(resultObj, { isError = false } = {}) {
  const envelope = JSON.stringify({
    is_error: isError,
    result: isError ? 'boom' : JSON.stringify(resultObj)
  });

  mockChild.stdout.on.mockImplementation((event, cb) => {
    if (event === 'data') cb(Buffer.from(envelope));
  });
  mockChild.stderr.on.mockImplementation(() => {});
  mockChild.on.mockImplementation((event, cb) => {
    if (event === 'close') cb(0);
  });
}

describe('plan to-ticket command', () => {
  let tempDir;
  let ticketsDir;
  let planFile;
  let mockExit;
  let mockConsoleLog;
  let mockConsoleError;

  beforeEach(() => {
    ticketIdCounter = 1;
    tempDir = fs.mkdtempSync(path.join('/tmp', 'vibe-to-ticket-'));
    ticketsDir = path.join(tempDir, '.vibe', 'tickets');
    fs.mkdirSync(ticketsDir, { recursive: true });
    planFile = path.join(tempDir, 'plan.md');
    fs.writeFileSync(planFile, PLAN_CONTENT);

    getTicketsDir.mockReturnValue(ticketsDir);
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  test('errors when plan file is missing', async () => {
    await expect(toTicketCommand(['/tmp/does-not-exist.md'])).rejects.toThrow('process.exit');
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Plan file not found'));
  });

  test('dry-run extracts tickets without creating files', async () => {
    primeClaude(CLAUDE_TICKETS);
    await expect(toTicketCommand([planFile, '--dry-run'])).rejects.toThrow('process.exit');
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Dry run complete'));
    expect(fs.readdirSync(ticketsDir)).toHaveLength(0);
  });

  test('preview (no --auto) does not create tickets', async () => {
    primeClaude(CLAUDE_TICKETS);
    await expect(toTicketCommand([planFile])).rejects.toThrow('process.exit');
    expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('--auto'));
    expect(fs.readdirSync(ticketsDir)).toHaveLength(0);
  });

  test('--auto creates one ticket file per extracted item', async () => {
    primeClaude(CLAUDE_TICKETS);
    await toTicketCommand([planFile, '--auto']);
    const files = fs.readdirSync(ticketsDir).sort();
    expect(files).toEqual([
      'TKT-001-build-login-page.md',
      'TKT-002-add-settings-page.md'
    ].sort());

    const first = fs.readFileSync(path.join(ticketsDir, 'TKT-001-build-login-page.md'), 'utf-8');
    expect(first).toContain('id: TKT-001');
    expect(first).toContain('priority: high');
    expect(first).toContain('- [ ] Form renders');
  });

  test('surfaces Claude errors', async () => {
    primeClaude(null, { isError: true });
    await expect(toTicketCommand([planFile, '--auto'])).rejects.toThrow('process.exit');
    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  test('spawns claude with json output format', async () => {
    primeClaude(CLAUDE_TICKETS);
    await toTicketCommand([planFile, '--auto']);
    expect(childProcess.spawn).toHaveBeenCalledWith(
      'claude',
      expect.arrayContaining(['--print', '--output-format', 'json']),
      expect.any(Object)
    );
  });
});
