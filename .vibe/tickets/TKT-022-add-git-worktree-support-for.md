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
---

## Description

Add git worktree support to vibekit so agents and developers can work on multiple tickets in parallel without thrashing a single working directory.

Currently `vibe start TKT-XXX` creates a branch and switches to it — blocking any other work until the branch is merged or stashed. With worktrees, each ticket gets its own checkout under a configurable path (e.g. `.vibe/worktrees/TKT-XXX-slug/`), so multiple tickets can be worked on simultaneously — especially useful when multiple agents collaborate on the same repo or when a human reviews one ticket while another is in progress.

## Acceptance Criteria

- [ ] New flag `vibe start TKT-XXX --worktree` creates a git worktree instead of switching branches in the current directory
- [ ] Worktree path configurable via `config.yml` (default `.vibe/worktrees/`)
- [ ] `vibe close TKT-XXX` cleans up the worktree after closing
- [ ] `vibe list` shows which tickets have active worktrees
- [ ] Handles edge cases: worktree already exists, dirty worktree, detached HEAD
- [ ] Documented in README and SKILL.md
- [ ] Unit tests covering worktree create/remove/list

## Code Quality

<!-- List the specific conditions that must be met for this ticket to be considered complete. -->

## Implementation Notes

<!-- Technical details, references, or implementation context that might be helpful. -->

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