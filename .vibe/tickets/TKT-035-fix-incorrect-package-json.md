---
id: TKT-035
title: Fix incorrect package.json author (template leftover)
slug: TKT-035-fix-incorrect-package-json
status: done
priority: medium
assignee: ""
author: ""
created_at: 2026-08-16T12:46:50.909Z
updated_at: "2026-08-16T12:49:01.957Z"
---

## Description

`package.json` had `"author": "Ives van Hoorne"` — a leftover from a scaffold template (the CodeSandbox/Sandpack author), not the actual maintainer of this project.

## Acceptance Criteria

- `author` field reflects the real project owner (`vibedx`), not the template default.

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