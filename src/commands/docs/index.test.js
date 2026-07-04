import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {
  createTempDir,
  cleanupTempDir,
  mockConsole,
  mockProcessCwd,
  mockProcessExit,
  createMockVibeProject
} from '../../utils/test-helpers.js';
import addDoc from './add.js';
import listDocs from './list.js';
import showDoc from './show.js';

function readFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return yaml.load(match[1]);
}

describe('docs command', () => {
  let tempDir;
  let consoleMock;
  let restoreCwd;
  let exitMock;

  beforeEach(() => {
    tempDir = createTempDir('docs-test');
    consoleMock = mockConsole();
    restoreCwd = mockProcessCwd(tempDir);
    exitMock = mockProcessExit();
    createMockVibeProject(tempDir);
  });

  afterEach(() => {
    consoleMock.restore();
    restoreCwd();
    exitMock.restore();
    cleanupTempDir(tempDir);
  });

  describe('add', () => {
    it('creates a DOC-001 file with correct frontmatter', async () => {
      await addDoc(['My First Guide']);

      const docsDir = path.join(tempDir, '.vibe', 'docs');
      const files = fs.readdirSync(docsDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^DOC-001-my-first-guide\.md$/);

      const fm = readFrontmatter(path.join(docsDir, files[0]));
      expect(fm.id).toBe('DOC-001');
      expect(fm.title).toBe('My First Guide');
      expect(fm.type).toBe('guide');
      expect(fm.status).toBe('draft');
    });

    it('assigns sequential IDs', async () => {
      await addDoc(['First']);
      await addDoc(['Second']);

      const docsDir = path.join(tempDir, '.vibe', 'docs');
      const ids = fs.readdirSync(docsDir).map(f => readFrontmatter(path.join(docsDir, f)).id).sort();
      expect(ids).toEqual(['DOC-001', 'DOC-002']);
    });

    it('selects the template for --type', async () => {
      await addDoc(['A Design', '--type', 'design-doc']);

      const docsDir = path.join(tempDir, '.vibe', 'docs');
      const file = fs.readdirSync(docsDir)[0];
      const content = fs.readFileSync(path.join(docsDir, file), 'utf-8');
      expect(readFrontmatter(path.join(docsDir, file)).type).toBe('design-doc');
      expect(content).toContain('## Proposed Design');
    });

    it('falls back to guide for an unknown type', async () => {
      await addDoc(['Weird', '--type', 'bogus']);

      const docsDir = path.join(tempDir, '.vibe', 'docs');
      const file = fs.readdirSync(docsDir)[0];
      expect(readFrontmatter(path.join(docsDir, file)).type).toBe('guide');
    });

    it('exits with an error when no title is given', async () => {
      await expect(addDoc([])).rejects.toThrow(/process.exit/);
      expect(exitMock.exitCalls).toContain(1);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await addDoc(['Alpha Guide']);
      await addDoc(['Beta Design', '--type', 'design-doc']);
    });

    it('lists all docs', () => {
      listDocs([]);
      const output = consoleMock.logs.log.join('\n');
      expect(output).toContain('DOC-001');
      expect(output).toContain('DOC-002');
      expect(output).toContain('Found 2 doc(s)');
    });

    it('filters by type', () => {
      listDocs(['--type', 'design-doc']);
      const output = consoleMock.logs.log.join('\n');
      expect(output).toContain('Beta Design');
      expect(output).toContain('Found 1 doc(s) (type: design-doc)');
      expect(output).not.toContain('Alpha Guide');
    });
  });

  describe('show', () => {
    it('prints a doc by id', async () => {
      await addDoc(['Show Me']);
      showDoc(['1']);
      const output = consoleMock.logs.log.join('\n');
      expect(output).toContain('id: DOC-001');
      expect(output).toContain('title: Show Me');
    });

    it('errors on a missing doc', () => {
      expect(() => showDoc(['999'])).toThrow(/process.exit/);
      expect(exitMock.exitCalls).toContain(1);
    });
  });
});
