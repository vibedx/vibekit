---
id: TKT-019
title: Fix incorrect OpenClaw command reference in documentation
slug: TKT-019-fix-incorrect-openclaw
status: open
priority: medium
created_at: 2026-02-24T21:30:20.363Z
updated_at: 2026-02-24T21:30:20.363Z
---

## Description

The OpenClaw integration documentation in `docs/openclaw-use-case/OPENCLAW_INTEGRATION.md` contains an incorrect command reference. Line 101 shows:

```
| `vibe link --api-key <key>` | Setup OpenClaw agent config |
```

This command is not relevant to OpenClaw integration and should be removed or replaced with appropriate OpenClaw-specific guidance.

## Acceptance Criteria

- [x] Remove or update the incorrect `vibe link --api-key <key>` command reference
- [x] Ensure commands table only includes relevant commands for OpenClaw workflow
- [x] Verify documentation is consistent with autonomous bot workflow emphasis

## Implementation Notes

The `vibe link` command is for Claude Code/AI enhancement, not OpenClaw integration. The Commands Quick Reference table should only include commands that are relevant to the OpenClaw autonomous workflow (vibe new, vibe list, vibe start, vibe close, vibe refine).

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