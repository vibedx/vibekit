---
name: ticket-writer
description: Write well-structured VibeKit tickets. Use when the user asks to create a ticket, document a task, or break down a feature into trackable work items. Ensures tickets have clear descriptions, acceptance criteria, and implementation notes before any code is written.
license: MIT
---

# VibeKit Ticket Writer

Write tickets that are immediately actionable — no refinement needed. Every ticket should answer: what, why, and how to verify it's done.

## 🔴 RULE: Always use `-n` when creating tickets programmatically

```bash
vibe new "title" --assignee <username> --priority <level> -n
```

The `-n` / `--no-interactive` flag skips the AI enhancement prompt, which would otherwise block automation.

## What Makes a Good Ticket

**Description** — What needs to be done and why. Include context the implementer needs. Two to five sentences is usually right.

**Acceptance Criteria** — Concrete, checkable conditions. Not "it works" but "clicking Submit saves the form and shows a success toast". Write these as `- [ ]` checkboxes.

**Implementation Notes** — File paths, API references, known constraints, or design decisions that save the implementer time.

## Template

```bash
vibe new "Clear action-oriented title" \
  --assignee <username> \
  --priority high \
  --description "What needs to happen and why. Reference the relevant product area or user flow. Note any constraints or dependencies." \
  --acceptance-criteria "- [ ] Specific, observable outcome 1
- [ ] Specific, observable outcome 2
- [ ] Edge case handled: <description>" \
  -n
```

## Priority Guide

| Priority | Use when |
|----------|----------|
| `critical` | Blocking release, production incident |
| `high` | Current sprint, clear business need |
| `medium` | Planned work, next 1-2 sprints |
| `low` | Nice to have, backlog |

## Examples

```bash
# Feature
vibe new "Add dark mode toggle to settings" \
  --assignee alice \
  --priority medium \
  --description "Users want to reduce eye strain. Add a toggle in Settings > Appearance that persists the preference to localStorage and applies a 'dark' class to <html>." \
  --acceptance-criteria "- [ ] Toggle appears in Settings > Appearance
- [ ] Preference persists across page reloads
- [ ] All components respect dark mode colors from design tokens
- [ ] Toggle is keyboard accessible" \
  -n

# Bug fix
vibe new "Fix login redirect loop on expired session" \
  --assignee bob \
  --priority high \
  --description "When a session expires mid-navigation, the auth middleware redirects to /login, which redirects back to the protected page, creating an infinite loop. Need to clear the redirect target when session is expired." \
  --acceptance-criteria "- [ ] Expired session redirects to /login once (no loop)
- [ ] After login, user lands on the originally requested page
- [ ] Verified in Chrome, Firefox, Safari" \
  -n
```

## After Creating

```bash
vibe start TKT-XXX   # creates branch, marks in_progress
# do the work
vibe close TKT-XXX   # marks done
```
