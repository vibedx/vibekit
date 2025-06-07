---
id: TKT-006
title: Add command to start work on a ticket and checkout its branch
slug: TKT-006-add-command-to-start-work
status: done
priority: medium
created_at: 2025-06-07T10:52:27.318Z
updated_at: 2025-06-07T12:23:04.995Z
---

## Description

Implement a CLI command that allows a developer to start work on a ticket by checking out the corresponding git branch (creating it if it does not exist). The command should streamline the process of switching context to a new ticket, ensure branch naming consistency, and optionally update the ticket status to "in progress" in the ticketing system. The command should provide clear feedback to the user about the actions performed.

## Acceptance Criteria

- A CLI command (e.g., `vibe start <ticket-id>`) is available.
- If the branch for the ticket does not exist, it is created from the appropriate base (e.g., `main` or `develop`).
- If the branch exists, it is checked out.
- The command outputs a clear summary of what actions were taken.
- Branch naming follows a configurable pattern, with support for optional prefixes (e.g., `feature/`).
- (Optional) The ticket status is updated to "in progress" in the ticketing system.
- Errors are handled gracefully (e.g., invalid ticket ID, git errors).

## Notes

The branch naming convention should be configurable, with a default format of `TKT-<id>-<slugified-title>` (e.g., `TKT-006-add-command`). Users should be able to specify an optional prefix (like `feature/`) in their configuration. Consider supporting both local and remote branches, and coordinate on the preferred base branch for new tickets.

## Design / UX Considerations

<!-- Add any design links (Figma, etc.) or UX considerations here. -->
The command should provide clear, user-friendly feedback and, if updating ticket status, confirm with the user before making changes.

## AI Prompt

Implement a CLI command for starting work on a ticket as described above. Ensure the command is robust, user-friendly, and follows best practices for developer tooling. Include configuration options for branch naming conventions.

## Expected AI Output

Source code for the CLI command, with example usage and output. Include configuration handling for branch naming patterns. Integration with the ticketing system API is optional.