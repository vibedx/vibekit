---
id: TKT-004
title: Implement `vibe list` command
status: done
priority: medium
created_at: 2025-05-27T14:15:11.764Z
updated_at: 2025-05-27T14:15:11.764Z
slug: TKT-004-implement-vibe-list-command
---

## Description  
Implement the `vibe list` command to display all existing tickets from the configured `.vibe/tickets/` directory. The command should parse ticket files, extract metadata from frontmatter, and render a clean list in the terminal.

This helps users get a quick view of all open, in-progress, or done tasks — similar to a terminal-based backlog.

## Acceptance Criteria
- Read `tickets.path` from `.vibe/config.yml`
- Parse all `.md` files in that folder
- Extract frontmatter fields:
  - `id`, `status`, `title`
- Display in terminal as a formatted table with columns for ID, status, and title
- Support filtering by status (e.g., `vibe list --status=open`)
- Sort by ID by default
- Show colored output based on status (green for done, yellow for in-progress, etc.)

## Notes
The list command is a core navigation feature that helps users quickly see what tickets exist and their current status. Consider adding pagination for projects with many tickets.

## AI Prompt
Generate a Node.js function that reads markdown files from a directory, extracts YAML frontmatter, and displays the data in a formatted table in the terminal.

## Expected AI Output
A JavaScript implementation that parses markdown files with frontmatter and renders a clean, formatted table in the terminal with proper colors and alignment.
<!-- (Optional) Describe the kind of output or format you expect from the AI — code, checklist, response, etc. -->

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