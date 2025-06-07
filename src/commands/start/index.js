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
  getGitStatus
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
  
  // Process additional arguments
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--base' && i + 1 < args.length) {
      baseBranch = args[i + 1];
      i++; // Skip the next argument as it's the base branch
    } else if (args[i] === '--update-status' || args[i] === '-u') {
      updateStatus = true;
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
    
    // Checkout the existing branch
    if (checkoutBranch(branchName)) {
      console.log(`✅ Switched to branch: ${branchName}`);
    } else {
      console.error(`❌ Failed to switch to branch: ${branchName}`);
      process.exit(1);
    }
  } else {
    console.log(`🔍 Creating new branch: ${branchName}`);
    
    // Create and checkout the new branch
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
      // Read the ticket file
      const ticketContent = fs.readFileSync(ticketPath, 'utf-8');
      
      // Get current timestamp in ISO format
      const now = new Date().toISOString();
      
      // Update the status to in_progress and update the timestamp
      let updatedContent = ticketContent
        .replace(/^status: (.+)$/m, 'status: in_progress')
        .replace(/^updated_at: (.+)$/m, `updated_at: ${now}`);
      
      // Write the updated content back to the file
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

export default startCommand;
