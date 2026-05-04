import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SKILL_PACKAGE = 'vibedx/vibekit';

function runVibeLink() {
  const hasVibeDir = fs.existsSync(path.join(process.cwd(), '.vibe'));
  if (!hasVibeDir) {
    console.log('\n💡 No .vibe/ directory found. Run "vibe init" then "vibe link" to complete setup.');
    return;
  }

  console.log('\n🔗 Running post-install: vibe link\n');
  try {
    execSync('vibe link', { stdio: 'inherit' });
  } catch {
    try {
      execSync('npx @vibedx/vibekit link', { stdio: 'inherit' });
    } catch {
      console.log('\n💡 To complete setup, run: vibe link');
    }
  }
}

export default function skillsCommand(args) {
  const subcommand = args[0] || 'add';

  if (subcommand === 'add' || subcommand === 'install') {
    const target = args[1] || SKILL_PACKAGE;
    console.log(`📦 Installing skill: ${target}\n`);
    try {
      execSync(`npx skills add ${target}`, { stdio: 'inherit' });
    } catch {
      console.error('\n❌ Failed to install skill. Make sure npx is available.');
      process.exit(1);
    }

    if (target === SKILL_PACKAGE) {
      runVibeLink();
    }
  } else if (subcommand === 'remove' || subcommand === 'uninstall') {
    const target = args[1] || SKILL_PACKAGE;
    console.log(`🗑️  Removing skill: ${target}\n`);
    try {
      execSync(`npx skills remove ${target}`, { stdio: 'inherit' });
    } catch {
      console.error('\n❌ Failed to remove skill.');
      process.exit(1);
    }
  } else if (subcommand === 'list' || subcommand === 'ls') {
    try {
      execSync('npx skills list', { stdio: 'inherit' });
    } catch {
      console.error('❌ Failed to list skills.');
      process.exit(1);
    }
  } else {
    console.log('Usage: vibe skills [command]\n');
    console.log('Commands:');
    console.log('  add [package]      Install a skill (default: vibedx/vibekit)');
    console.log('  remove [package]   Remove a skill');
    console.log('  list               List installed skills');
  }
}
