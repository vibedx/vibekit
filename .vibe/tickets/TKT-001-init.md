---
id: TKT-001
title: Implement vibe init command
status: done
priority: high
created_at: 2025-05-26T00:00:00.000Z
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
