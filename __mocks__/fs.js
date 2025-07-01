import { jest } from '@jest/globals';

const fs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn(),
  copyFileSync: jest.fn(),
  renameSync: jest.fn(),
  rmSync: jest.fn(),
  lstatSync: jest.fn(),
  
  // Mock implementations
  __setMockFiles: function(mockFiles) {
    this.existsSync.mockImplementation(path => !!mockFiles[path]);
    this.readFileSync.mockImplementation(path => {
      if (mockFiles[path]) {
        return mockFiles[path];
      }
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    });
    this.readdirSync.mockImplementation(path => {
      const files = Object.keys(mockFiles)
        .filter(file => file.startsWith(path + '/'))
        .map(file => file.substring(path.length + 1))
        .filter(file => !file.includes('/'));
      return files;
    });
  },
  
  __reset: function() {
    Object.keys(this).forEach(key => {
      if (typeof this[key] === 'function' && key !== '__setMockFiles' && key !== '__reset') {
        this[key].mockReset();
      }
    });
  }
};

export default fs;