import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  createTempDir,
  cleanupTempDir,
  mockConsole,
  mockProcessCwd,
  createMockVibeProject
} from './test-helpers.js';
import { getNextDocId, resolveDocId, parseDoc, getDocsDir } from './doc.js';

function writeDoc(docsDir, id, slug, extra = '') {
  fs.mkdirSync(docsDir, { recursive: true });
  const content = `---
id: ${id}
title: ${slug}
type: guide
status: draft
tags: []
---

## Overview
${extra}
`;
  fs.writeFileSync(path.join(docsDir, `${id}-${slug}.md`), content, 'utf-8');
}

describe('doc utils', () => {
  let tempDir;
  let consoleMock;
  let restoreCwd;

  beforeEach(() => {
    tempDir = createTempDir('doc-util-test');
    consoleMock = mockConsole();
    restoreCwd = mockProcessCwd(tempDir);
    createMockVibeProject(tempDir);
  });

  afterEach(() => {
    consoleMock.restore();
    restoreCwd();
    cleanupTempDir(tempDir);
  });

  describe('getDocsDir', () => {
    it('defaults to .vibe/docs', () => {
      expect(getDocsDir()).toBe(path.join(tempDir, '.vibe', 'docs'));
    });
  });

  describe('getNextDocId', () => {
    it('returns DOC-001 when no docs exist', () => {
      expect(getNextDocId()).toBe('DOC-001');
    });

    it('increments based on existing docs', () => {
      const docsDir = path.join(tempDir, '.vibe', 'docs');
      writeDoc(docsDir, 'DOC-001', 'first');
      writeDoc(docsDir, 'DOC-002', 'second');
      expect(getNextDocId()).toBe('DOC-003');
    });

    it('is independent from ticket IDs', () => {
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      fs.writeFileSync(path.join(ticketsDir, 'TKT-042-x.md'), '---\nid: TKT-042\n---\n');
      expect(getNextDocId()).toBe('DOC-001');
    });
  });

  describe('resolveDocId', () => {
    beforeEach(() => {
      writeDoc(path.join(tempDir, '.vibe', 'docs'), 'DOC-001', 'first');
    });

    it('resolves a bare number', () => {
      expect(resolveDocId('1').id).toBe('DOC-001');
    });

    it('resolves a full DOC- id', () => {
      expect(resolveDocId('DOC-001').id).toBe('DOC-001');
    });

    it('returns null for a missing doc', () => {
      expect(resolveDocId('999')).toBeNull();
    });

    it('throws on invalid format', () => {
      expect(() => resolveDocId('abc')).toThrow(/Invalid doc ID/);
    });
  });

  describe('parseDoc', () => {
    it('splits frontmatter and content', () => {
      const docsDir = path.join(tempDir, '.vibe', 'docs');
      writeDoc(docsDir, 'DOC-001', 'first', 'Body text');
      const parsed = parseDoc(path.join(docsDir, 'DOC-001-first.md'));
      expect(parsed.metadata.id).toBe('DOC-001');
      expect(parsed.metadata.type).toBe('guide');
      expect(parsed.contentLines.join('\n')).toContain('## Overview');
    });

    it('throws on missing frontmatter', () => {
      const docsDir = path.join(tempDir, '.vibe', 'docs');
      fs.mkdirSync(docsDir, { recursive: true });
      const p = path.join(docsDir, 'DOC-009-bad.md');
      fs.writeFileSync(p, 'no frontmatter here', 'utf-8');
      expect(() => parseDoc(p)).toThrow(/frontmatter/);
    });
  });
});
