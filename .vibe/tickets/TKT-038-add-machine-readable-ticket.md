---
id: TKT-038
title: Add machine-readable ticket listing
slug: TKT-038-add-machine-readable-ticket
status: in_progress
priority: medium
assignee: ""
author: ""
created_at: 2026-10-10T13:51:31.129Z
updated_at: "2026-10-10T13:51:43.729Z"
---

## Description

The ticket list only renders a truncated colored table, making scripts parse presentation output. Add JSON output with full ticket fields and support both spaced and equals filter arguments.

## Acceptance Criteria

- [ ] list --json emits only a valid sorted JSON array, including for empty results.
- [ ] Existing status and assignee/owner filters work with equals and spaced syntax in table and JSON modes.
- [ ] Document examples and cover full fields, filtering and empty output with unit and E2E regressions.

## Code Quality

<!-- List the specific conditions that must be met for this ticket to be considered complete. -->

## Implementation Notes

Update `src/commands/list/index.js` without changing the default table. Emit the existing normalized ticket fields as JSON after filtering and sorting, before table rendering. Release a patch version through existing npm publishing workflows.

## Design / UX Considerations

<!-- Add any design links (Figma, etc.) or UX considerations here. -->

## Testing & Test Cases

Unit tests for JSON fields, numeric ordering, empty arrays, combined filters, legacy owner and malformed arguments. E2E tests must parse stdout as JSON. Run complete unit and E2E suites, package dry run, and verify the published npm artifact.

## AI Prompt

<!-- Add the AI instructions or input prompt here. For example, explain what needs to be generated or reviewed by AI. -->

## Expected AI Output

<!-- (Optional) Describe the kind of output or format you expect from the AI — code, checklist, response, etc. -->

## AI Workflow

<!-- NOTE (Do not remove) -->
Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.