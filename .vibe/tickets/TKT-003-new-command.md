---
id: TKT-003
title: Implement `vibe new` command
status: done
priority: high
created_at: 2025-05-27T00:00:00.000Z
updated_at: 2025-05-27T00:00:00.000Z
---

## Description
Implement the `vibe new` command to create a new ticket based on the default template.

## Acceptance Criteria
- Reads config file to get template path and tickets folder
- Accepts title as argument (e.g. `vibe new "Implement login"`)
- Auto-generates ticket ID by scanning existing files (e.g., TKT-003)
- Replaces placeholders in the template: `{id}`, `{title}`, `{date}`
- Sets `created_at` and `updated_at` to current date
- Saves the new ticket in the configured tickets folder
- Prints success message with file path

## Notes
This is one of the core user-facing commands in the CLI. Ensure it fails gracefully if config or template is missing.

## AI Prompt
Generate a CLI command that reads a markdown template, fills in dynamic frontmatter values, and saves a new file in a specified directory.

## Expected AI Output
A working Node.js function that reads from a Markdown template, replaces tags like `{id}`, `{title}`, and `{date}`, and writes the result to a new file.
