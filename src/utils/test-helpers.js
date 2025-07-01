import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create a temporary test directory
 * @param {string} testName - Name for the test directory
 * @returns {string} Path to the temporary directory
 */
export function createTempDir(testName = 'test') {
  const tempDir = path.join(__dirname, '../../__temp__', testName, Date.now().toString());
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Clean up temporary test directory
 * @param {string} tempDir - Path to the temporary directory to remove
 */
export function cleanupTempDir(tempDir) {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    // Also clean up empty parent directories
    let parentDir = path.dirname(tempDir);
    const tempRoot = path.join(__dirname, '../../__temp__');
    
    // Keep going up the directory tree until we reach __temp__ root or find a non-empty directory
    while (parentDir !== tempRoot && parentDir !== path.dirname(parentDir)) {
      try {
        if (fs.existsSync(parentDir)) {
          const entries = fs.readdirSync(parentDir);
          if (entries.length === 0) {
            fs.rmdirSync(parentDir);
            parentDir = path.dirname(parentDir);
          } else {
            break; // Directory not empty, stop cleaning
          }
        } else {
          break; // Directory doesn't exist, stop
        }
      } catch (error) {
        break; // Permission error or other issue, stop cleaning
      }
    }
  }
}

/**
 * Clean up all temporary test directories
 */
export function cleanupAllTempDirs() {
  const tempRoot = path.join(__dirname, '../../__temp__');
  if (fs.existsSync(tempRoot)) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

/**
 * Create a mock .vibe project structure
 * @param {string} baseDir - Base directory for the mock project
 * @param {Object} options - Configuration options
 * @returns {Object} Paths to created files and directories
 */
export function createMockVibeProject(baseDir, options = {}) {
  const {
    withConfig = true,
    withTemplate = true,
    withTickets = [],
    configData = null,
    templateData = null
  } = options;

  const vibeDir = path.join(baseDir, '.vibe');
  const ticketsDir = path.join(vibeDir, 'tickets');
  const templatesDir = path.join(vibeDir, '.templates');
  
  // Create directories
  fs.mkdirSync(vibeDir, { recursive: true });
  fs.mkdirSync(ticketsDir, { recursive: true });
  fs.mkdirSync(templatesDir, { recursive: true });

  const paths = {
    vibeDir,
    ticketsDir,
    templatesDir
  };

  // Create config.yml
  if (withConfig) {
    const defaultConfig = {
      project: {
        name: 'Test Project',
        version: '1.0.0'
      },
      tickets: {
        path: '.vibe/tickets',
        priority_options: ['low', 'medium', 'high', 'urgent'],
        status_options: ['open', 'in_progress', 'review', 'done'],
        slug: {
          max_length: 30,
          word_limit: 5
        }
      },
      git: {
        branch_prefix: 'feature/'
      },
      ai: {
        enabled: false,
        provider: 'none'
      }
    };
    
    const configPath = path.join(vibeDir, 'config.yml');
    const configContent = configData || `project:
  name: Test Project
  version: 1.0.0

tickets:
  path: .vibe/tickets
  priority_options:
    - low
    - medium
    - high
    - urgent
  status_options:
    - open
    - in_progress
    - review
    - done
  slug:
    max_length: 30
    word_limit: 5

git:
  branch_prefix: feature/

ai:
  enabled: false
  provider: none
`;
    
    fs.writeFileSync(configPath, configContent, 'utf-8');
    paths.configPath = configPath;
  }

  // Create default.md template
  if (withTemplate) {
    const defaultTemplate = templateData || `---
id: TKT-{id}
title: {title}
slug: {slug}
status: open
priority: medium
created_at: {date}
updated_at: {date}
---

## Description

Brief description of the task or issue.

## Acceptance Criteria

- [ ] Define what needs to be done
- [ ] Add specific requirements
- [ ] Include testing criteria

## Code Quality

- Follow existing code patterns
- Write clear, readable code
- Include appropriate error handling
- Add JSDoc comments where needed

## Implementation Notes

Add any technical details, considerations, or constraints.

## Design / UX Considerations

Any design or user experience requirements.

## Testing & Test Cases

Outline the testing approach and specific test cases.

## AI Prompt

Brief description for AI assistance.

## Expected AI Output

What the AI should deliver or accomplish.

## AI Workflow [Claude Code, Codex]

<!-- NOTE (Do not remove) -->
Always use \`vibe start\` to start working on this ticket and \`vibe close\` to close this ticket when done. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.
`;
    
    const templatePath = path.join(templatesDir, 'default.md');
    fs.writeFileSync(templatePath, defaultTemplate, 'utf-8');
    paths.templatePath = templatePath;
  }

  // Create mock tickets
  withTickets.forEach((ticket, index) => {
    const ticketId = ticket.id || `TKT-${String(index + 1).padStart(3, '0')}`;
    const filename = `${ticketId}-${ticket.slug || 'test-ticket'}.md`;
    const ticketPath = path.join(ticketsDir, filename);
    
    const ticketContent = `---
id: ${ticketId}
title: ${ticket.title || 'Test Ticket'}
slug: ${ticket.slug || 'test-ticket'}
status: ${ticket.status || 'open'}
priority: ${ticket.priority || 'medium'}
created_at: ${ticket.created_at || new Date().toISOString()}
updated_at: ${ticket.updated_at || new Date().toISOString()}
---

## Description

${ticket.description || 'Test ticket description'}

## Acceptance Criteria

${ticket.acceptanceCriteria || '- [ ] Test criteria'}
`;
    
    fs.writeFileSync(ticketPath, ticketContent, 'utf-8');
    if (!paths.ticketPaths) paths.ticketPaths = [];
    paths.ticketPaths.push(ticketPath);
  });

  return paths;
}

/**
 * Create a mock git repository structure
 * @param {string} baseDir - Base directory for the mock repository
 * @returns {Object} Information about the created git repository
 */
export function createMockGitRepo(baseDir) {
  const gitDir = path.join(baseDir, '.git');
  const headFile = path.join(gitDir, 'HEAD');
  const configFile = path.join(gitDir, 'config');
  
  fs.mkdirSync(gitDir, { recursive: true });
  fs.writeFileSync(headFile, 'ref: refs/heads/main\n', 'utf-8');
  fs.writeFileSync(configFile, `[core]
\trepositoryformatversion = 0
\tfilemode = true
\tbare = false
\tlogallrefupdates = true
[branch "main"]
\tremote = origin
\tmerge = refs/heads/main
`, 'utf-8');

  return {
    gitDir,
    headFile,
    configFile,
    currentBranch: 'main'
  };
}

/**
 * Mock console methods for testing
 * @returns {Object} Mock console methods and restore function
 */
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };

  const logs = {
    log: [],
    error: [],
    warn: [],
    info: []
  };

  console.log = (...args) => logs.log.push(args.join(' '));
  console.error = (...args) => logs.error.push(args.join(' '));
  console.warn = (...args) => logs.warn.push(args.join(' '));
  console.info = (...args) => logs.info.push(args.join(' '));

  return {
    logs,
    restore: () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    }
  };
}

/**
 * Mock process.cwd() to return a specific directory
 * @param {string} mockDir - Directory to return as current working directory
 * @returns {Function} Restore function to reset process.cwd
 */
export function mockProcessCwd(mockDir) {
  const originalCwd = process.cwd;
  process.cwd = () => mockDir;
  
  return () => {
    process.cwd = originalCwd;
  };
}

/**
 * Mock process.exit() to prevent actual exit during tests
 * @returns {Object} Mock exit function and restore function
 */
export function mockProcessExit() {
  const originalExit = process.exit;
  const exitCalls = [];
  
  process.exit = (code) => {
    exitCalls.push(code);
    throw new Error(`process.exit(${code})`);
  };
  
  return {
    exitCalls,
    restore: () => {
      process.exit = originalExit;
    }
  };
}

/**
 * Create a test fixture for file system operations
 * @param {Object} fileStructure - Object representing file structure
 * @param {string} baseDir - Base directory for the fixture
 */
export function createFileFixture(fileStructure, baseDir) {
  Object.entries(fileStructure).forEach(([filePath, content]) => {
    const fullPath = path.join(baseDir, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (typeof content === 'string') {
      fs.writeFileSync(fullPath, content, 'utf-8');
    } else if (content === null) {
      // Create directory
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
}

/**
 * Assert that a file exists and has expected content
 * @param {string} filePath - Path to the file
 * @param {string|RegExp} expectedContent - Expected content or pattern
 */
export function assertFileContent(filePath, expectedContent) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (typeof expectedContent === 'string') {
    if (!content.includes(expectedContent)) {
      throw new Error(`File content does not include expected text. Got: ${content}`);
    }
  } else if (expectedContent instanceof RegExp) {
    if (!expectedContent.test(content)) {
      throw new Error(`File content does not match expected pattern. Got: ${content}`);
    }
  }
}

/**
 * Wait for a specified amount of time (for async operations)
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the wait
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a spy function for testing
 * @param {Function} originalFn - Original function to spy on
 * @returns {Object} Spy function with call tracking
 */
export function createSpy(originalFn = () => {}) {
  const calls = [];
  
  const spy = (...args) => {
    calls.push(args);
    return originalFn(...args);
  };
  
  spy.calls = calls;
  spy.calledWith = (...expectedArgs) => {
    return calls.some(callArgs => 
      callArgs.length === expectedArgs.length &&
      callArgs.every((arg, index) => arg === expectedArgs[index])
    );
  };
  spy.callCount = () => calls.length;
  spy.lastCall = () => calls[calls.length - 1];
  
  return spy;
}

/**
 * Setup mock assets directory structure for init command testing
 * @param {string} tempDir - Base temporary directory
 * @returns {string} Path to the mock assets directory
 */
export function setupMockAssets(tempDir) {
  // Create the expected assets path structure that init command will look for
  const mockAssetsPath = path.join(tempDir, 'src', 'commands', 'init', '..', '..', '..', 'assets');
  const assetsDir = path.resolve(mockAssetsPath);
  
  fs.mkdirSync(assetsDir, { recursive: true });
  
  // Create mock config.yml
  const configContent = `project:
  name: Test Project
  version: 1.0.0

tickets:
  path: .vibe/tickets
  priority_options:
    - low
    - medium
    - high
    - urgent
  status_options:
    - open
    - in_progress
    - review
    - done
  slug:
    max_length: 30
    word_limit: 5

git:
  branch_prefix: feature/

ai:
  enabled: false
  provider: none
`;
  
  // Create mock default.md template
  const templateContent = `---
id: TKT-{id}
title: {title}
slug: {slug}
status: open
priority: medium
created_at: {date}
updated_at: {date}
---

## Description

Brief description of the task or issue.

## Acceptance Criteria

- [ ] Define what needs to be done
- [ ] Add specific requirements
- [ ] Include testing criteria
`;

  fs.writeFileSync(path.join(assetsDir, 'config.yml'), configContent, 'utf-8');
  fs.writeFileSync(path.join(assetsDir, 'default.md'), templateContent, 'utf-8');
  
  return assetsDir;
}