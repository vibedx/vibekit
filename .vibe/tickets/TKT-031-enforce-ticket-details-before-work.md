---
id: TKT-031
title: enforce ticket detail authoring before AI begins work
slug: TKT-031-enforce-ticket-details-before-work
status: done
priority: high
assignee: ''
author: maniyadv
created_at: 2026-05-23T00:00:00.000Z
updated_at: 2026-05-23T00:00:00.000Z
---

## Description

When an AI agent (Claude or any LLM using vibekit) starts working on a ticket, it must first fill in the ticket's description, acceptance criteria, and implementation notes *before* writing any code. Currently, tickets are often created with empty sections (just HTML comment placeholders), and agents jump straight to implementation without documenting what they're building or why.

This ticket adds a mandatory "detail authoring" step to the vibekit workflow — enforced through the skill instructions, the `vibe start` command, and optionally a lint check.

### The Problem

1. `vibe new "add feature X"` creates a ticket with empty sections
2. Agent runs `vibe start TKT-XXX --agent` and immediately starts coding
3. Ticket remains undocumented — no description, no acceptance criteria, no test plan
4. PR opens with no context on what was built or why
5. Other team members (human or AI) can't review effectively

### The Solution

**Anyone using vibe + Claude should be instructed to add ticket details before working.** This includes:

1. **Skill enforcement** — update `skills/vibekit/SKILL.md` to make ticket detailing mandatory. The skill should instruct Claude: "Before writing any code, read the ticket. If Description, Acceptance Criteria, or Implementation Notes are empty (only contain HTML comments), fill them in based on the title and your understanding of the codebase. Commit the updated ticket file before proceeding."

2. **`vibe start` pre-check** — when starting a ticket (especially with `--agent`), check if key sections are empty. If they are:
   - Interactive mode: prompt the user to fill them in or let AI fill them
   - Agent mode: instruct the agent to fill them in as its first task
   - Add a `--skip-detail-check` flag for override

3. **`vibe lint` enhancement** — add a lint rule that flags tickets with empty sections. `vibe lint --fix` could use AI to fill in missing details based on the title.

4. **Template improvement** — update `assets/default.md` template to include guidance comments that tell the author (human or AI) what each section should contain, not just "write details here."

## Acceptance Criteria

- [ ] `skills/vibekit/SKILL.md` updated with mandatory ticket-detailing instruction
- [ ] Claude agents always fill in ticket details before writing code
- [ ] `vibe start` warns when ticket has empty key sections
- [ ] `vibe start --agent` includes ticket-detailing as first agent instruction
- [ ] `vibe lint` flags tickets with empty Description or Acceptance Criteria
- [ ] Default ticket template (`assets/default.md`) has actionable guidance in each section
- [ ] Works for all AI tools using vibekit (not Claude-specific in the enforcement)

## Code Quality

- [ ] Empty-section detection is a shared utility (used by start, lint, and potentially swarm)
- [ ] Skill instructions are clear and unambiguous
- [ ] No false positives — sections with actual content (even brief) pass the check
- [ ] Tests for empty-section detection

## Implementation Notes

### Empty section detection

A section is "empty" if it contains only:
- Whitespace
- HTML comments (`<!-- ... -->`)
- The section header itself

Utility function: `isTicketSectionEmpty(ticketContent, sectionName) → boolean`

Key sections to check: `Description`, `Acceptance Criteria`, `Implementation Notes`

### Skill update (`skills/vibekit/SKILL.md`)

Add to the MANDATORY section:
```
Before writing ANY code on a ticket:
1. Read the ticket file
2. Check if Description, Acceptance Criteria, and Implementation Notes have content
3. If any are empty, fill them in based on:
   - The ticket title
   - Your understanding of the codebase
   - The context from the conversation
4. Commit the updated ticket file with message "docs: add details to TKT-XXX"
5. Only then proceed to implementation
```

### `vibe start` changes

In `src/commands/start/index.js`, after loading the ticket:
```javascript
const emptySections = checkEmptySections(ticketContent);
if (emptySections.length > 0) {
  if (agentMode) {
    // Prepend "fill in ticket details first" to agent prompt
  } else {
    // Warn user, suggest `vibe refine TKT-XXX` to fill in details
  }
}
```

### Template update

Replace generic `<!-- Write the task details here -->` with actionable prompts:
```markdown
## Description
<!-- What is being built and why? Include context on the problem being solved. -->

## Acceptance Criteria
<!-- List specific, testable conditions. Use checkboxes: - [ ] criterion -->

## Implementation Notes
<!-- Key technical decisions, files to modify, dependencies, edge cases to handle. -->
```

## Design / UX Considerations

- Warning should be helpful, not blocking — suggest `vibe refine` as the fix
- Agent mode should auto-fill silently (commit the update, then proceed)
- Don't nag on tickets that are intentionally minimal (e.g., `--skip-detail-check`)

## Testing & Test Cases

- Empty section detection: empty, comment-only, whitespace-only, has-content
- `vibe start` warning triggers on empty tickets
- `vibe start --agent` prepends detail instruction
- `vibe lint` catches empty sections
- Skill instructions are present in SKILL.md
- Template has actionable guidance text

## AI Prompt

Update the vibekit skill, start command, lint command, and ticket template to enforce ticket detail authoring before any implementation work begins.

## Expected AI Output

Updated skill with mandatory detailing step, start command with pre-check, lint rule for empty sections, and improved default template.

## AI Workflow

Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.
