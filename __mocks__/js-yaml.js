import { jest } from '@jest/globals';

const jsYaml = {
  load: jest.fn(),
  dump: jest.fn(),
  
  // Mock implementations
  __setMockData: function(mockData) {
    this.load.mockImplementation((yamlString) => {
      if (typeof yamlString === 'string') {
        // Simple mock - return predetermined data or try to parse basic YAML
        return mockData || this.__parseSimpleYaml(yamlString);
      }
      return null;
    });
    
    this.dump.mockImplementation((data) => {
      return this.__dumpSimpleYaml(data);
    });
  },
  
  __parseSimpleYaml: function(yamlString) {
    // Very basic YAML parsing for testing
    const lines = yamlString.split('\n');
    const result = {};
    let currentSection = result;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      
      if (trimmed.endsWith(':')) {
        const key = trimmed.slice(0, -1);
        currentSection[key] = {};
        currentSection = currentSection[key];
      } else if (trimmed.includes(': ')) {
        const [key, value] = trimmed.split(': ', 2);
        currentSection[key] = value;
      }
    });
    
    return result;
  },
  
  __dumpSimpleYaml: function(data, indent = 0) {
    const spaces = '  '.repeat(indent);
    let result = '';
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        result += `${spaces}${key}:\n`;
        result += this.__dumpSimpleYaml(value, indent + 1);
      } else {
        result += `${spaces}${key}: ${value}\n`;
      }
    });
    
    return result;
  },
  
  __reset: function() {
    this.load.mockReset();
    this.dump.mockReset();
  }
};

// Set default mock behavior
jsYaml.__setMockData();

export default jsYaml;