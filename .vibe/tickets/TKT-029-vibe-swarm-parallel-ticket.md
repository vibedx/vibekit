---
id: TKT-029
title: vibe swarm — parallel ticket execution with agent teams
slug: TKT-029-vibe-swarm-parallel-ticket
status: done
priority: high
assignee: ""
author: maniyadv
created_at: 2026-05-23T00:00:00.000Z
updated_at: "2026-05-23T10:31:41.254Z"
---

## Description

Add a `vibe swarm` command that spins up multiple Claude Code agents in parallel, each working on a separate ticket from the backlog. Each agent gets its own git worktree for isolation and a structured ticket as its prompt context. This builds on existing primitives (`--agent`, `--worktree`, ticket parsing) and is the natural evolution of `vibe start TKT-001 TKT-002 -w --agent`.

Also extend `vibe init` with `--template <name>` support and an interactive picker for setting up CLAUDE.md, skills, and project conventions from curated templates.

### Ticket Status: `ready` (Option A)

Add a `ready` status between `open` and `in_progress`. Tickets start as `open` (draft/backlog). Author moves to `ready` when acceptance criteria are solid and the ticket is fully fleshed out. Swarm only picks up `ready` tickets — this prevents agents from grabbing half-written or poorly-specified tickets.

Status flow: `open` → `ready` → `in_progress` → `review` → `done`

- `vibe ready TKT-XXX` — mark a ticket as ready for agent pickup
- `vibe swarm` filters on `status:ready` by default
- Agents must NOT work on `open` tickets — those are drafts

### Swarm Core

- `vibe swarm` — grab all `status:ready` tickets and assign to agents
- `vibe swarm --count 3` — limit to N agents
- `vibe swarm --filter "priority:high"` — filter tickets before assignment
- `vibe swarm --dry-run` — show what would run without executing
- `vibe swarm status` — live dashboard of running agents

### Template System (init --template)

- `vibe init --template <name>` — initialize with a curated template
- `vibe init --template` (no name) — interactive picker
- Built-in templates: `default`, `react`, `node`, `python`, `karpathy` (official from multica-ai/andrej-karpathy-skills), `principal-engineer`
- Templates stored in `assets/templates/<name>/` with exact upstream content where applicable
- Templates bundle: CLAUDE.md conventions, `.claude/agents/` definitions, skills recommendations, `.claude/settings.json` presets
- `vibe templates list` — browse available templates

## Acceptance Criteria

- [ ] `ready` status added to ticket lifecycle (`open` → `ready` → `in_progress` → `review` → `done`)
- [ ] `vibe ready TKT-XXX` command marks tickets as ready for pickup
- [ ] `vibe swarm` command exists and spawns agents for `ready` tickets
- [ ] Each agent runs in its own worktree (reuses existing `createWorktree()`)
- [ ] Swarm state tracked in `.vibe/.state/swarm.json` with PIDs, ticket IDs, statuses
- [ ] `vibe swarm status` shows live agent progress table
- [ ] `vibe swarm --count N` caps concurrent agents
- [ ] `vibe swarm --filter` supports status and priority filtering
- [ ] `vibe swarm --dry-run` previews without executing
- [ ] Concurrency limit configurable via `swarm.maxAgents` in `.vibe/config.yml` (default: 3)
- [ ] Agent timeout enforcement (default 15min, configurable via `swarm.timeout`)
- [ ] Agents auto-close tickets and open PRs on completion
- [ ] `vibe init --template <name>` selects from built-in templates
- [ ] Interactive template picker when `--template` used without a name
- [ ] At least 3 built-in templates ship with the release

## Code Quality

- [ ] Existing agent-spawn + worktree-create logic extracted into shared helpers from `start/index.js`
- [ ] Swarm state file schema is clean and documented
- [ ] Tests cover: swarm creation, agent lifecycle, state tracking, template selection
- [ ] No breaking changes to existing `vibe start` behavior

## Implementation Notes

### Swarm Architecture — 3 new pieces

**1. Orchestrator (`src/commands/swarm/index.js`)**
- Loads tickets via `loadTicketsByStatus('ready')`, applies filters, respects `--count` cap
- Creates one worktree per ticket (reuses `createWorktree()` from `src/utils/git.js`)
- Spawns one Claude agent per worktree (extract spawn logic from `start/index.js`)
- Writes swarm state to `.vibe/.state/swarm.json`
- Config key `swarm.maxAgents` in `.vibe/config.yml` (default: 3)

**2. Agent Lifecycle Tracking**
Current agents are fire-and-forget (`spawn()` + `detach` + `unref`). For swarm add:
- PID polling — `kill(pid, 0)` on macOS to detect completion
- Exit hooks — each agent gets prompt instruction: "when done, run `vibe close TKT-XXX` and `vibe pr`"
- Timeout enforcement — kill agent if exceeds `swarm.timeout` (default 15min)
- State file updates as agents start/finish/fail

**3. Live Dashboard (`vibe swarm status`)**
- Reads `.vibe/.state/swarm.json` + checks PIDs
- Table: ticket ID, title, agent status, elapsed time, PR link
- Optional log tailing via `.vibe/.state/logs/TKT-XXX.log`

### Template System

- Templates stored in `assets/templates/<name>/` — each contains `claude.md` (exact upstream content where applicable, e.g. karpathy from multica-ai/andrej-karpathy-skills), optional `agents/`, optional `settings.json`
- `vibe init --template react` copies the react template's CLAUDE.md + agents into the project
- Interactive picker uses existing `arrow-select.js` utility
- Template registry can be extended via `vibe templates add <git-url>` (future)

### State File Schema

```json
{
  "id": "swarm-20260523-1",
  "started": "2026-05-23T10:00:00Z",
  "config": { "maxAgents": 3, "timeout": 900 },
  "agents": [
    { "ticket": "TKT-012", "pid": 48291, "status": "running", "worktree": "~/.vibekit/worktrees/repo/feature--TKT-012", "startedAt": "..." },
    { "ticket": "TKT-013", "pid": 48295, "status": "done", "pr": "#42", "finishedAt": "..." },
    { "ticket": "TKT-014", "pid": 48300, "status": "failed", "error": "timeout", "finishedAt": "..." }
  ]
}
```

### Files to modify/create

- `src/commands/swarm/index.js` — new command
- `src/commands/start/index.js` — extract shared helpers
- `src/commands/init/index.js` — add `--template` flag
- `src/utils/swarm.js` — swarm state management
- `assets/templates/` — template directory structure
- `index.js` — register `swarm` and `templates` commands
- `.vibe/config.yml` schema — add `swarm` section

## Design / UX Considerations

- Swarm output should show a clean summary table, not overwhelming log output
- `--dry-run` is essential for trust — users need to see what tickets will be assigned before committing
- Template picker should show name + one-line description for each template
- Error states (agent crash, timeout) should be clearly surfaced in `swarm status`

## Testing & Test Cases

- Unit: ticket filtering, state file read/write, PID checking
- Integration: swarm creation with mock agents, worktree lifecycle
- Edge cases: no open tickets, all agents timeout, swarm while another swarm is running
- Template: init with each built-in template, interactive picker flow

## AI Prompt

Implement the `vibe swarm` command and `vibe init --template` extension as described. Start with extracting shared helpers from `start/index.js`, then build the swarm orchestrator, then the template system.

## Expected AI Output

Working `vibe swarm` command with agent lifecycle tracking, state management, and live status dashboard. Working `--template` flag on `vibe init` with at least 3 built-in templates.

## AI Workflow

Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.
