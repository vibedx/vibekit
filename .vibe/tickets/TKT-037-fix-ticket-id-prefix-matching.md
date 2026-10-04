---
id: TKT-037
title: Fix ticket lookup so shorter IDs cannot match a different ticket
slug: fix-ticket-id-prefix-matching
status: done
priority: high
assignee: ""
author: ""
created_at: 2026-10-04T14:20:00.000Z
updated_at: 2026-10-04T14:20:00.000Z
---

## Description

Ticket commands matched ids with `startsWith` or `includes`. `vibe close TKT-01` therefore closed the first file containing that substring (`TKT-010`, `TKT-011`, ...) instead of `TKT-001`. `TKT-10` failed to find `TKT-010`, lowercase `tkt-002` failed, and a 4-digit id such as `TKT-0010` could be returned for `TKT-001`.

## Acceptance Criteria

- [ ] `1`, `01`, `TKT-1`, `TKT-01`, and `tkt-001` all resolve to `TKT-001`
- [ ] `TKT-10` resolves to `TKT-010`, not `TKT-100` or `TKT-001`
- [ ] `TKT-001` never selects `TKT-0010`, and the reverse holds
- [ ] `vibe close` and `vibe ready` use the same matching rules
- [ ] Branch detection does not treat `TKT-0010` as `TKT-001`

## Code Quality

Shared helpers live in `src/utils/ticket.js` and are used by close, ready, start, plan, pr, review, lint, and doc lookup.

## Implementation Notes

Match markdown filenames as `ID.md` or `ID-...md`, and match branch names with a digit boundary after the id.

## Design / UX Considerations

Short forms keep working. The command the user typed is the ticket that changes.

## Testing & Test Cases

- Unit tests for normalize, filename, and branch matching
- `vibe close TKT-01` with `TKT-001`, `TKT-010`, and `TKT-011` present closes only `TKT-001`
- Doc lookup keeps `DOC-001` distinct from `DOC-0010`

## AI Prompt

Fix prefix matching for ticket and doc ids so each command updates the exact record the user named.
