---
id: TKT-010
title: Add Lint Command to Validate Ticket Documentation Formatting
slug: TKT-010-add-lint-command-to-validate-tickets
status: in_progress
priority: medium
created_at: 2025-07-01T21:46:03.461Z
updated_at: 2025-07-01T22:17:44.215Z
---

## Description

Implement a new `vibe lint` command to ensure ticket documentation follows consistent formatting and content standards. The command should validate markdown structure, required sections, and content quality across all tickets in the .vibe/tickets directory.

## Acceptance Criteria

- Create `src/commands/lint/index.js` with command implementation
- Command validates presence of all required ticket sections
- Command checks markdown formatting and structure
- Command returns clear error messages for validation failures
- Add command to CLI options in `src/utils/cli.js`
- Add unit tests for lint command functionality
- Update help documentation to include lint command usage

## Code Quality

- Follow existing command structure pattern in `src/commands`
- Use JSDoc comments for function documentation
- Implement modular validation functions for maintainability
- Add comprehensive error handling
- Follow existing naming conventions and code style
- Keep functions focused and single-purpose
- Use existing utility functions where applicable

## Implementation Notes

- Use `marked` or similar package for markdown parsing
- Implement validation rules as separate, reusable functions
- Add constants for required sections and validation rules
- Consider adding a `--fix` flag for auto-formatting
- Integrate with existing error handling system
- Follow command pattern from other commands like `start` and `close`

## Design / UX Considerations

- Provide clear, actionable error messages
- Include examples in help text
- Consider colorized output for better readability
- Show progress for multiple file validation

## Testing & Test Cases

- Validate command correctly identifies missing required sections
- Verify proper handling of malformed markdown
- Test error message clarity and usefulness
- Ensure command works recursively through ticket directories

## AI Prompt

Please implement the lint command following the project's code structure and testing patterns. Focus on validating ticket documentation format and required sections.

## Expected AI Output

Working lint command implementation with tests, following project patterns and maintaining high code quality standards.

## AI Workflow

Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.