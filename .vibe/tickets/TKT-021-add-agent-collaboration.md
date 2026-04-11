---
id: TKT-021
title: Add agent collaboration workflow guide to docs
slug: TKT-021-add-agent-collaboration
status: done
priority: high
assignee: opusaku
author: ''
created_at: 2026-04-11T12:05:08.105Z
updated_at: 2026-04-11T12:07:13.766Z
---

## Description

Add a new docs page that shows teams how to use vibekit as the backbone for AI agent collaboration — multiple agents (or agents + humans) working across repos, picking up tickets, coordinating via shared team config, and communicating through whatever channels the team uses.

Goal: give a reference workflow anyone can adopt — generic, applicable to any team, any agent framework. No references to specific projects, users, companies, or any proprietary info. Pure public pattern guide.

Place under `docs/` (e.g. `docs/agent-workflow.md`) and link from the README's quick-start section. Don't bloat the main README. Main README truncation is a separate follow-up.

## Acceptance Criteria

- [ ] New file `docs/agent-workflow.md` with a complete, self-contained agent workflow guide
- [ ] Content covers:
  - [ ] Shared `.vibe/team.yml` as the source of truth for who does what
  - [ ] Assigning tickets to bot users as well as humans
  - [ ] Reference flow: ticket → agent picks it up → creates branch → implements → closes → notifies
  - [ ] Coordinating multiple agents (ticket ownership, avoiding collisions)
  - [ ] Wiring notifications to external channels (abstract — just read ticket status, no specific integrations)
  - [ ] Example prompts for agents to check `vibe list --assignee=<me> --status=open` on a cadence
  - [ ] Escalation pattern: mark ticket as blocked and surface to humans when stuck
  - [ ] Loop prevention: cap bot-to-bot interactions, tag a human after N exchanges
- [ ] NO references to specific project names, company names, real usernames, real agent bot names, or internal tooling
- [ ] Use placeholder names like `alice`, `bob`, `agent-1`, `agent-2`, `reviewer`
- [ ] Link the new doc from the main README in the skills.sh / AI agents section
- [ ] Clean, concise writing — no marketing fluff

## Implementation Notes

- Put under `docs/agent-workflow.md` to keep main README lean
- SKILL.md covers the per-agent workflow; this doc is the team-level pattern
- Reference only public vibekit features
- Consider a diagram (mermaid or ASCII) showing the ticket lifecycle

## Testing & Test Cases

- [ ] Read-through: someone unfamiliar can understand the workflow
- [ ] grep for sensitive terms — should return nothing
- [ ] All links resolve

## AI Prompt

<!-- Add the AI instructions or input prompt here. For example, explain what needs to be generated or reviewed by AI. -->

## Expected AI Output

<!-- (Optional) Describe the kind of output or format you expect from the AI — code, checklist, response, etc. -->

## AI Workflow

<!-- NOTE (Do not remove) -->
Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.