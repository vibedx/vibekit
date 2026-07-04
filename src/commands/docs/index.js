import { logger } from '../../utils/cli.js';
import addDoc from './add.js';
import listDocs from './list.js';
import refineDoc from './refine.js';
import showDoc from './show.js';

const SUBCOMMANDS = {
  add: addDoc,
  list: listDocs,
  refine: refineDoc,
  show: showDoc
};

function showHelp() {
  console.log(`\n📚 vibe docs — project documentation\n`);
  console.log('Usage: vibe docs <subcommand> [options]\n');
  console.log('Subcommands:');
  console.log('  add "title" [--type guide|design-doc|code-doc|faq] [--edit]   Create a new doc');
  console.log('  list [--type <type>] [--status <status>] [--tag <tag>]        List docs');
  console.log('  show <id>                                                     Print a doc to stdout');
  console.log('  refine <id>                                                   AI refinement pass\n');
}

/**
 * `vibe docs` entry point — routes to subcommands.
 * @param {string[]} args - Command arguments
 */
async function docsCommand(args = []) {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    showHelp();
    return;
  }

  const handler = SUBCOMMANDS[subcommand];

  if (!handler) {
    logger.error(`Unknown docs subcommand: ${subcommand}`);
    showHelp();
    process.exit(1);
  }

  await handler(rest);
}

export default docsCommand;
