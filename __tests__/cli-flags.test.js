import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);

describe('CLI --version and --help flags', () => {
  let originalArgv;
  let originalExit;
  let originalLog;
  let output;
  let exitCode;

  beforeEach(() => {
    originalArgv = process.argv;
    originalExit = process.exit;
    originalLog = console.log;
    output = [];
    exitCode = undefined;
    console.log = (...args) => output.push(args.join(' '));
    process.exit = (code) => { exitCode = code; };
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
    console.log = originalLog;
  });

  const run = async (flag) => {
    process.argv = ['node', 'index.js', flag];
    const { main } = await import('../index.js');
    await main();
  };

  it.each(['--version', '-v'])('prints the package version for %s', async (flag) => {
    await run(flag);
    expect(output.join('\n')).toContain(pkg.version);
    expect(exitCode).toBe(0);
  });

  it.each(['--help', '-h'])('prints help and command list for %s', async (flag) => {
    await run(flag);
    const text = output.join('\n');
    expect(text).toContain('VibeKit');
    expect(text).toContain('Available commands:');
    expect(exitCode).toBe(0);
  });
});
