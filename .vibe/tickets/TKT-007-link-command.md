---
id: TKT-007
title: Add vibe link command for API key setup and AI provider configuration
slug: TKT-007-add-vibe-link-command-for
status: done
priority: medium
created_at: 2025-06-07T12:54:40.130Z
updated_at: 2025-06-07T21:24:28.675Z
---

## Description

Create a `vibe link` command that allows users to configure AI providers for ticket refinement. This command should:

1. Set up API keys for different AI providers (Claude, OpenAI, etc.)
2. Allow users to choose between different AI providers
3. Store configuration securely for use by `vibe refine` command
4. Validate API keys and test connection

## Acceptance Criteria

- [ ] `vibe link` command prompts user for AI provider choice
- [ ] Secure API key storage and validation
- [ ] Updates config.yml with AI provider settings
- [ ] Test API connection on setup
- [ ] Clear status display and error handling
- [ ] Support for re-linking/updating configuration

## Notes

- Start with Claude (Anthropic API) support
- Extensible architecture for multiple providers
- Consider secure storage options (env vars, encrypted config)
- VibeDX Pro integration can be placeholder initially

## Design / UX Considerations

Interactive CLI prompts similar to `npm init`:
```
$ vibe link
? Choose AI provider: 
  > Bring your own API key
    
? Enter your Claude API key: [hidden]
✅ API key validated
🔗 Ready for ticket refinement!
```

## AI Prompt

Implement Node.js command for AI provider configuration with:
1. Interactive provider selection
2. Secure API key handling
3. Configuration persistence
4. Connection validation

## Expected AI Output

- Complete `src/commands/link/index.js` implementation
- Updated config.yml structure for AI settings
- Utility functions for API management
- Clean user interaction flow