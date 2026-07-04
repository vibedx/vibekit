import fs from 'fs';
import { spawn } from 'child_process';
import { getConfig } from '../../utils/index.js';
import { resolveDocId, parseDoc } from '../../utils/doc.js';
import { logger, spinner } from '../../utils/cli.js';

/**
 * Send a prompt to Claude via the native CLI and return the text result.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
function executeClaude(prompt) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    const child = spawn('claude', ['--print', '--output-format', 'json'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => { stdout += c; });
    child.stderr.on('data', (c) => { stderr += c; });
    child.on('error', (err) => reject(new Error(`Failed to spawn Claude: ${err.message}`)));
    child.on('close', (code) => {
      if (!stdout.trim()) {
        reject(new Error(stderr.trim() || `Claude exited with code ${code}`));
        return;
      }
      try {
        const envelope = JSON.parse(stdout.trim());
        if (envelope.is_error) {
          reject(new Error(envelope.result || 'Claude reported an error'));
          return;
        }
        const text = (envelope.result ?? '').trim();
        if (!text) {
          reject(new Error('Claude returned an empty result'));
          return;
        }
        resolve(text);
      } catch {
        reject(new Error('Claude returned non-JSON output'));
      }
    });

    child.stdin.write(prompt, 'utf8');
    child.stdin.end();
  });
}

/**
 * Strip a leading markdown code fence if Claude wrapped the body.
 * @param {string} text
 * @returns {string}
 */
function stripCodeFence(text) {
  const match = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/);
  return match ? match[1] : text;
}

function buildPrompt(metadata, body) {
  const title = metadata.title || 'Untitled';
  const type = metadata.type || 'guide';
  return `You are a senior technical writer improving a project document.

Document title: ${title}
Document type: ${type}

Current body (markdown, everything after the YAML frontmatter):
---
${body}
---

INSTRUCTIONS:
1. Improve and expand the document body. Fill in empty sections and replace HTML comment placeholders (<!-- ... -->) with real, useful content inferred from the title, type, and surrounding context.
2. Keep the existing section headings (## ...). You may add sub-sections where helpful.
3. Use developer-friendly formatting: \`code\`, code blocks, file paths, and lists.
4. Respond with ONLY the improved markdown body — no frontmatter, no explanation, no surrounding code fences.`;
}

/**
 * `vibe docs refine <id>` — AI pass that improves and writes back the doc body.
 * @param {string[]} args
 */
async function refineDoc(args) {
  try {
    const input = args[0];
    if (!input) {
      throw new Error('Please provide a doc ID. Usage: vibe docs refine <id>');
    }

    const config = getConfig();
    if (!config.ai?.enabled) {
      throw new Error('AI is not enabled. Run "vibe link" first.');
    }

    const docInfo = resolveDocId(input);
    if (!docInfo) {
      throw new Error(`Doc ${input} not found. Use "vibe docs list" to see available docs.`);
    }

    const doc = parseDoc(docInfo.path);
    logger.info(`Refining ${docInfo.id} — ${doc.metadata.title || 'Untitled'}`);

    const body = doc.contentLines.join('\n').trim();
    const prompt = buildPrompt(doc.metadata, body);

    const loading = spinner('🤖 Refining document...');
    let result;
    try {
      result = await executeClaude(prompt);
      loading.succeed('Refinement complete!');
    } catch (error) {
      loading.fail('Refinement failed');
      throw error;
    }

    const newBody = stripCodeFence(result).trim();

    const timestamp = new Date().toISOString().split('T')[0];
    const yamlLines = doc.yamlLines.map(line =>
      line.startsWith('updated_at:') ? `updated_at: ${timestamp}` : line
    );

    const reconstructed = ['---', ...yamlLines, '---', '', newBody, ''].join('\n');
    fs.writeFileSync(docInfo.path, reconstructed, 'utf-8');

    logger.success(`${docInfo.id} refined and updated.`);
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

export default refineDoc;
