---
id: TKT-012
title: Refactor link command to use native Claude Code CLI integration
slug: TKT-012-refactor-link-command-native-claude-code
status: done
priority: high
created_at: 2026-02-21T00:00:00.000Z
updated_at: 2026-02-21T00:00:00.000Z
---

## Description

The current `vibe link` command manages ANTHROPIC_API_KEY credentials via environment variables or `.env` files. This is unnecessary overhead since Claude Code CLI manages its own authentication natively.

Refactor the `link` command to simply detect whether the `claude` CLI is installed and working, then configure the project to use it — no API key management required.

## Acceptance Criteria

- [ ] `vibe link` checks if `claude` CLI is installed (via `claude --version`)
- [ ] If not installed, display clear install instructions and exit gracefully
- [ ] If installed, update `.vibe/config.yml` with `ai.enabled: true` and `ai.provider: claude-code`
- [ ] Create `.context/instructions/claude.md` AI instructions on successful link
- [ ] Remove all API key prompting, validation, and `.env` file management
- [ ] Clean, minimal output guiding the user through the process

## Code Quality

- [ ] Remove dead code: `askSecretQuestion`, `createEnvFile`, `validateClaudeApiKey`, `checkEnvFile`
- [ ] Remove unused `createReadlineInterface` and `readline` import
- [ ] Keep `loadConfig`, `saveConfig`, `createAiInstructions` (still needed)
- [ ] Follow JSDoc conventions for all functions
- [ ] Functions should be small and focused

## Implementation Notes

- Use the same `claude --version` check pattern already in `src/commands/refine/index.js`
- The `spawn` approach with `stdio: 'pipe'` and timeout is the established pattern
- Config update: `config.ai = { enabled: true, provider: 'claude-code' }`
- Claude Code install URL: `https://docs.anthropic.com/en/docs/claude-code`

## Design / UX Considerations

- Keep output concise and informative
- On success: confirm Claude Code detected, show version if possible, confirm config updated
- On failure: clear message with install instructions link

## Testing & Test Cases

- [ ] `vibe link` with `claude` CLI installed → success flow, config updated
- [ ] `vibe link` with `claude` CLI not installed → error with install instructions
- [ ] Config file correctly updated after successful link

## AI Prompt

Refactor `/workspaces/vibekit/src/commands/link/index.js` to remove all API key management and instead check if the `claude` CLI is natively installed. If installed, update the VibeKit config and create AI instructions. If not, show install instructions.

## Expected AI Output

A clean, refactored `link/index.js` that:
- Has no readline/API key logic
- Uses `spawn('claude', ['--version'])` to detect Claude Code
- Updates config and creates instructions on success
- Provides helpful install guidance on failure

## AI Workflow

Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.
