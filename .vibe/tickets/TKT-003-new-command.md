---
id: TKT-003
title: Implement `vibe new` command
status: done
priority: high
created_at: 2025-05-27T00:00:00.000Z
updated_at: 2025-05-27T00:00:00.000Z
slug: TKT-003-implement-vibe-new-command
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

## Code Quality
<!-- List the specific conditions that must be met for this ticket to be considered complete. -->


## Implementation Notes
<!-- Technical details, references, or implementation context that might be helpful. -->


## Design / UX Considerations
<!-- Add any design links (Figma, etc.) or UX considerations here. -->


## Testing & Test Cases
<!-- Brief, focused test cases and verification steps. Keep concise. -->


## AI Workflow
<!-- NOTE (Do not remove) -->
Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.