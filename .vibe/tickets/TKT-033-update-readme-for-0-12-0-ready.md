---
id: TKT-033
title: Update README for 0.12.0 (ready status, vibe ready, swarm gate, authoring gate)
slug: TKT-033-update-readme-for-0-12-0-ready
status: in_progress
priority: medium
assignee: ""
author: ""
created_at: 2026-07-14T20:06:38.077Z
updated_at: "2026-07-14T20:09:07.337Z"
---

## Description

README is stale as of 0.12.0. PR #70 shipped the `ready` status lifecycle, `vibe ready <id>`, the swarm ready-gate, and the ticket detail authoring gate (TKT-031), none of which are documented. Bring the README in line with shipped behavior.

## Acceptance Criteria

- `vibe ready <id>` command documented (incl. `--force` on empty tickets).
- Status lifecycle updated to `open → ready → in_progress → review → done` (was `open → in_progress → done`).
- Swarm section notes it defaults to picking up only `ready` tickets.
- Authoring gate documented: `vibe start` empty-section warning, `--skip-detail-check` bypass, and agent-mode "detail first" behavior.

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