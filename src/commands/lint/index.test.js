import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { 
  createTempDir, 
  cleanupTempDir, 
  mockConsole, 
  mockProcessCwd, 
  mockProcessExit,
  createMockVibeProject
} from '../../utils/test-helpers.js';
import lintCommand from './index.js';

describe('lint command', () => {
  let tempDir;
  let consoleMock;
  let restoreCwd;
  let exitMock;

  beforeEach(() => {
    // Create temp directory
    tempDir = createTempDir('lint-test');
    
    // Mock console and process
    consoleMock = mockConsole();
    restoreCwd = mockProcessCwd(tempDir);
    exitMock = mockProcessExit();
  });

  afterEach(() => {
    // Restore mocks
    consoleMock.restore();
    restoreCwd();
    exitMock.restore();
    
    // Cleanup temp directory
    cleanupTempDir(tempDir);
  });

  describe('help functionality', () => {
    it('should show help when --help flag is provided', () => {
      // Act
      expect(() => lintCommand(['--help'])).toThrow('process.exit(0)');

      // Assert
      expect(exitMock.exitCalls).toContain(0);
      expect(consoleMock.logs.log.some(log => 
        log.includes('vibe lint - Validate ticket documentation formatting')
      )).toBe(true);
    });

    it('should show help when -h flag is provided', () => {
      // Act
      expect(() => lintCommand(['-h'])).toThrow('process.exit(0)');

      // Assert
      expect(exitMock.exitCalls).toContain(0);
      expect(consoleMock.logs.log.some(log => 
        log.includes('Usage:')
      )).toBe(true);
    });
  });

  describe('directory validation', () => {
    it('should exit with error when configuration file does not exist', () => {
      // Act
      expect(() => lintCommand([])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.error.some(error => 
        error.includes('Configuration file not found')
      )).toBe(true);
    });

    it('should show message when no ticket files found', () => {
      // Arrange - create empty vibe project
      createMockVibeProject(tempDir, { withTickets: [] });

      // Act
      expect(() => lintCommand([])).toThrow('process.exit(0)');

      // Assert
      expect(exitMock.exitCalls).toContain(0);
      expect(consoleMock.logs.log).toContain('📝 No ticket files found to lint.');
    });
  });

  describe('ticket validation', () => {
    it('should validate properly formatted ticket successfully', () => {
      // Arrange - create mock project with valid ticket
      const validTicket = {
        id: 'TKT-001',
        title: 'Test ticket',
        slug: 'test-ticket',
        status: 'open',
        priority: 'medium',
        created_at: '2025-01-01T12:00:00.000Z',
        updated_at: '2025-01-01T12:00:00.000Z',
        description: `## Description

This is a test description with enough content to pass validation.

## Acceptance Criteria

This section has sufficient content for validation purposes.

## Code Quality

This section contains adequate content for testing validation logic.

## Implementation Notes

This section provides enough details for the validation system.

## Design / UX Considerations

This section includes sufficient UX considerations for testing.

## Testing & Test Cases

This section contains adequate test case information.

## AI Prompt

This section provides sufficient AI prompt content for testing.

## Expected AI Output

This section contains enough information about expected output.

## AI Workflow

This section has adequate workflow information for validation.`
      };

      createMockVibeProject(tempDir, { withTickets: [validTicket] });

      // Act
      expect(() => lintCommand([])).toThrow('process.exit(0)');

      // Assert
      expect(exitMock.exitCalls).toContain(0);
      expect(consoleMock.logs.log.some(log => 
        log.includes('All tickets are properly formatted!')
      )).toBe(true);
    });

    it('should identify missing frontmatter fields', () => {
      // Arrange - create ticket with missing frontmatter
      const invalidTicket = {
        id: 'TKT-001',
        title: 'Test ticket',
        // Missing slug, status, priority, created_at, updated_at
        description: `## Description

This ticket has missing frontmatter fields for testing validation.

## Acceptance Criteria

This section has sufficient content for validation purposes.

## Code Quality

This section contains adequate content for testing validation logic.

## Implementation Notes  

This section provides enough details for the validation system.

## Design / UX Considerations

This section includes sufficient UX considerations for testing.

## Testing & Test Cases

This section contains adequate test case information.

## AI Prompt

This section provides sufficient AI prompt content for testing.

## Expected AI Output

This section contains enough information about expected output.

## AI Workflow

This section has adequate workflow information for validation.`
      };

      createMockVibeProject(tempDir, { withTickets: [invalidTicket] });

      // Act
      expect(() => lintCommand([])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.log.some(log => 
        log.includes('Error: Missing required frontmatter field: slug')
      )).toBe(true);
    });

    it('should identify missing required sections', () => {
      // Arrange - create ticket with missing sections
      const incompleteTicket = {
        id: 'TKT-001',
        title: 'Test ticket',
        slug: 'test-ticket',
        status: 'open',
        priority: 'medium',
        created_at: '2025-01-01T12:00:00.000Z',
        updated_at: '2025-01-01T12:00:00.000Z',
        description: 'Only description, missing other sections'
      };

      createMockVibeProject(tempDir, { withTickets: [incompleteTicket] });

      // Act
      expect(() => lintCommand([])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.log.some(log => 
        log.includes('Missing required section: ## Code Quality')
      )).toBe(true);
    });

    it('should validate status values', () => {
      // Arrange - create ticket with invalid status
      const ticketContent = `---
id: TKT-001
title: Test ticket
slug: test-ticket
status: invalid_status
priority: medium
created_at: 2025-01-01T12:00:00.000Z
updated_at: 2025-01-01T12:00:00.000Z
---

## Description
Test

## Acceptance Criteria
Test

## Code Quality
Test

## Implementation Notes
Test

## Design / UX Considerations
Test

## Testing & Test Cases
Test

## AI Prompt
Test

## Expected AI Output
Test

## AI Workflow
Test`;

      createMockVibeProject(tempDir);
      const ticketPath = path.join(tempDir, '.vibe', 'tickets', 'TKT-001-test.md');
      fs.writeFileSync(ticketPath, ticketContent, 'utf-8');

      // Act
      expect(() => lintCommand([])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.log.some(log => 
        log.includes('Invalid status "invalid_status"')
      )).toBe(true);
    });

    it('should validate priority values', () => {
      // Arrange - create ticket with invalid priority
      const ticketContent = `---
id: TKT-001
title: Test ticket
slug: test-ticket
status: open
priority: invalid_priority
created_at: 2025-01-01T12:00:00.000Z
updated_at: 2025-01-01T12:00:00.000Z
---

## Description
Test

## Acceptance Criteria
Test

## Code Quality
Test

## Implementation Notes
Test

## Design / UX Considerations
Test

## Testing & Test Cases
Test

## AI Prompt
Test

## Expected AI Output
Test

## AI Workflow
Test`;

      createMockVibeProject(tempDir);
      const ticketPath = path.join(tempDir, '.vibe', 'tickets', 'TKT-001-test.md');
      fs.writeFileSync(ticketPath, ticketContent, 'utf-8');

      // Act
      expect(() => lintCommand([])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.log.some(log => 
        log.includes('Invalid priority "invalid_priority"')
      )).toBe(true);
    });

    it('should validate ID format', () => {
      // Arrange - create ticket with invalid ID format
      const ticketContent = `---
id: INVALID-ID
title: Test ticket
slug: test-ticket
status: open
priority: medium
created_at: 2025-01-01T12:00:00.000Z
updated_at: 2025-01-01T12:00:00.000Z
---

## Description
Test

## Acceptance Criteria
Test

## Code Quality
Test

## Implementation Notes
Test

## Design / UX Considerations
Test

## Testing & Test Cases
Test

## AI Prompt
Test

## Expected AI Output
Test

## AI Workflow
Test`;

      createMockVibeProject(tempDir);
      const ticketPath = path.join(tempDir, '.vibe', 'tickets', 'TKT-001-test.md');
      fs.writeFileSync(ticketPath, ticketContent, 'utf-8');

      // Act
      expect(() => lintCommand([])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.log.some(log => 
        log.includes('Invalid ID format "INVALID-ID"')
      )).toBe(true);
    });
  });

  describe('specific file validation', () => {
    it('should lint specific file when filename provided', () => {
      // Arrange
      const validTicket = {
        id: 'TKT-001',
        title: 'Test ticket',
        slug: 'test-ticket',
        status: 'open',
        priority: 'medium',
        created_at: '2025-01-01T12:00:00.000Z',
        updated_at: '2025-01-01T12:00:00.000Z',
        description: `## Description

This is a test description with enough content to pass validation.

## Acceptance Criteria

This section has sufficient content for validation purposes.

## Code Quality

This section contains adequate content for testing validation logic.

## Implementation Notes  

This section provides enough details for the validation system.

## Design / UX Considerations

This section includes sufficient UX considerations for testing.

## Testing & Test Cases

This section contains adequate test case information.

## AI Prompt

This section provides sufficient AI prompt content for testing.

## Expected AI Output

This section contains enough information about expected output.

## AI Workflow

This section has adequate workflow information for validation.`
      };

      const mockProject = createMockVibeProject(tempDir, { withTickets: [validTicket] });
      const ticketFile = path.basename(mockProject.ticketPaths[0]);

      // Act
      expect(() => lintCommand([ticketFile])).toThrow('process.exit(0)');

      // Assert
      expect(exitMock.exitCalls).toContain(0);
    });

    it('should exit with error when specific file does not exist', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act
      expect(() => lintCommand(['nonexistent.md'])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.error.some(error => 
        error.includes('File not found: nonexistent.md')
      )).toBe(true);
    });
  });

  describe('verbose output', () => {
    it('should show detailed output with --verbose flag', () => {
      // Arrange
      const validTicket = {
        id: 'TKT-001',
        title: 'Test ticket',
        slug: 'test-ticket',
        status: 'open',
        priority: 'medium',
        created_at: '2025-01-01T12:00:00.000Z',
        updated_at: '2025-01-01T12:00:00.000Z',
        description: `## Description

This is a test description with enough content to pass validation.

## Acceptance Criteria

This section has sufficient content for validation purposes.

## Code Quality

This section contains adequate content for testing validation logic.

## Implementation Notes  

This section provides enough details for the validation system.

## Design / UX Considerations

This section includes sufficient UX considerations for testing.

## Testing & Test Cases

This section contains adequate test case information.

## AI Prompt

This section provides sufficient AI prompt content for testing.

## Expected AI Output

This section contains enough information about expected output.

## AI Workflow

This section has adequate workflow information for validation.`
      };

      createMockVibeProject(tempDir, { withTickets: [validTicket] });

      // Act
      expect(() => lintCommand(['--verbose'])).toThrow('process.exit(0)');

      // Assert
      expect(exitMock.exitCalls).toContain(0);
      expect(consoleMock.logs.log.some(log => 
        log.includes('✅')
      )).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle malformed YAML frontmatter', () => {
      // Arrange - create file with invalid YAML
      const invalidYamlContent = `---
id: TKT-001
title: "Unclosed quote
status: open
---

## Description
Test`;

      createMockVibeProject(tempDir);
      const ticketPath = path.join(tempDir, '.vibe', 'tickets', 'TKT-001-test.md');
      fs.writeFileSync(ticketPath, invalidYamlContent, 'utf-8');

      // Act
      expect(() => lintCommand([])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.log.some(log => 
        log.includes('Invalid YAML frontmatter')
      )).toBe(true);
    });

    it('should handle files without frontmatter', () => {
      // Arrange - create file without frontmatter
      const noFrontmatterContent = `# Just a regular markdown file

This has no frontmatter.`;

      createMockVibeProject(tempDir);
      const ticketPath = path.join(tempDir, '.vibe', 'tickets', 'TKT-001-test.md');
      fs.writeFileSync(ticketPath, noFrontmatterContent, 'utf-8');

      // Act
      expect(() => lintCommand([])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.log.some(log => 
        log.includes('File must start with YAML frontmatter')
      )).toBe(true);
    });
  });
});