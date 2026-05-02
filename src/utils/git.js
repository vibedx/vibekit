import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

/**
 * Check if the current directory is within a git repository
 * @returns {boolean} True if in a git repository, false otherwise
 */
function isGitRepository() {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the current branch name
 * @returns {string|null} The current branch name or null if not in a git repository
 */
function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  } catch (error) {
    return null;
  }
}

/**
 * Check if a branch exists locally
 * @param {string} branchName The branch name to check
 * @returns {boolean} True if the branch exists locally, false otherwise
 */
function branchExistsLocally(branchName) {
  try {
    const result = execSync(`git show-ref --verify --quiet refs/heads/${branchName}`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a branch exists remotely
 * @param {string} branchName The branch name to check
 * @returns {boolean} True if the branch exists remotely, false otherwise
 */
function branchExistsRemotely(branchName) {
  try {
    const result = execSync(`git ls-remote --heads origin ${branchName}`, { encoding: 'utf-8' });
    return result.trim() !== '';
  } catch (error) {
    return false;
  }
}

/**
 * Get the default base branch (usually main or master)
 * @returns {string} The default base branch name
 */
function getDefaultBaseBranch() {
  try {
    // Try to determine if main or master is the default branch
    const branches = execSync('git branch -r', { encoding: 'utf-8' }).trim().split('\n');
    
    // Check if origin/main exists
    if (branches.some(branch => branch.trim() === 'origin/main')) {
      return 'main';
    }
    
    // Check if origin/master exists
    if (branches.some(branch => branch.trim() === 'origin/master')) {
      return 'master';
    }
    
    // Default to main if we can't determine
    return 'main';
  } catch (error) {
    return 'main'; // Default to main if there's an error
  }
}

/**
 * Create and checkout a new branch
 * @param {string} branchName The name of the branch to create
 * @param {string} baseBranch The base branch to create from (default: main)
 * @returns {boolean} True if successful, false otherwise
 */
function createAndCheckoutBranch(branchName, baseBranch = null) {
  try {
    const base = baseBranch || getDefaultBaseBranch();
    
    // Make sure we have the latest from the base branch
    try {
      execSync(`git fetch origin ${base}`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore fetch errors, we'll try to create the branch anyway
    }
    
    // Create and checkout the new branch
    execSync(`git checkout -b ${branchName} origin/${base} || git checkout -b ${branchName} ${base}`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error(`❌ Failed to create branch: ${error.message}`);
    return false;
  }
}

/**
 * Checkout an existing branch
 * @param {string} branchName The name of the branch to checkout
 * @returns {boolean} True if successful, false otherwise
 */
function checkoutBranch(branchName) {
  try {
    execSync(`git checkout ${branchName}`, { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.error(`❌ Failed to checkout branch: ${error.message}`);
    return false;
  }
}

/**
 * Get the status of the working directory
 * @returns {string} The git status output
 */
function getGitStatus() {
  try {
    return execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
  } catch (error) {
    return '';
  }
}

function getRepoRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch (error) {
    return null;
  }
}

function getMainWorktreeRoot() {
  try {
    const worktrees = execSync('git worktree list --porcelain', { encoding: 'utf-8' });
    const firstWorktreeLine = worktrees.split('\n').find(line => line.startsWith('worktree '));
    if (firstWorktreeLine) {
      return firstWorktreeLine.replace('worktree ', '');
    }
    return getRepoRoot();
  } catch (error) {
    return getRepoRoot();
  }
}

function getRepoName() {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
    // Handle git@github.com:org/repo.git
    let match = remoteUrl.match(/[:/]([^/]+?)(?:\.git)?$/);
    if (match) return match[1];
  } catch (error) {
    // No remote — fall through
  }
  const root = getRepoRoot();
  return root ? path.basename(root) : 'unknown-repo';
}

function getWorktreesDir(repoName) {
  const name = repoName || getRepoName();
  return path.join(os.homedir(), '.vibekit', 'worktrees', name);
}

function sanitizeBranchForPath(branch) {
  return branch.replace(/\//g, '--');
}

function getWorktreePath(repoName, branch) {
  return path.join(getWorktreesDir(repoName), sanitizeBranchForPath(branch));
}

function createWorktree(worktreePath, branch, baseBranch) {
  const base = baseBranch || getDefaultBaseBranch();
  try {
    execSync(`git fetch origin ${base}`, { stdio: 'ignore' });
  } catch (error) {
    // Ignore fetch errors
  }
  fs.mkdirSync(path.dirname(worktreePath), { recursive: true });
  try {
    execSync(`git worktree add "${worktreePath}" -b ${branch} origin/${base}`, { stdio: 'pipe' });
  } catch (error) {
    execSync(`git worktree add "${worktreePath}" -b ${branch} ${base}`, { stdio: 'pipe' });
  }
  return true;
}

function createWorktreeExistingBranch(worktreePath, branch) {
  fs.mkdirSync(path.dirname(worktreePath), { recursive: true });
  execSync(`git worktree add "${worktreePath}" ${branch}`, { stdio: 'pipe' });
  return true;
}

function removeWorktree(worktreePath, force = false) {
  const forceFlag = force ? ' --force' : '';
  execSync(`git worktree remove "${worktreePath}"${forceFlag}`, { stdio: 'pipe' });
  return true;
}

function listWorktrees() {
  try {
    const output = execSync('git worktree list --porcelain', { encoding: 'utf-8' });
    const worktrees = [];
    let current = {};
    for (const line of output.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (current.path) worktrees.push(current);
        current = { path: line.replace('worktree ', '') };
      } else if (line.startsWith('branch refs/heads/')) {
        current.branch = line.replace('branch refs/heads/', '');
      } else if (line === 'bare') {
        current.bare = true;
      } else if (line === '') {
        if (current.path) worktrees.push(current);
        current = {};
      }
    }
    if (current.path) worktrees.push(current);
    return worktrees;
  } catch (error) {
    return [];
  }
}

export {
  isGitRepository,
  getCurrentBranch,
  branchExistsLocally,
  branchExistsRemotely,
  getDefaultBaseBranch,
  createAndCheckoutBranch,
  checkoutBranch,
  getGitStatus,
  getRepoRoot,
  getMainWorktreeRoot,
  getRepoName,
  getWorktreesDir,
  getWorktreePath,
  sanitizeBranchForPath,
  createWorktree,
  createWorktreeExistingBranch,
  removeWorktree,
  listWorktrees
};
