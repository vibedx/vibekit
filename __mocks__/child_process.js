import { EventEmitter } from 'events';
import { jest } from '@jest/globals';

class MockChildProcess extends EventEmitter {
  constructor() {
    super();
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.killed = false;
    this.exitCode = null;
  }

  kill(signal) {
    this.killed = true;
    this.emit('close', 0);
  }
}

const child_process = {
  spawn: jest.fn(),
  exec: jest.fn(),
  execSync: jest.fn(),
  
  // Mock implementations
  __mockSpawn: function(command, args, options, mockResult) {
    this.spawn.mockImplementation((cmd, cmdArgs, opts) => {
      const child = new MockChildProcess();
      
      process.nextTick(() => {
        if (mockResult.stdout) {
          child.stdout.emit('data', Buffer.from(mockResult.stdout));
        }
        if (mockResult.stderr) {
          child.stderr.emit('data', Buffer.from(mockResult.stderr));
        }
        child.emit('close', mockResult.exitCode || 0);
      });
      
      return child;
    });
  },
  
  __mockExecSync: function(mockResults) {
    this.execSync.mockImplementation((command) => {
      const result = mockResults[command];
      if (result) {
        if (result.error) {
          throw result.error;
        }
        return result.stdout || '';
      }
      return '';
    });
  },
  
  __reset: function() {
    this.spawn.mockReset();
    this.exec.mockReset();
    this.execSync.mockReset();
  }
};

export default child_process;