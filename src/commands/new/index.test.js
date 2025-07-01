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
import newCommand from './index.js';

describe('new command', () => {
  let tempDir;
  let consoleMock;
  let restoreCwd;
  let exitMock;

  beforeEach(() => {
    // Create temp directory
    tempDir = createTempDir('new-test');
    
    // Mock console and process
    consoleMock = mockConsole();
    restoreCwd = mockProcessCwd(tempDir);
    exitMock = mockProcessExit();
    
    // Create a basic vibe project structure
    createMockVibeProject(tempDir);
  });

  afterEach(() => {
    // Restore mocks
    consoleMock.restore();
    restoreCwd();
    exitMock.restore();
    
    // Cleanup temp directory
    cleanupTempDir(tempDir);
  });

  describe('basic ticket creation', () => {
    it('should create a new ticket with default settings', async () => {
      // Act
      await newCommand(['Fix authentication bug']);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      const ticketFile = files.find(f => f.startsWith('TKT-001'));
      
      expect(ticketFile).toBeTruthy();
      expect(files).toHaveLength(1);
      
      const ticketPath = path.join(ticketsDir, ticketFile);
      const content = fs.readFileSync(ticketPath, 'utf-8');
      expect(content).toContain('title: Fix authentication bug');
      expect(content).toContain('priority: medium');
      expect(content).toContain('status: open');
    });

    it('should handle multi-word titles correctly', async () => {
      // Act
      await newCommand(['Add dark mode toggle for user interface']);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      const ticketFile = files[0];
      
      const content = fs.readFileSync(path.join(ticketsDir, ticketFile), 'utf-8');
      expect(content).toContain('title: Add dark mode toggle for user interface');
    });

    it('should log success message with ticket details', async () => {
      // Act
      await newCommand(['Test ticket']);

      // Assert
      const successMessages = consoleMock.logs.log.filter(log => 
        log.includes('Created ticket:') && 
        log.includes('TKT-001') &&
        log.includes('priority: medium') &&
        log.includes('status: open')
      );
      expect(successMessages.length).toBeGreaterThan(0);
    });
  });

  describe('priority and status options', () => {
    it('should accept custom priority', async () => {
      // Act
      await newCommand(['High priority task', '--priority', 'high']);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      const content = fs.readFileSync(path.join(ticketsDir, files[0]), 'utf-8');
      expect(content).toContain('priority: high');
    });

    it('should accept custom status', async () => {
      // Act
      await newCommand(['In progress task', '--status', 'in_progress']);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      const content = fs.readFileSync(path.join(ticketsDir, files[0]), 'utf-8');
      expect(content).toContain('status: in_progress');
    });

    it('should accept both priority and status', async () => {
      // Act
      await newCommand(['Custom task', '--priority', 'urgent', '--status', 'review']);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      const content = fs.readFileSync(path.join(ticketsDir, files[0]), 'utf-8');
      expect(content).toContain('priority: urgent');
      expect(content).toContain('status: review');
    });
  });

  describe('error handling', () => {
    it('should exit with error when no title provided', async () => {
      // Act & Assert
      await expect(async () => {
        await newCommand([]);
      }).rejects.toThrow('process.exit(1)');
      
      expect(exitMock.exitCalls).toContain(1);
    });

    it('should exit with error when config missing', async () => {
      // Arrange - remove config file
      fs.unlinkSync(path.join(tempDir, '.vibe', 'config.yml'));

      // Act & Assert
      await expect(async () => {
        await newCommand(['Test ticket']);
      }).rejects.toThrow('process.exit(1)');
      
      expect(exitMock.exitCalls).toContain(1);
    });

    it('should exit with error when template missing', async () => {
      // Arrange - remove template file
      fs.unlinkSync(path.join(tempDir, '.vibe', '.templates', 'default.md'));

      // Act & Assert
      await expect(async () => {
        await newCommand(['Test ticket']);
      }).rejects.toThrow('process.exit(1)');
      
      expect(exitMock.exitCalls).toContain(1);
    });

    it('should handle empty title gracefully', async () => {
      // Act & Assert
      await expect(async () => {
        await newCommand(['']);
      }).rejects.toThrow('process.exit(1)');
    });
  });

  describe('ticket ID generation', () => {
    it('should increment ticket ID for multiple tickets', async () => {
      // Act - create multiple tickets
      await newCommand(['First ticket']);
      await newCommand(['Second ticket']);
      await newCommand(['Third ticket']);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir).sort();
      
      expect(files).toHaveLength(3);
      expect(files[0]).toMatch(/^TKT-001/);
      expect(files[1]).toMatch(/^TKT-002/);
      expect(files[2]).toMatch(/^TKT-003/);
    });

    it('should create proper slug from title', async () => {
      // Act
      await newCommand(['Add User Authentication System']);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      
      expect(files[0]).toMatch(/add-user-authentication-system/);
    });
  });

  describe('template processing', () => {
    it('should replace template placeholders correctly', async () => {
      // Act
      await newCommand(['Template test']);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      const content = fs.readFileSync(path.join(ticketsDir, files[0]), 'utf-8');
      
      expect(content).toContain('id: TKT-001');
      expect(content).toContain('title: Template test');
      expect(content).toMatch(/created_at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(content).toMatch(/updated_at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should preserve template structure', async () => {
      // Act
      await newCommand(['Structure test']);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      const content = fs.readFileSync(path.join(ticketsDir, files[0]), 'utf-8');
      
      expect(content).toContain('## Description');
      expect(content).toContain('## Acceptance Criteria');
      expect(content).toContain('## Code Quality');
    });
  });

  describe('argument parsing', () => {
    it('should handle flags and title correctly', async () => {
      // Act
      await newCommand(['My ticket title', '--priority', 'low', '--status', 'done']);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      const content = fs.readFileSync(path.join(ticketsDir, files[0]), 'utf-8');
      
      expect(content).toContain('title: My ticket title');
      expect(content).toContain('priority: low');
      expect(content).toContain('status: done');
    });

    it('should handle title with multiple words', async () => {
      // Act
      await newCommand(['Fix', 'the', 'critical', 'authentication', 'bug']);

      // Assert
      const ticketsDir = path.join(tempDir, '.vibe', 'tickets');
      const files = fs.readdirSync(ticketsDir);
      const content = fs.readFileSync(path.join(ticketsDir, files[0]), 'utf-8');
      
      expect(content).toContain('title: Fix the critical authentication bug');
    });
  });
});