---
id: TKT-022
title: Add git worktree support for parallel ticket work
slug: TKT-022-add-git-worktree-support-for
status: open
priority: medium
assignee: "opusaku"
author: ""
created_at: 2026-04-11T12:05:08.135Z
updated_at: 2026-04-11T12:05:08.135Z
approval_ts: "1777721492.624489"
approval_channel: "C0ARRPJ3RJT"
approval_state: "pending"
---

## Description

Add git worktree support to vibekit so agents and developers can work on multiple tickets in parallel without thrashing a single working directory.

Currently `vibe start TKT-XXX` creates a branch and switches to it — blocking any other work until the branch is merged or stashed. With worktrees, each ticket gets its own checkout under a configurable path (default `~/.vibekit/worktrees/<repo-name>/<branch>/`), so multiple tickets can be worked on simultaneously — especially useful when multiple agents collaborate on the same repo without conflicts, or when a human reviews one ticket while another is in progress.

## Acceptance Criteria

- [ ] New flag `vibe start TKT-XXX --worktree` creates a git worktree instead of switching branches in the current directory
- [ ] Worktree path configurable via `config.yml` (default `~/.vibekit/worktrees/<repo-name>/<branch>/`)
- [ ] Worktree paths are outside the repo (prevents npm/eslint/jest tooling interference)
- [ ] `vibe close TKT-XXX` cleans up the worktree after closing
- [ ] `vibe list` shows which tickets have active worktrees
- [ ] Supports parallel agent workflows (multiple agents working on different features without conflicts)
- [ ] Handles edge cases: worktree already exists, dirty worktree, detached HEAD
- [ ] Cross-platform compatible (Linux, macOS, Windows) via `os.homedir()`
- [ ] Documented in README and SKILL.md
- [ ] Unit tests covering worktree create/remove/list

## Code Quality

<!-- List the specific conditions that must be met for this ticket to be considered complete. -->

## Implementation Notes

**Worktree Location: `~/.vibekit/worktrees/<repo-name>/<branch>/`**
- Outside the repo prevents npm/eslint/jest/etc from traversing into worktree subdirectories
- Cross-platform via `os.homedir()` (works Linux, macOS, Windows)
- Persistent across reboots (unlike `/tmp`)
- Repo name derived from `git remote get-url origin` or current dir name as fallback
- Branch name used as final path segment for clear identification

**Parallel Agent Support**
- Each worktree is a fully independent working directory with isolated `node_modules`, `.git` state, and lock files
- Multiple agents can safely work on different features in parallel (different worktrees = different branches = no lock conflicts)
- Config is shared from main repo via `getConfig()` which resolves relative to current working directory
- Git prevents accidental branch conflicts: if one worktree has a branch checked out, another can't check it out

**Files to modify:**
- `src/utils/git.js` — Add `createWorktree(repo, branch)`, `removeWorktree(path)`, `listWorktrees(repoName)` wrappers
- `src/utils/path.js` (new) — Add `getWorktreePath(repoName, branch)` helper using `os.homedir()`
- `src/commands/start/index.js` — Parse `--worktree` flag; call `createWorktree()` when set
- `src/commands/close/index.js` — Detect and remove active worktree
- `src/commands/list/index.js` — Cross-reference `git worktree list` with ticket branches
- `.vibe/config.yml` — Add optional `git.worktrees_path_override` for custom paths

## Design / UX Considerations

<!-- Add any design links (Figma, etc.) or UX considerations here. -->

## Testing & Test Cases

<!-- Brief, focused test cases and verification steps. Keep concise. -->

## AI Prompt

<!-- Add the AI instructions or input prompt here. For example, explain what needs to be generated or reviewed by AI. -->

## Expected AI Output

<!-- (Optional) Describe the kind of output or format you expect from the AI — code, checklist, response, etc. -->

## AI Workflow

<!-- NOTE (Do not remove) -->
Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.