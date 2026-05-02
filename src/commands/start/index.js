import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getTicketsDir, getConfig, createSlug } from '../../utils/index.js';
import {
  isGitRepository,
  getCurrentBranch,
  branchExistsLocally,
  branchExistsRemotely,
  createAndCheckoutBranch,
  checkoutBranch,
  getGitStatus,
  getRepoName,
  getWorktreePath,
  createWorktree,
  createWorktreeExistingBranch
} from '../../utils/git.js';

/**
 * Start working on a ticket by checking out its branch
 * @param {string[]} args Command arguments
 */
function startCommand(args) {
  // Check if we're in a git repository
  if (!isGitRepository()) {
    console.error('❌ Not in a git repository. Please run this command from within a git repository.');
    process.exit(1);
  }
  
  // Parse arguments
  if (args.length === 0) {
    console.error('❌ Please provide a ticket ID (e.g., vibe start TKT-006)');
    process.exit(1);
  }
  
  // Extract ticket ID and options
  let ticketId = args[0];
  let baseBranch = null;
  let updateStatus = true;
  let useWorktree = false;

  // Process additional arguments
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--base' && i + 1 < args.length) {
      baseBranch = args[i + 1];
      i++;
    } else if (args[i] === '--update-status' || args[i] === '-u') {
      updateStatus = true;
    } else if (args[i] === '--worktree' || args[i] === '-w') {
      useWorktree = true;
    }
  }
  
  // Normalize ticket ID format (add TKT- prefix if not present)
  if (!ticketId.startsWith('TKT-')) {
    // Check if it's just a number
    if (/^\d+$/.test(ticketId)) {
      ticketId = `TKT-${ticketId.padStart(3, '0')}`;
    } else {
      console.error('❌ Invalid ticket ID format. Expected TKT-XXX or just the number.');
      process.exit(1);
    }
  }
  
  // Get configuration
  const config = getConfig();
  const ticketsDir = getTicketsDir();
  
  // Check if the ticket exists
  const ticketFiles = fs.readdirSync(ticketsDir).filter(file => file.startsWith(`${ticketId}-`));
  
  if (ticketFiles.length === 0) {
    console.error(`❌ Ticket ${ticketId} not found.`);
    process.exit(1);
  }
  
  const ticketFile = ticketFiles[0];
  const ticketPath = path.join(ticketsDir, ticketFile);
  
  // Read the ticket content to get the title and slug
  const ticketContent = fs.readFileSync(ticketPath, 'utf-8');
  const titleMatch = ticketContent.match(/title: (.+)/);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  // Look for the slug in the frontmatter
  const slugMatch = ticketContent.match(/slug: (.+)/);
  let slug;
  
  if (slugMatch && slugMatch[1].trim()) {
    // Use the slug from the ticket file
    slug = slugMatch[1].trim();
  } else {
    // Generate a slug from the title as fallback
    slug = `${ticketId}-${createSlug(title)}`;
    console.log(`⚠️  No slug found in ticket. Generated slug: ${slug}`);
    
    // Update the ticket with the generated slug
    try {
      let updatedContent = ticketContent;
      if (updatedContent.includes('slug:')) {
        updatedContent = updatedContent.replace(/slug:.*/, `slug: ${slug}`);
      } else {
        updatedContent = updatedContent.replace(/---/, `---\nslug: ${slug}`);
      }
      
      fs.writeFileSync(ticketPath, updatedContent, 'utf-8');
      console.log(`✅ Updated ticket with slug: ${slug}`);
    } catch (error) {
      console.error(`❌ Failed to update ticket with slug: ${error.message}`);
    }
  }
  
  // Get branch prefix from config or use default (empty)
  const branchPrefix = config.git?.branch_prefix || '';
  
  // Create branch name - if slug already contains the ticket ID, don't add it again
  const branchName = slug.includes(ticketId) 
    ? `${branchPrefix}${slug}` 
    : `${branchPrefix}${ticketId}-${slug}`;
  
  if (useWorktree) {
    const repoName = getRepoName();
    const worktreePath = getWorktreePath(repoName, branchName);

    if (fs.existsSync(worktreePath)) {
      console.log(`🔍 Worktree already exists at: ${worktreePath}`);
      console.log(`✅ Ready to work in: ${worktreePath}`);
    } else {
      const branchExistsLocal = branchExistsLocally(branchName);
      const branchExistsRemote = branchExistsRemotely(branchName);

      try {
        if (branchExistsLocal || branchExistsRemote) {
          console.log(`🔍 Creating worktree for existing branch: ${branchName}`);
          createWorktreeExistingBranch(worktreePath, branchName);
        } else {
          console.log(`🔍 Creating worktree with new branch: ${branchName}`);
          createWorktree(worktreePath, branchName, baseBranch);
        }
        console.log(`✅ Worktree created at: ${worktreePath}`);
      } catch (error) {
        console.error(`❌ Failed to create worktree: ${error.message}`);
        process.exit(1);
      }
    }

    // Store worktree_path in ticket frontmatter
    try {
      const currentContent = fs.readFileSync(ticketPath, 'utf-8');
      const now = new Date().toISOString();
      let updatedContent = currentContent;

      if (updatedContent.match(/^worktree_path: .+$/m)) {
        updatedContent = updatedContent.replace(/^worktree_path: .+$/m, `worktree_path: "${worktreePath}"`);
      } else {
        updatedContent = updatedContent.replace(/^(updated_at: .+)$/m, `$1\nworktree_path: "${worktreePath}"`);
      }

      if (updateStatus) {
        updatedContent = updatedContent
          .replace(/^status: (.+)$/m, 'status: in_progress')
          .replace(/^updated_at: (.+)$/m, `updated_at: "${now}"`);
      }

      fs.writeFileSync(ticketPath, updatedContent, 'utf-8');
      if (updateStatus) {
        console.log(`✅ Updated ticket status to: in_progress`);
      }
    } catch (error) {
      console.error(`❌ Failed to update ticket: ${error.message}`);
    }

    console.log('');
    console.log(`🎯 Now working on: ${ticketId} - ${title}`);
    console.log(`🌿 Branch: ${branchName}`);
    console.log(`📂 Worktree: ${worktreePath}`);
    console.log('');
    console.log('To start working in the worktree:');
    console.log(`  cd ${worktreePath}`);
    console.log('');
    console.log('💡 Run `npm install` in the worktree to install dependencies.');
  } else {
    // Check if there are uncommitted changes
    const gitStatus = getGitStatus();
    if (gitStatus) {
      console.warn('⚠️  You have uncommitted changes. Stash or commit them before switching branches.');
      console.log('');
    }

    // Check if the branch already exists
    const branchExistsLocal = branchExistsLocally(branchName);
    const branchExistsRemote = branchExistsRemotely(branchName);

    if (branchExistsLocal || branchExistsRemote) {
      console.log(`🔍 Branch ${branchName} already exists.`);

      if (checkoutBranch(branchName)) {
        console.log(`✅ Switched to branch: ${branchName}`);
      } else {
        console.error(`❌ Failed to switch to branch: ${branchName}`);
        process.exit(1);
      }
    } else {
      console.log(`🔍 Creating new branch: ${branchName}`);

      if (createAndCheckoutBranch(branchName, baseBranch)) {
        console.log(`✅ Created and switched to branch: ${branchName}`);
      } else {
        console.error(`❌ Failed to create branch: ${branchName}`);
        process.exit(1);
      }
    }

    // Update ticket status if requested
    if (updateStatus) {
      try {
        const currentContent = fs.readFileSync(ticketPath, 'utf-8');
        const now = new Date().toISOString();

        let updatedContent = currentContent
          .replace(/^status: (.+)$/m, 'status: in_progress')
          .replace(/^updated_at: (.+)$/m, `updated_at: ${now}`);

        fs.writeFileSync(ticketPath, updatedContent, 'utf-8');

        console.log(`✅ Updated ticket status to: in_progress`);
        console.log(`✅ Updated timestamp to: ${now}`);
      } catch (error) {
        console.error(`❌ Failed to update ticket status: ${error.message}`);
      }
    }

    // Summary
    console.log('');
    console.log(`🎯 Now working on: ${ticketId} - ${title}`);
    console.log(`🌿 Branch: ${branchName}`);
    console.log('');
    console.log('To push this branch to remote:');
    console.log(`  git push -u origin ${branchName}`);
  }
}

export default startCommand;
