---
id: TKT-024
title: vibe start agent enhancements - non-worktree mode, timeout, full tool access
slug: TKT-024-vibe-start-agent-enhancements
status: done
priority: high
assignee: opus
author: opus
created_at: "2026-05-09T00:00:00.000Z"
updated_at: "2026-05-09T00:00:00.000Z"
---

## Description

Enhance `vibe start` to support spawning Claude agents without requiring worktree mode (`-w`). Currently `--agent` requires `-w`, but for a single ticket the agent should be able to work in the current repo directory. Also make agents long-running with a configurable timeout (default 15 minutes) and grant full tool access.

## Acceptance Criteria

- [x] `vibe start TKT-001 --agent` works without `-w` flag (spawns agent in current directory)
- [x] Agent timeout defaults to 15 minutes (900 seconds)
- [x] Timeout is configurable via `.vibe/config.yml` under `agent.timeout`
- [x] Agents are spawned with all tool access (no restricted `--allowedTools` list)
- [x] Multiple tickets with `-w --agent` still work as before
- [x] Tests updated for new behavior

## Implementation Notes

- Remove the guard that requires `-w` with `--agent`
- Add `agent` section to config schema: `agent.timeout` (default: 900)
- Pass `--timeout` flag to claude CLI
- Remove `--allowedTools` restriction from spawn call
- When `--agent` is used without `-w` for a single ticket, spawn in cwd

## AI Workflow

Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done.
