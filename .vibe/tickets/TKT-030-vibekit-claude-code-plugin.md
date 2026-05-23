---
id: TKT-030
title: vibekit Claude Code plugin for marketplace distribution
slug: TKT-030-vibekit-claude-code-plugin
status: open
priority: medium
assignee: ""
author: maniyadv
created_at: 2026-05-23T00:00:00.000Z
updated_at: 2026-05-23T00:00:00.000Z
---

## Description

Build a vibekit plugin for the Claude Code plugin marketplace. This would package vibekit's capabilities as a native Claude Code plugin — installable via `/plugin install vibekit` — rather than requiring users to install the npm package separately and run CLI commands.

Reference: https://code.claude.com/docs/en/discover-plugins

### Why a plugin?

Currently vibekit requires `npm install -g @vibedx/vibekit` and manual CLI usage. A Claude Code plugin would:

1. **Zero-install experience** — users install via `/plugin install vibekit` inside Claude Code
2. **Native integration** — skills, agents, hooks, and MCP servers run inside Claude Code's lifecycle
3. **Auto-activation** — plugin hooks can detect `.vibe/` directories and auto-load context
4. **Marketplace discovery** — users find vibekit through the plugin browser, not npm search
5. **Team distribution** — orgs can add vibekit plugin to their managed plugins for all engineers

### What the plugin would contain

**Skills** (from existing `skills/vibekit/SKILL.md`):
- Vibekit workflow skill — teaches Claude the ticket-driven workflow
- Could add specialized skills: `ticket-writer`, `code-reviewer`, `test-planner`

**Agents** (`.claude/agents/` definitions):
- `ticket-worker` — agent that picks up a ticket, works in a worktree, opens a PR
- `reviewer` — agent that reviews PRs against ticket acceptance criteria
- `test-writer` — agent that generates tests from ticket descriptions

**Hooks**:
- `SessionStart` — detect `.vibe/` directory, load ticket context
- `UserPromptSubmit` — intercept "work on TKT-XXX" patterns, route to ticket workflow
- `PostToolUse` — after git commits, auto-update ticket status

**MCP Servers** (optional, future):
- Expose vibekit ticket operations as MCP tools (create, list, update, close tickets)
- Enables Claude to manipulate tickets without shelling out to CLI

**Plugin manifest** (`.claude-plugin/plugin.json`):
```json
{
  "name": "vibekit",
  "displayName": "VibeKit — Ticket-Driven Development",
  "version": "0.1.0",
  "description": "Structured ticket workflows, agent orchestration, and worktree isolation for AI-assisted development",
  "author": "vibedx",
  "repository": "https://github.com/vibedx/vibekit",
  "keywords": ["tickets", "workflow", "agents", "worktrees"]
}
```

### Distribution strategy

**Phase 1:** Publish to `anthropics/claude-plugins-community` (community marketplace)
- Submit PR to community marketplace repo
- Plugin lives in vibekit repo (no separate repo needed)
- Install: `/plugin install vibekit` (simplest — no marketplace qualifier needed)

**Phase 2:** Custom marketplace at `vibedx/plugins`
- Host our own marketplace for the vibedx ecosystem
- `/plugin marketplace add https://github.com/vibedx/plugins`
- Install: `/plugin install vibekit@vibedx-plugins`

**Phase 3:** Apply for `claude-plugins-official` (official marketplace)
- Once plugin is mature and has adoption

### Plugin Install Naming

The Claude Code syntax is `/plugin install <name>@<marketplace>`. Best options:
- *Community marketplace (Phase 1):* `/plugin install vibekit` — cleanest, no qualifier
- *Own marketplace (Phase 2):* `/plugin install vibekit@vibedx-plugins` — if we name the marketplace repo `vibedx/plugins`
- The original `vibekit@vibedx-vibekit` was redundant. `vibedx@vibekit` would mean plugin "vibedx" from marketplace "vibekit" — backwards. Best path: community marketplace first for the clean `/plugin install vibekit` syntax.

## Acceptance Criteria

- [ ] Plugin directory structure follows Claude Code plugin spec
- [ ] `plugin.json` manifest with correct metadata
- [ ] Vibekit workflow skill packaged as plugin skill
- [ ] At least one agent definition (ticket-worker)
- [ ] At least one hook (SessionStart for .vibe/ detection)
- [ ] Plugin loads correctly with `claude --plugin-dir ./vibekit-plugin`
- [ ] README with installation instructions
- [ ] Submitted to community marketplace (or ready to submit)

## Code Quality

- [ ] Plugin lives in the vibekit repo (`.claude-plugin/` at root or `plugin/` directory)
- [ ] Skills and agents are well-documented with clear trigger conditions
- [ ] Hook scripts are minimal and fast (don't slow down Claude Code startup)
- [ ] Tests for hook logic and skill content validation

## Implementation Notes

### Plugin directory layout

```
vibekit-plugin/
  .claude-plugin/
    plugin.json              # Manifest
  skills/
    vibekit-workflow/
      SKILL.md               # Main vibekit skill (port from skills/vibekit/SKILL.md)
    ticket-writer/
      SKILL.md               # Skill for writing well-structured tickets
  agents/
    ticket-worker.md         # Agent that works on tickets in worktrees
    reviewer.md              # Agent that reviews against acceptance criteria
  hooks/
    hooks.json               # Hook definitions
    detect-vibe.sh           # SessionStart hook to detect .vibe/
  settings.json              # Default settings (permissions, env vars)
  README.md
```

### Key decisions to make

1. **Separate repo vs. monorepo** — Decision: keep in vibekit repo. Plugin is a packaging layer over existing functionality, not a separate product. Simplifies maintenance and version sync. Community marketplace submission works from any repo structure.

2. **Plugin vs. npm package overlap** — the plugin provides the Claude Code integration layer; the npm package provides the CLI. They complement each other. Users who want CLI use npm; users who want native Claude Code integration use the plugin; power users install both.

3. **Version sync** — plugin version doesn't need to match npm package version, but major features should be in sync.

### References

- Claude Code plugin docs: https://code.claude.com/docs/en/discover-plugins
- Community marketplace: `anthropics/claude-plugins-community`
- Plugin manifest schema in docs
- Existing vibekit skill: `skills/vibekit/SKILL.md`

## Design / UX Considerations

- Plugin should feel native — users shouldn't need to know about the npm package
- Skills should trigger automatically when `.vibe/` is present
- Agent definitions should be opinionated but configurable via `userConfig`
- Hooks should be fast and non-blocking

## Testing & Test Cases

- Plugin loads without errors via `claude --plugin-dir`
- Skills are discoverable and trigger on correct patterns
- Hooks fire on correct events
- Agent definitions are valid and spawn correctly
- Plugin works alongside the npm CLI package without conflicts

## AI Prompt

Create the vibekit Claude Code plugin following the directory structure and manifest spec above. Start by porting the existing skill from `skills/vibekit/SKILL.md`, then add agent definitions and hooks.

## Expected AI Output

A complete plugin directory ready for testing with `claude --plugin-dir` and submission to the community marketplace.

## AI Workflow

Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.
