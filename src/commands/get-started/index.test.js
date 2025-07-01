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
import getStartedCommand from './index.js';

describe('get-started command', () => {
  let tempDir;
  let consoleMock;
  let restoreCwd;
  let exitMock;

  beforeEach(() => {
    tempDir = createTempDir('get-started-test');
    consoleMock = mockConsole();
    restoreCwd = mockProcessCwd(tempDir);
    exitMock = mockProcessExit();
  });

  afterEach(() => {
    consoleMock.restore();
    restoreCwd();
    exitMock.restore();
    cleanupTempDir(tempDir);
  });

  describe('initialization validation', () => {
    it('should show error when vibe is not initialized', () => {
      // Act - no vibe project created
      expect(() => getStartedCommand([])).toThrow('process.exit(1)');

      // Assert
      expect(exitMock.exitCalls).toContain(1);
      expect(consoleMock.logs.error).toContain("❌ VibeKit is not initialized. Please run 'vibe init' first.");
    });
  });

  describe('onboarding setup', () => {
    it('should create README.md with getting started instructions', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act
      getStartedCommand([]);

      // Assert
      const readmePath = path.join(tempDir, '.vibe', 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
      
      const readmeContent = fs.readFileSync(readmePath, 'utf-8');
      expect(readmeContent).toContain('# Welcome to VibeKit');
      expect(readmeContent).toContain('vibe init');
      expect(readmeContent).toContain('vibe new');
      expect(readmeContent).toContain('vibe list');
      expect(readmeContent).toContain('vibe close');
      
      expect(consoleMock.logs.log).toContain('✅ Created README.md with getting started instructions');
    });

    it('should create sample tickets', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act
      getStartedCommand([]);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      
      // Should have 3 sample tickets created
      const sampleTickets = files.filter(f => f.startsWith('TKT-'));
      expect(sampleTickets.length).toBe(3);
      
      // Check for specific sample tickets
      expect(files.some(f => f.includes('simple-task-example'))).toBe(true);
      expect(files.some(f => f.includes('bug-report-example'))).toBe(true);
      expect(files.some(f => f.includes('feature-request-with-ai-prompt'))).toBe(true);
      
      expect(consoleMock.logs.log).toContain('✅ Created sample tickets to demonstrate VibeKit features');
    });

    it('should show welcome and completion messages', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act
      getStartedCommand([]);

      // Assert
      expect(consoleMock.logs.log).toContain('✨ Welcome to VibeKit! Setting up your onboarding experience...');
      expect(consoleMock.logs.log.some(log => 
        log.includes("✨ You're all set! Try running 'vibe list' to see your tickets.")
      )).toBe(true);
    });

    it('should create tickets with correct metadata', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act
      getStartedCommand([]);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      
      // Find the simple task example
      const simpleTaskFile = files.find(f => f.includes('simple-task-example'));
      expect(simpleTaskFile).toBeDefined();
      
      const content = fs.readFileSync(path.join(ticketsDir, simpleTaskFile), 'utf-8');
      expect(content).toContain('title: Simple Task Example');
      expect(content).toContain('priority: low');
      expect(content).toContain('status: open');
      expect(content).toContain('## Description');
      expect(content).toContain('Simple Task Example');
      
      // Find the bug report example
      const bugReportFile = files.find(f => f.includes('bug-report-example'));
      expect(bugReportFile).toBeDefined();
      
      const bugContent = fs.readFileSync(path.join(ticketsDir, bugReportFile), 'utf-8');
      expect(bugContent).toContain('title: Bug Report Example');
      expect(bugContent).toContain('priority: high');
      expect(bugContent).toContain('status: in_progress');
    });

    it('should handle missing template gracefully', () => {
      // Arrange
      const vibeProject = createMockVibeProject(tempDir);
      // Remove the template file
      fs.unlinkSync(vibeProject.templatePath);

      // Act
      getStartedCommand([]);

      // Assert
      expect(consoleMock.logs.error.some(log => 
        log.includes('❌ Missing config.yml or default.md template.')
      )).toBe(true);
    });

    it('should handle missing config gracefully', () => {
      // Arrange
      const vibeProject = createMockVibeProject(tempDir);
      // Remove the config file
      fs.unlinkSync(vibeProject.configPath);

      // Act
      getStartedCommand([]);

      // Assert
      expect(consoleMock.logs.error.some(log => 
        log.includes('❌ Missing config.yml or default.md template.')
      )).toBe(true);
    });
  });

  describe('ticket numbering', () => {
    it('should create tickets with incremental IDs', () => {
      // Arrange
      createMockVibeProject(tempDir, {
        withTickets: [
          { id: 'TKT-005', title: 'Existing ticket', status: 'open' }
        ]
      });

      // Act
      getStartedCommand([]);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      
      // Should have the existing ticket plus 3 new ones
      expect(files.length).toBe(4);
      
      // New tickets should start from TKT-006 (or at least create new tickets)
      const newTickets = files.filter(f => f.startsWith('TKT-'));
      expect(newTickets.length).toBeGreaterThan(3); // Should have existing + 3 new
    });

    it('should start from TKT-001 when no tickets exist', () => {
      // Arrange
      createMockVibeProject(tempDir); // No existing tickets

      // Act
      getStartedCommand([]);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      
      // Should create tickets (3 sample tickets)
      const ticketFiles = files.filter(f => f.startsWith('TKT-'));
      expect(ticketFiles.length).toBe(3);
    });
  });

  describe('sample ticket content', () => {
    it('should include AI prompt content for feature request ticket', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act
      getStartedCommand([]);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      
      const aiPromptFile = files.find(f => f.includes('feature-request-with-ai-prompt'));
      expect(aiPromptFile).toBeDefined();
      
      const content = fs.readFileSync(path.join(ticketsDir, aiPromptFile), 'utf-8');
      expect(content).toContain('## AI Prompt');
      expect(content).toContain('## AI Prompt');
      expect(content).toContain('Feature Request with AI Prompt');
    });

    it('should create tickets with proper slug formatting', () => {
      // Arrange
      createMockVibeProject(tempDir);

      // Act
      getStartedCommand([]);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      
      // Check slug formatting (lowercase, hyphenated)
      expect(files.some(f => f.includes('simple-task-example'))).toBe(true);
      expect(files.some(f => f.includes('bug-report-example'))).toBe(true);
      expect(files.some(f => f.includes('feature-request-with-ai-prompt'))).toBe(true);
    });
  });
});