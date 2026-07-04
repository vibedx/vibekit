import fs from 'fs';
import { resolveDocId } from '../../utils/doc.js';
import { logger } from '../../utils/cli.js';

/**
 * `vibe docs show <id>` — print a doc to stdout.
 * @param {string[]} args
 */
function showDoc(args) {
  try {
    const input = args[0];
    if (!input) {
      throw new Error('Please provide a doc ID. Usage: vibe docs show <id>');
    }

    const docInfo = resolveDocId(input);
    if (!docInfo) {
      throw new Error(`Doc ${input} not found. Use "vibe docs list" to see available docs.`);
    }

    console.log(fs.readFileSync(docInfo.path, 'utf-8'));
  } catch (error) {
    logger.error(error.message);
    process.exit(1);
  }
}

export default showDoc;
