---
id: TKT-023
title: Add `vibe skills` command for one-command skill installation
slug: TKT-023-add-vibe-skills-command
status: done
priority: medium
assignee: "opusaku"
author: "opusaku"
created_at: 2026-05-04T00:00:00.000Z
updated_at: 2026-05-04T00:00:00.000Z
---

## Description

Add a `vibe skills` CLI command that wraps `npx skills` to provide a convenient way to install, remove, and list skills for AI agents (Claude Code, etc.).

### Features
- `vibe skills` — installs the vibekit skill by default (`vibedx/vibekit`)
- `vibe skills add <repo>` — install any skill from a GitHub repo
- `vibe skills remove` — remove an installed skill
- `vibe skills list` — list installed skills
- Passes through flags to the underlying `npx skills` package (e.g. `--skill`)

### Context
- PR #37 implements this on branch `feat/skills-command`
- The command is a wrapper around the `skills.sh` / `npx skills` ecosystem
- Users can also install vibekit directly via `npx skills add vibedx/vibekit`

## Acceptance Criteria
- [ ] `vibe skills` command registered and working
- [ ] Subcommands: add, remove, list
- [ ] Default behavior installs vibekit skill
- [ ] README updated with usage
- [ ] Tests passing
