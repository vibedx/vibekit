---
id: TKT-001
title: Implement vibe init command
status: open
priority: high
created_at: 2025-05-26
---

## Description

Implement the `vibe init` command which creates a `.vibe/` folder in the user's repository and sets up the necessary configuration files. This command is the entry point for users to start using VibeKit in their projects.

## Requirements

- Create a `.vibe/` directory in the user's repository
- Generate a default `config.yml` file with sensible defaults
- Create a `tickets/` subdirectory for storing ticket files
- Provide feedback to the user about successful initialization
- Handle cases where VibeKit is already initialized

## Acceptance Criteria

- Running `vibe init` in a new repository creates all necessary files and directories
- The command is idempotent (can be run multiple times without issues)
- Clear success/error messages are displayed to the user
