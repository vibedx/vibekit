import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getProjectRoot } from './index.js';

const DEFAULT_DOCS_PATH = '.vibe/docs';

/**
 * Get the docs directory from config or default.
 * @returns {string} Absolute path to the docs directory
 */
export function getDocsDir() {
  const root = getProjectRoot();
  const configPath = path.join(root, '.vibe', 'config.yml');
  let docsPath = DEFAULT_DOCS_PATH;

  try {
    if (fs.existsSync(configPath)) {
      const config = yaml.load(fs.readFileSync(configPath, 'utf-8')) || {};
      if (config.docs?.path && typeof config.docs.path === 'string') {
        docsPath = config.docs.path;
      }
    }
  } catch (error) {
    console.error(`❌ Error reading config: ${error.message}`);
  }

  return path.resolve(root, docsPath);
}

/**
 * Generate the next doc ID (DOC-NNN), independent from ticket IDs.
 * @returns {string} Next doc ID, e.g. "DOC-002"
 */
export function getNextDocId() {
  const docsDir = getDocsDir();

  if (!fs.existsSync(docsDir)) {
    return 'DOC-001';
  }

  try {
    const numbers = fs.readdirSync(docsDir)
      .filter(f => f.endsWith('.md'))
      .map(f => f.match(/^DOC-(\d+)/))
      .filter(Boolean)
      .map(match => parseInt(match[1], 10))
      .filter(num => !isNaN(num) && num > 0);

    const next = Math.max(0, ...numbers) + 1;
    return `DOC-${String(next).padStart(3, '0')}`;
  } catch (error) {
    console.error(`❌ Error scanning docs directory: ${error.message}`);
    return 'DOC-001';
  }
}

/**
 * Resolve a doc identifier (1, 001, DOC-1, DOC-001) to its file.
 * @param {string|number} input - The doc identifier
 * @returns {Object|null} { id, file, path } or null if not found
 * @throws {Error} If the input format is invalid
 */
export function resolveDocId(input) {
  if (!input && input !== 0) {
    return null;
  }

  const docsDir = getDocsDir();

  if (!fs.existsSync(docsDir)) {
    return null;
  }

  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

  let clean = input.toString().trim().toUpperCase();
  if (clean.startsWith('DOC-')) {
    clean = clean.replace('DOC-', '');
  }

  if (!/^\d+$/.test(clean)) {
    throw new Error(`Invalid doc ID format: ${input}. Expected numeric ID or DOC-XXX format.`);
  }

  const fullId = `DOC-${clean.padStart(3, '0')}`;
  const matchingFile = files.find(file => file.startsWith(fullId));

  if (matchingFile) {
    return {
      id: fullId,
      file: matchingFile,
      path: path.join(docsDir, matchingFile)
    };
  }

  return null;
}

/**
 * Parse a doc markdown file, splitting frontmatter and content.
 * @param {string} filePath - Path to the doc file
 * @returns {Object} { metadata, yamlLines, contentLines, fullContent, filePath }
 * @throws {Error} If the file is missing or malformed
 */
export function parseDoc(filePath) {
  if (typeof filePath !== 'string') {
    throw new Error('File path must be a string');
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Doc file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  if (!content.trim()) {
    throw new Error('Doc file is empty');
  }

  const lines = content.split('\n');

  if (lines[0] !== '---') {
    throw new Error('Invalid doc format: missing opening frontmatter delimiter (---)');
  }

  const yamlEndIndex = lines.findIndex((line, index) => index > 0 && line === '---');
  if (yamlEndIndex === -1) {
    throw new Error('Invalid doc format: missing closing frontmatter delimiter (---)');
  }

  const yamlLines = lines.slice(1, yamlEndIndex);
  const contentLines = lines.slice(yamlEndIndex + 1);
  const metadata = yaml.load(yamlLines.join('\n')) || {};

  return { metadata, yamlLines, contentLines, fullContent: content, filePath };
}
