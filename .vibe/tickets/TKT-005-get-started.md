---
id: TKT-005
title: "Onboarding: Implement `vibe new \"get started\"` guide"
status: done
priority: high
created_at: 2025-05-27T15:00:30.000Z
updated_at: 2025-06-03T21:42:00.000Z
slug: TKT-005-onboarding-implement-vibe-new-get-started-guide
---

## Description  
Implement a special onboarding flow triggered by the CLI command:

```bash
vibe new "get started"
```

This command should create a series of starter tickets and a README.md in the `.vibe` folder that explains how to use VibeKit effectively. The goal is to help new users understand the workflow and get productive quickly.

## Acceptance Criteria
- Detect when a user runs `vibe new "get started"` or `vibe new get started`
- Create a `.vibe/README.md` with instructions on using VibeKit
- Create 3-5 sample tickets with increasing complexity:
  - A simple task
  - A bug report
  - A feature request with AI prompt
- Show a welcome message with next steps
- Provide links to documentation

## Notes  
This is a critical onboarding experience for new users. The sample tickets should showcase different VibeKit features and demonstrate best practices for ticket writing.

## AI Prompt  
Generate an onboarding experience for a CLI tool that helps developers manage tickets and project context. Include sample content that demonstrates the tool's capabilities.

## Expected AI Output  
A set of markdown files including a README and sample tickets that showcase the tool's features and provide guidance for new users.

## Code Quality
<!-- List the specific conditions that must be met for this ticket to be considered complete. -->


## Implementation Notes
<!-- Technical details, references, or implementation context that might be helpful. -->


## Design / UX Considerations
<!-- Add any design links (Figma, etc.) or UX considerations here. -->


## Testing & Test Cases
<!-- Brief, focused test cases and verification steps. Keep concise. -->


## AI Workflow
<!-- NOTE (Do not remove) -->
Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.