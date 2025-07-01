---
id: TKT-011
title: Implement Ticket Review Command for Git Diff Comparison
slug: TKT-011-implement-ticket-review-diff-command
status: open
priority: medium
created_at: 2025-07-01T22:28:03.926Z
updated_at: 2025-07-01T22:31:31.820Z
---

## Description

Implement `vibe review <ticket-id>` command to compare codebase state changes between ticket closure and current HEAD. Enable developers to validate implementation against original requirements, track code evolution, and identify post-ticket modifications. Command uses Git's diff capabilities to highlight added, modified, and removed code.

## Acceptance Criteria

1. Execute `vibe review <ticket-id>` to display git diff between ticket closure commit and HEAD
2. Validate ticket ID format (TKT-XXX) and existence in .vibe/tickets
3. Show terminal diff with color coding: green (additions), red (deletions), white (context)
4. Display meaningful errors for: invalid ticket format, nonexistent ticket, missing git history
5. Handle both closed tickets (diff from closure) and in-progress tickets (diff from start)
6. Support --no-color flag for CI environments

## Code Quality

1. Structure command module in `src/commands/review/index.js`
2. Leverage existing `src/utils/git.js` for commit operations
3. Use `ErrorHandler` for consistent error management
4. Implement ticket validation using `TicketValidator` class
5. Add comprehensive JSDoc for public methods
6. Follow command pattern from `src/commands/lint`

## Implementation Notes

1. Create review command module with validate() and execute() methods
2. Use `git rev-parse` to locate ticket closure commit hash
3. Implement `git diff <commit>..HEAD` with color formatting
4. Read ticket metadata from `.vibe/tickets/<ticket-id>.md`
5. Register command in `src/commands/index.js`
6. Utilize `chalk` for terminal colors
7. Implement progress spinner via `ora`

## Design / UX Considerations

1. Display diff with syntax highlighting and line numbers
2. Show loading spinner during git operations
3. Include ticket summary in output header
4. Provide clear --help documentation
5. Support --patch flag for interactive review
6. Exit with non-zero code on errors

## Testing & Test Cases

1. Test against tickets: closed, in-progress, invalid format
2. Verify diff output matches git standards
3. Test error handling: missing tickets, no git history
4. Validate color output and --no-color flag

## AI Prompt

Create `vibe review` command to compare codebase changes between ticket closure and current state. Implement using Git utilities, proper error handling, and clear diff output formatting.

## Expected AI Output

Complete review command implementation in `src/commands/review` with error handling, Git integration, tests, and help documentation.

## AI Workflow

1. Use `vibe start` to begin implementation
2. Update ticket with progress
3. Test command functionality
4. Use `vibe close` upon completion
