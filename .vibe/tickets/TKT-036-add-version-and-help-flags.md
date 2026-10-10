---
id: TKT-036
title: Add --version and --help flags to CLI
slug: TKT-036-add-version-and-help-flags
status: in_progress
priority: medium
assignee: ""
author: ""
created_at: 2026-09-27T11:21:51.841Z
updated_at: "2026-09-27T11:24:14.835Z"
---

## Description

`vibe --version` and `vibe --help` currently fail. Both flags fall through the
dynamic command loader in `index.js`, hit `ERR_MODULE_NOT_FOUND`, print
`❌ Command '--version' not found.` and exit 1.

These are the two flags every user tries first on a published npm CLI, and they
are also what bug reports need ("what version are you on?"). They should work.

## Acceptance Criteria

- `vibe --version`, `vibe -v`, `vibe version` print the version from
  `package.json` and exit 0.
- `vibe --help`, `vibe -h`, `vibe help` print grouped usage with a one-line
  description per command and exit 0.
- Bare `vibe` shows the same help output (instead of the flat comma list).
- Unknown commands still exit 1 with the existing error.

## Code Quality

- No new runtime dependencies; read `package.json` version via `fs`, not an
  import assertion (Node 18 compatibility).
- Command descriptions live in one table next to `AVAILABLE_COMMANDS` so the two
  cannot drift.

## Implementation Notes

Handle the flags in `main()` before `executeCommand()` is reached. Group the
commands by lifecycle (setup / tickets / workflow / integrations) so the help is
scannable rather than a 20-item wall.

## Testing & Test Cases

- `vibe --version` / `-v` / `version` → version string, exit 0.
- `vibe --help` / `-h` / `help` and bare `vibe` → usage text, exit 0.
- `vibe bogus` → error, exit 1.

## AI Workflow

<!-- NOTE (Do not remove) -->
Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.
