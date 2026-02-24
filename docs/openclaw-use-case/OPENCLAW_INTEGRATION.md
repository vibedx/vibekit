# VibeKit + OpenClaw Integration Guide

## Overview

VibeKit integrates seamlessly with OpenClaw for AI-powered project management and autonomous task delegation.

## Use Case: Team Project with AI Agents

### Scenario
You have a project (e.g., test app with user login, API integrations, monitoring). You want to:
1. Create tickets in VibeKit for each feature
2. Dispatch work to AI agents (Opus, Haiku, Claude Code)
3. Track progress in real-time
4. Auto-manage git branches for each ticket

### Workflow

#### 1. Initialize VibeKit
```bash
cd ~/Projects/my-project
npx vibe init
```

#### 2. Create Tickets
```bash
vibe new "Add user login"
vibe new "Integrate Polymarket API"
vibe new "Setup cron for monitoring health"
```

#### 3. View All Tickets
```bash
vibe list
```

Output:
```
TKT-001 | Add user login | open
TKT-002 | Integrate Polymarket API | open
TKT-003 | Setup cron for monitoring health | open
```

#### 4. Start Work (Switch to Branch)
```bash
vibe start TKT-001
```

This:
- Creates branch `TKT-001-add-user-login`
- Updates ticket status to `in_progress`
- Checks out the branch locally

#### 5. Dispatch to AI Agent (OpenClaw)
```bash
# Spawn Opus to work on TKT-001 and TKT-002
sessions_spawn(task="Work on TKT-001 and TKT-002 in ~/Projects/my-project using vibe CLI...", model="anthropic/claude-opus-4-6")
```

The agent will:
- Read ticket details
- Call `vibe start TKT-001`
- Implement the feature
- Update the ticket with notes
- Call `vibe close TKT-001` when done

#### 6. Monitor Progress
```bash
vibe list
```

Track statuses as agents update tickets.

#### 7. Close Ticket
```bash
vibe close TKT-001
```

This:
- Updates status to `done`
- Closes the feature branch

## Screenshots

### Creating First Ticket
![Ticket Creation](./01-create-ticket.jpg)

### Batch Operations
![Multiple Tickets](./02-add-tickets.jpg)

### Project Structure
![Project Structure](./03-project-structure.jpg)

## Commands Quick Reference

| Command | Effect |
|---------|--------|
| `vibe new "<title>"` | Create new ticket |
| `vibe list` | Show all tickets |
| `vibe start <ID>` | Begin work (creates branch) |
| `vibe close <ID>` | Mark done, close branch |
| `vibe link --api-key <key>` | Setup OpenClaw agent config |
| `vibe refine <ID>` | AI-powered ticket enhancement |

## Configuration

Edit `.vibe/config.yml` to:
- Set AI provider (claude-code, Opus, Haiku)
- Configure status options
- Set git branch prefix
- Enable/disable hooks

## Tips

- **Batch creation**: Create 5-10 tickets upfront, then delegate to agents
- **Atomic tickets**: Keep tickets small (1-2 days of work)
- **Status tracking**: Use `vibe list` during heartbeat checks
- **Agent delegation**: Spawn multiple agents in parallel for different tickets
- **Context**: Reference image URLs and Figma links in ticket descriptions

---

For more: https://github.com/vibedx/vibekit
