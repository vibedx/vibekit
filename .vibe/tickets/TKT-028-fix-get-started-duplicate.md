---
id: TKT-028
title: fix get-started duplicate ticket IDs The get-started command creates all sample tickets with TKT-001 because the regex has double-escaped \d. Fix to use the already-imported getNextTicketId() utility.
slug: TKT-028-fix-get-started-duplicate
status: done
priority: medium
assignee: ""
author: ""
created_at: 2026-05-22T11:28:24.792Z
updated_at: 2026-05-22T11:30:34.924Z
---

## Description

<!-- Write the task details, requirements, and any other relevant information here. -->

## Acceptance Criteria

<!-- List the specific conditions that must be met for this ticket to be considered complete. -->

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