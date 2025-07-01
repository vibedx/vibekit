---
id: TKT-001
title: Implement vibe init command
status: done
priority: high
created_at: 2025-05-26T00:00:00.000Z
slug: TKT-001-implement-vibe-init-command
updated_at: "2025-07-01T22:34:30.200Z"
---

## Description

Implement the `vibe init` command which creates a `.vibe/` folder in the user's repository and sets up the necessary configuration files. This command is the entry point for users to start using VibeKit in their projects.

## Requirements

- Support optional folder name argument in `vibe init [folderName]`
- Create a `.vibe/` directory in the user's repository
- Generate a default `config.yml` file with sensible defaults
- Create a `tickets/` subdirectory for storing ticket files
- Provide feedback to the user about successful initialization
- Handle cases where VibeKit is already initialized

## Acceptance Criteria

- Running `vibe init` in a new repository creates all necessary files and directories
- The command is idempotent (can be run multiple times without issues)
- Clear success/error messages are displayed to the user
- Running `vibe init folderName` creates the structure in the specified folder
- A test exists to validate folder creation, config file, and tickets directory
- Tests confirm idempotency and correct output messages

## Code Quality
<!-- List the specific conditions that must be met for this ticket to be considered complete. -->


## Implementation Notes
<!-- Technical details, references, or implementation context that might be helpful. -->


## Design / UX Considerations
<!-- Add any design links (Figma, etc.) or UX considerations here. -->


## Testing & Test Cases
<!-- Brief, focused test cases and verification steps. Keep concise. -->


## AI Prompt
<!-- Add the AI instructions or input prompt here. For example, explain what needs to be generated or reviewed by AI. -->


## Expected AI Output
<!-- (Optional) Describe the kind of output or format you expect from the AI — code, checklist, response, etc. -->


## AI Workflow
<!-- NOTE (Do not remove) -->
Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.