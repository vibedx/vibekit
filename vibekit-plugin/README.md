# VibeKit — Claude Code Plugin

Ticket-driven development workflows for Claude Code. Install once; every project with a `.vibe/` directory gets structured ticket workflows, agent orchestration, and worktree isolation.

## Install

```
/plugin install vibekit
```

Or from the community marketplace browser in Claude Code.

## What's included

**Skills**
- `vibekit-workflow` — teaches Claude the full ticket-driven workflow (create → start → implement → close)
- `ticket-writer` — helps write well-structured tickets with actionable acceptance criteria

**Agents**
- `ticket-worker` — autonomous agent that reads a ticket, implements it, and closes it
- `reviewer` — reviews a completed ticket against its acceptance criteria

**Hooks**
- `SessionStart` — detects `.vibe/` directory and surfaces open ticket counts on session start

## Requirements

The VibeKit CLI is optional but recommended for full functionality:

```bash
npm install -g @vibedx/vibekit
```

Without the CLI, skills and agents still work — you just won't get the `vibe` commands for branch management and ticket status updates.

## Quick start

```bash
# In any project
vibe init                                    # set up .vibe/ directory
vibe new "Add user auth" --priority high -n  # create a ticket
vibe start TKT-001                           # start working (creates branch)
# ... implement the work ...
vibe close TKT-001                           # mark done
```

Or let an agent do it:

```bash
vibe start TKT-001 --agent   # spawns Claude agent to work on the ticket autonomously
```

## Links

- [VibeKit repo](https://github.com/vibedx/vibekit)
- [npm package](https://www.npmjs.com/package/@vibedx/vibekit)
- [Claude Code plugin docs](https://code.claude.com/docs/en/discover-plugins)
