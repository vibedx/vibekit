---
id: TKT-036
title: Support --version and --help flags on the CLI
status: done
priority: medium
created: 2026-08-29
---

## Problem

Running `vibe --version`, `vibe -v`, `vibe --help`, or `vibe -h` errors out with
`❌ Command '--version' not found.` These are standard CLI conventions that users
expect to work. The version is only available by inspecting `package.json`.

## Solution

- Handle `--version` / `-v` by printing the version from `package.json`.
- Handle `--help` / `-h` by printing the same friendly help text shown when no
  command is given.
- Export `main` so the entry point can be unit tested.

## Acceptance Criteria

- `vibe --version` and `vibe -v` print the current version and exit 0.
- `vibe --help` and `vibe -h` print the help/commands list and exit 0.
- Existing commands are unaffected.
- Tests cover the new flags.
