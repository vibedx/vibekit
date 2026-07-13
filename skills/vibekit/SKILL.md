---
name: vibekit
description: Ticket-driven development workflow for AI coding agents using VibeKit CLI. Use when the user asks to create a task, feature, bug fix, or ticket; mentions "vibe new", "vibe list", or vibekit commands; or wants structured, scoped work breakdown. Triggers on phrases like "add a ticket", "track this task", "break this down", or "start a new feature". Helps agents create focused tickets with clear acceptance criteria before writing code.
license: MIT
---

# VibeKit — Ticket-Driven Development

VibeKit is a CLI for managing development tickets and AI-assisted workflows. This skill teaches agents how to use vibekit properly — create tickets before coding, work through them systematically, and keep tickets as living documentation.

## 🔴 MANDATORY RULE: Always Create a Ticket First

**Before writing ANY code on a repo that has a `.vibe/` directory, you MUST create a vibekit ticket.** No exceptions for features, bug fixes, refactors, or multi-step tasks.

This is not a suggestion — it's the core workflow. If the user asks you to "add X", "fix Y", or "build Z", your first action should be:

```bash
vibe new "descriptive title" --assignee <your-username> --priority <level> -n
```

Then read the ticket, plan the work, and `vibe start TKT-XXX` before touching any code.

**Only skip the ticket for truly trivial changes**: typo fixes, single-line config tweaks, or answering a quick question.

## 🔴 MANDATORY RULE: Detail the Ticket Before Writing Code

**Before writing ANY code on a ticket, the ticket must be documented.** Tickets are often created with empty sections (just HTML comment placeholders). Do not start implementing against an empty ticket.

When you `vibe start` a ticket:

1. Read the ticket file.
2. Check whether **Description**, **Acceptance Criteria**, and **Implementation Notes** have real content (a section that contains only whitespace or `<!-- ... -->` comments counts as empty).
3. If any are empty, fill them in based on:
   - The ticket title
   - Your understanding of the codebase
   - The context from the conversation
4. Commit the updated ticket file with message `docs: add details to TKT-XXX`.
5. Only then proceed to implementation.

This applies to every AI tool using vibekit, not just Claude. `vibe start` warns when key sections are empty; `vibe start --agent` prepends this instruction to the agent's prompt automatically. Pass `--skip-detail-check` only for intentionally minimal tickets.

## Why This Matters

Tickets break work into scoped, focused chunks that reduce AI drift and create documentation as a side effect. They also give humans a clear trail of what was done and why — critical for collaboration between humans and agents.

```bash
# 1. Create a ticket
vibe new "Add user authentication" --assignee <username> --priority high -n

# 2. Start working (creates git branch feature/TKT-XXX-slug)
vibe start TKT-001

# 3. Implement the work, commit with ticket reference
git commit -m "TKT-001: add login endpoint"

# 4. Close when done
vibe close TKT-001
```

## Installation

```bash
npm install -g @vibedx/vibekit
```

Then in any project:
```bash
vibe init          # Creates .vibe/ directory with config, team, templates
```

## Core Commands

| Command | Purpose |
|---------|---------|
| `vibe init` | Initialize vibekit in a project |
| `vibe new "title"` | Create a ticket |
| `vibe list` | List all tickets |
| `vibe ready <id>` | Mark a ticket ready for agent pickup (swarm) |
| `vibe start <id>` | Start work (creates git branch) |
| `vibe start <id> --worktree` | Start work in a separate worktree |
| `vibe start <id> --agent` | Spawn a Claude agent to work on the ticket |
| `vibe start <id> <id2> -w --agent` | Spawn agents in parallel worktrees |
| `vibe status` | Show active worktrees and ticket progress |
| `vibe pr` | Open a GitHub PR from the current ticket branch |
| `vibe pr --all` | Open PRs for all worktree branches |
| `vibe close <id>` | Mark ticket done (cleans up worktree if any) |
| `vibe lint` | Validate ticket format |
| `vibe lint --fix` | Auto-fix missing sections |
| `vibe refine <id>` | AI-enhance ticket details |
| `vibe plan to-ticket <file>` | Convert a saved plan into tickets (AI) |
| `vibe swarm` | Spawn parallel agents across `ready` tickets in worktrees |
| `vibe team` | Manage team members |

## Creating Tickets (for AI agents)

**Always use `-n` / `--no-interactive` when creating tickets programmatically.** This skips the AI enhancement prompt which would otherwise block automation.

```bash
vibe new "Fix login redirect loop" --assignee alice --priority high -n
vibe new "Add dark mode" --assignee bob --author alice -n
```

### Useful flags

- `--priority low|medium|high|critical` (default: medium)
- `--status open|in_progress|review|done` (default: open)
- `--assignee <username>` — who works on it
- `--author <username>` — who created it
- `-d` / `--description "text"` — pre-fill the Description section
- `--acceptance-criteria "- [ ] criterion 1\n- [ ] criterion 2"` — pre-fill Acceptance Criteria
- `-n` / `--no-interactive` — skip AI enhancement prompt

**AI agents should always provide `--description` and `--acceptance-criteria` when creating tickets.** This ensures tickets are actionable immediately without needing `vibe refine`. Fill in as much detail as possible based on the task context.

## Ticket Structure

Tickets live in `.vibe/tickets/` as markdown files with YAML frontmatter:

```markdown
---
id: TKT-001
title: Add user authentication
slug: TKT-001-add-user-authentication
status: open
priority: high
assignee: "alice"
author: "bob"
created_at: 2026-04-11T10:00:00Z
updated_at: 2026-04-11T10:00:00Z
---

## Description
What needs to be done and why.

## Acceptance Criteria
- [ ] Concrete checkbox 1
- [ ] Concrete checkbox 2

## Implementation Notes
Technical details, file paths, API references.

## Testing & Test Cases
Brief test scenarios.
```

## Filtering Tickets

```bash
vibe list                       # All tickets
vibe list --status=open         # Only open
vibe list --assignee=alice      # Only alice's tickets
```

## Team Management

Teams are stored in `.vibe/team.yml`. Assignee values in tickets should match team member IDs.

```bash
vibe team add alice --name "Alice" --github alice --slack U0ABC123 --role Engineer
vibe team                       # List members
vibe team show alice            # Show one member
```

## When to Use This Skill

Apply vibekit workflow when:

- User asks to "add a feature", "fix a bug", "implement X", "build Y"
- Task is non-trivial (more than a one-line fix)
- Work touches multiple files or requires planning
- User mentions `vibe`, tickets, tracking, or task management
- Working in a project that has a `.vibe/` directory

**Don't force tickets for trivial changes** — typo fixes, config tweaks, or single-line edits can skip the ticket workflow.

## Integration with Git

`vibe start TKT-001` automatically:
1. Creates branch `feature/TKT-001-<slug>` (or configured prefix)
2. Updates ticket status to `in_progress`
3. Switches to the new branch

`vibe close TKT-001`:
1. Updates ticket status to `done`
2. Leaves the branch for manual merge/PR

### Worktree Support (Parallel Development)

Use `--worktree` / `-w` to work on multiple tickets simultaneously without switching branches:

```bash
# Start ticket in a dedicated worktree
vibe start TKT-002 --worktree

# The worktree is created at ~/.vibekit/worktrees/<repo>/<branch>/
# Your main working directory stays on its current branch
# cd into the worktree path to work on the ticket

# Close automatically removes the worktree
vibe close TKT-002

# If the worktree has uncommitted changes, use --force
vibe close TKT-002 --force
```

`vibe list` shows a 🌿 indicator next to tickets with active worktrees.

### Spawning Claude Agents

Use `--agent` to spawn a Claude Code agent that autonomously works on a ticket:

```bash
# Single ticket — agent works in the current directory
vibe start TKT-003 --agent

# Multiple tickets — each gets its own worktree + agent
vibe start TKT-003 TKT-004 TKT-005 -w --agent
```

Agents automatically:
- Read the ticket requirements and implement the work
- Commit changes with ticket references
- Mark the ticket as `done` when complete (or `in_progress` if further changes needed)
- Have full tool access (git, file I/O, CLI)
- Receive the vibekit skill context so they know how to use vibe commands

Agent timeout defaults to 15 minutes (900s). Configure in `.vibe/config.yml`:

```yaml
worktree:
  agent:
    timeout: 900  # seconds
```

### Opening Pull Requests

Use `vibe pr` to open GitHub PRs from ticket branches:

```bash
# PR for the current branch
vibe pr

# PRs for specific tickets
vibe pr TKT-003 TKT-004

# PRs for all worktree branches
vibe pr --all

# Draft PR
vibe pr --draft
```

PR title and body are auto-populated from ticket content. Ticket status is set to `review`.

### Plans → Tickets

When you (Claude) produce an implementation plan, save it to `.vibe/plans/` as a
markdown file, then turn it into tickets:

```bash
# Preview the tickets vibekit would extract from a plan (no files written)
vibe plan to-ticket .vibe/plans/my-feature.md

# Create the tickets once the breakdown looks right
vibe plan to-ticket .vibe/plans/my-feature.md --auto

# Dry-run shows the extracted items without creating anything
vibe plan to-ticket .vibe/plans/my-feature.md --dry-run
```

The command sends the plan to Claude, which extracts discrete work items
(title, description, acceptance criteria, priority, estimate) and writes one
ticket per item to `.vibe/tickets/`. Default is preview-then-confirm: it shows
the breakdown and only writes files when you pass `--auto`. Chain it with
`vibe start TKT-XXX` to begin work.

### Swarming (Parallel Agents)

`vibe swarm` spins up multiple Claude agents at once, each in its own worktree,
to burn down a batch of tickets in parallel:

```bash
# Swarm all open tickets (capped by config swarm.maxAgents, default 3)
vibe swarm

# Limit the number of concurrent agents
vibe swarm --count 5

# Only swarm tickets matching a filter (frontmatter key:value)
vibe swarm --filter priority:high

# Use a specific base branch for the worktrees
vibe swarm --base main

# Check on a running swarm
vibe swarm status
```

Configure caps and timeout in `.vibe/config.yml`:

```yaml
swarm:
  maxAgents: 3
  timeout: 900  # seconds
```

### Monitoring Progress

```bash
# Show active worktrees and agent status
vibe status

# List in-progress tickets
vibe list --status=in_progress
```

## Automation Pattern

For bots and automated agents working through tickets:

```bash
# Find open tickets assigned to you
vibe list --assignee=mybotname --status=open

# For each ticket:
# 1. Read .vibe/tickets/TKT-XXX-*.md for full context
# 2. Do the work on branch feature/<ticket-id>-<slug>
# 3. Commit changes
# 4. Open PR: vibe pr
# 5. Close: vibe close TKT-XXX
```

## Links

- Repo: https://github.com/vibedx/vibekit
- npm: https://www.npmjs.com/package/@vibedx/vibekit
- Issues: https://github.com/vibedx/vibekit/issues
