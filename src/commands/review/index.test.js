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
import reviewCommand from './index.js';

/** Creates a minimal valid ticket file in the tickets directory */
function createMockTicket(ticketsDir, id = 'TKT-001', status = 'in_progress') {
  const content = `---
id: ${id}
title: Test Ticket
slug: ${id.toLowerCase()}-test-ticket
status: ${status}
priority: medium
created_at: 2026-01-01T00:00:00.000Z
updated_at: 2026-01-01T00:00:00.000Z
---

## Description

Test ticket description.

## Acceptance Criteria

- [ ] Criterion one

## Implementation Notes

Some notes.

## Testing & Test Cases

Some tests.
`;
  fs.writeFileSync(path.join(ticketsDir, `${id}-test-ticket.md`), content, 'utf-8');
}

/** Runs a review command and swallows the process.exit() throw */
async function runReview(args) {
  try {
    await reviewCommand(args);
  } catch (err) {
    if (!err.message.startsWith('process.exit(')) throw err;
  }
}

describe('review command', () => {
  let tempDir;
  let consoleMock;
  let restoreCwd;
  let exitMock;
  let ticketsDir;

  beforeEach(() => {
    tempDir = createTempDir('review-test');
    consoleMock = mockConsole();
    restoreCwd = mockProcessCwd(tempDir);
    exitMock = mockProcessExit();

    const { ticketsDir: td } = createMockVibeProject(tempDir);
    ticketsDir = td;
    createMockTicket(ticketsDir);
  });

  afterEach(() => {
    consoleMock.restore();
    restoreCwd();
    exitMock.restore();
    cleanupTempDir(tempDir);
  });

  describe('help', () => {
    it('should display help with --help flag', async () => {
      await reviewCommand(['--help']);

      expect(consoleMock.logs.log.some(m => m.includes('vibe review'))).toBe(true);
      expect(consoleMock.logs.log.some(m => m.includes('Usage:'))).toBe(true);
    });

    it('should display help with -h flag', async () => {
      await reviewCommand(['-h']);

      expect(consoleMock.logs.log.some(m => m.includes('vibe review'))).toBe(true);
    });
  });

  describe('clean subcommand', () => {
    it('should report no cache files when cache is empty', async () => {
      await reviewCommand(['clean']);

      expect(consoleMock.logs.log.some(m => m.includes('No review cache files to clean'))).toBe(true);
    });

    it('should report no cache files for a specific ticket when base cache dir is missing', async () => {
      await reviewCommand(['clean', 'TKT-001']);

      expect(consoleMock.logs.log.some(m => m.includes('No review cache files to clean'))).toBe(true);
    });

    it('should report no cache files for specific ticket when base cache exists but ticket dir missing', async () => {
      // Create the base cache dir but not the TKT-001 subdirectory
      fs.mkdirSync(path.join(tempDir, '.vibe/.cache/review/logs'), { recursive: true });

      await reviewCommand(['clean', 'TKT-001']);

      expect(consoleMock.logs.log.some(m => m.includes('No cache files found for ticket TKT-001'))).toBe(true);
    });

    it('should clean existing cache files for a specific ticket', async () => {
      const cacheDir = path.join(tempDir, '.vibe/.cache/review/logs/TKT-001');
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(path.join(cacheDir, 'review-2026-01-01T00-00-00.txt'), 'test content');

      await reviewCommand(['clean', 'TKT-001']);

      expect(consoleMock.logs.log.some(m => m.includes('Cleaned'))).toBe(true);
      expect(fs.existsSync(cacheDir)).toBe(false);
    });

    it('should normalise a numeric ticket ID for clean', async () => {
      fs.mkdirSync(path.join(tempDir, '.vibe/.cache/review/logs'), { recursive: true });

      await reviewCommand(['clean', '1']);

      expect(consoleMock.logs.log.some(m => m.includes('No cache files found for ticket TKT-001'))).toBe(true);
    });
  });

  describe('ticket ID validation', () => {
    it('should reject an invalid ticket ID format', async () => {
      await runReview(['invalid-id']);

      expect(consoleMock.logs.error.some(m => m.includes('Invalid ticket ID format'))).toBe(true);
      expect(exitMock.exitCalls).toContain(1);
    });

    it('should reject a ticket that does not exist', async () => {
      await runReview(['TKT-999']);

      expect(consoleMock.logs.error.some(m => m.includes('Ticket not found: TKT-999'))).toBe(true);
      expect(exitMock.exitCalls).toContain(1);
    });

    it('should pass validation for an existing TKT-001', async () => {
      await runReview(['TKT-001']);

      const errors = consoleMock.logs.error.join(' ');
      expect(errors).not.toContain('Invalid ticket ID format');
      expect(errors).not.toContain('Ticket not found');
    });

    it('should accept a numeric shorthand and normalise it', async () => {
      await runReview(['1']);

      const errors = consoleMock.logs.error.join(' ');
      expect(errors).not.toContain('Invalid ticket ID format');
      expect(errors).not.toContain('Ticket not found');
    });
  });

  describe('ticket ID normalisation logic', () => {
    const normalize = (input) => {
      if (!input || typeof input !== 'string') return null;
      const s = input.trim().toUpperCase();
      if (!s || s.length > 20) return null;
      if (/^\d+$/.test(s)) {
        const n = parseInt(s, 10);
        if (n < 1 || n > 999) return null;
        return `TKT-${s.padStart(3, '0')}`;
      }
      if (/^TKT-\d{3}$/.test(s)) {
        const n = parseInt(s.substring(4), 10);
        return n >= 1 && n <= 999 ? s : null;
      }
      return null;
    };

    it('normalises single digit to TKT-001', () => expect(normalize('1')).toBe('TKT-001'));
    it('normalises two digits to TKT-011', () => expect(normalize('11')).toBe('TKT-011'));
    it('normalises three digits to TKT-111', () => expect(normalize('111')).toBe('TKT-111'));
    it('accepts already-valid TKT-XXX', () => expect(normalize('TKT-001')).toBe('TKT-001'));
    it('rejects invalid strings', () => expect(normalize('invalid')).toBeNull());
    it('rejects null input', () => expect(normalize(null)).toBeNull());
    it('rejects out-of-range zero', () => expect(normalize('0')).toBeNull());
  });
});
