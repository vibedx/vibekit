---
id: TKT-002
title: Implement vibe close command
status: done
priority: high
created_at: 2025-05-27T00:00:00.000Z
---

## Description

Implement the `vibe close` command to allow users to mark a ticket as done. This command should update the `status` in the ticket's frontmatter to `done`. Optionally, if the config has `use_status_folders: true`, the ticket file should be moved to `.vibe/tickets/done/`.

## Requirements

- Accept a ticket ID (e.g., `vibe close TKT-001`)
- Parse the ticket file and update `status` to `done`
- If `use_status_folders: true` is set in `config.yml`, move the file to `tickets/done/`
- Maintain YAML formatting
- Show a success message

## Acceptance Criteria

- Ticket is updated with `status: done`
- Moved to correct folder if configured
- Errors gracefully if ticket ID is missing or invalid
- Provides clear feedback about the operation's success or failure
- Handles edge cases (e.g., ticket already closed, file permissions)
