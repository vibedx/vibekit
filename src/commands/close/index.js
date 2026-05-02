import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getTicketsDir } from '../../utils/index.js';
import { removeWorktree, getGitStatus } from '../../utils/git.js';
import { execSync } from 'child_process';

/**
 * Mark a ticket as done
 * @param {string[]} args Command arguments
 */
function closeCommand(args) {
  const ticketArg = args[0];
  const forceFlag = args.includes('--force') || args.includes('-f');

  if (!ticketArg) {
    console.error("❌ Please provide a ticket ID or number.");
    process.exit(1);
  }

  const ticketFolder = getTicketsDir();

  if (!fs.existsSync(ticketFolder)) {
    console.error(`❌ Tickets directory not found: ${ticketFolder}`);
    process.exit(1);
  }

  const files = fs.readdirSync(ticketFolder);
  const normalizedInput = ticketArg.startsWith("TKT-")
    ? ticketArg
    : `TKT-${ticketArg.padStart(3, "0")}`;

  let matchFound = false;

  for (const file of files) {
    const fullPath = path.join(ticketFolder, file);

    if (fs.statSync(fullPath).isDirectory()) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    const match = content.match(/^---\n([\s\S]*?)\n---/);

    if (match) {
      const frontmatter = yaml.load(match[1]);
      if (
        frontmatter.id === normalizedInput ||
        file.includes(normalizedInput)
      ) {
        // Clean up worktree if one exists
        if (frontmatter.worktree_path) {
          const wtPath = frontmatter.worktree_path;
          if (fs.existsSync(wtPath)) {
            try {
              // Check for uncommitted changes in the worktree
              const wtStatus = execSync(`git -C "${wtPath}" status --porcelain`, { encoding: 'utf-8' }).trim();
              if (wtStatus && !forceFlag) {
                console.error(`❌ Worktree at ${wtPath} has uncommitted changes.`);
                console.error(`   Use --force to remove it anyway, or commit/stash changes first.`);
                process.exit(1);
              }
              removeWorktree(wtPath, forceFlag);
              console.log(`🗑️  Removed worktree: ${wtPath}`);
            } catch (error) {
              console.warn(`⚠️  Could not remove worktree: ${error.message}`);
            }
          }
          // Prune stale worktree entries
          try {
            execSync('git worktree prune', { stdio: 'ignore' });
          } catch (error) {
            // Ignore prune errors
          }
        }

        frontmatter.status = "done";
        delete frontmatter.worktree_path;

        const updated = `---\n${yaml.dump(frontmatter)}---${content.split("---").slice(2).join("---")}`;
        fs.writeFileSync(fullPath, updated, "utf-8");

        console.log(`✅ Ticket ${frontmatter.id} marked as done.`);
        matchFound = true;
        break;
      }
    }
  }

  if (!matchFound) {
    console.log(`❌ No ticket matching '${ticketArg}' found.`);
  }
}

export default closeCommand;
