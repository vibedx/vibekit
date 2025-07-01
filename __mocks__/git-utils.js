const gitUtils = {
  isGitRepository: jest.fn(),
  getCurrentBranch: jest.fn(),
  branchExistsLocally: jest.fn(),
  branchExistsRemotely: jest.fn(),
  getDefaultBaseBranch: jest.fn(),
  createAndCheckoutBranch: jest.fn(),
  checkoutBranch: jest.fn(),
  getGitStatus: jest.fn(),
  
  // Mock state
  __mockState: {
    isGitRepo: true,
    currentBranch: 'main',
    localBranches: ['main'],
    remoteBranches: ['main'],
    defaultBranch: 'main',
    gitStatus: '',
    hasChanges: false
  },
  
  // Set up default mock implementations
  __setupMocks: function() {
    this.isGitRepository.mockImplementation(() => this.__mockState.isGitRepo);
    
    this.getCurrentBranch.mockImplementation(() => this.__mockState.currentBranch);
    
    this.branchExistsLocally.mockImplementation((branchName) => 
      this.__mockState.localBranches.includes(branchName)
    );
    
    this.branchExistsRemotely.mockImplementation((branchName) => 
      this.__mockState.remoteBranches.includes(branchName)
    );
    
    this.getDefaultBaseBranch.mockImplementation(() => this.__mockState.defaultBranch);
    
    this.createAndCheckoutBranch.mockImplementation((branchName, baseBranch) => {
      if (!this.__mockState.isGitRepo) return false;
      this.__mockState.localBranches.push(branchName);
      this.__mockState.currentBranch = branchName;
      return true;
    });
    
    this.checkoutBranch.mockImplementation((branchName) => {
      if (!this.__mockState.isGitRepo) return false;
      if (!this.__mockState.localBranches.includes(branchName)) return false;
      this.__mockState.currentBranch = branchName;
      return true;
    });
    
    this.getGitStatus.mockImplementation(() => this.__mockState.gitStatus);
  },
  
  // Helper methods for testing
  __setGitRepo: function(isRepo) {
    this.__mockState.isGitRepo = isRepo;
  },
  
  __setCurrentBranch: function(branch) {
    this.__mockState.currentBranch = branch;
  },
  
  __addLocalBranch: function(branch) {
    if (!this.__mockState.localBranches.includes(branch)) {
      this.__mockState.localBranches.push(branch);
    }
  },
  
  __addRemoteBranch: function(branch) {
    if (!this.__mockState.remoteBranches.includes(branch)) {
      this.__mockState.remoteBranches.push(branch);
    }
  },
  
  __setGitStatus: function(status) {
    this.__mockState.gitStatus = status;
    this.__mockState.hasChanges = status.length > 0;
  },
  
  __reset: function() {
    // Reset mock state
    this.__mockState = {
      isGitRepo: true,
      currentBranch: 'main',
      localBranches: ['main'],
      remoteBranches: ['main'],
      defaultBranch: 'main',
      gitStatus: '',
      hasChanges: false
    };
    
    // Reset all mocks
    Object.keys(this).forEach(key => {
      if (typeof this[key] === 'function' && key.startsWith('jest.fn')) {
        this[key].mockReset();
      }
    });
    
    // Re-setup mocks
    this.__setupMocks();
  }
};

// Initialize mocks
gitUtils.__setupMocks();

export default gitUtils;