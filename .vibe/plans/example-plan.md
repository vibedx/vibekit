# VibeKit Plan to Ticket Feature

## Overview

Implement a new `vibe plan to-ticket` subcommand that converts project plans into actionable tickets.

## Goals

- Enable Claude to parse plan files and extract work items
- Automatically create tickets from extracted items
- Support dry-run mode to preview tickets before creation
- Make the process interactive by default

## Requirements

### Core Functionality
- Read plan files from `.vibe/plans/` directory
- Parse plan content using Claude
- Extract title, description, acceptance criteria, priority, and estimated hours
- Create tickets in `.vibe/tickets/` with proper formatting
- Display extracted tickets for review before creation

### User Workflow
1. User creates a plan file (e.g., `.vibe/plans/feature-plan.md`)
2. User runs `vibe plan to-ticket feature-plan.md`
3. Tool shows extracted tickets
4. User can review and approve with `--auto` flag
5. Tickets are created and ready for work

### Technical Details
- Use Claude API via spawn('claude') to parse plans
- Reuse ticket creation logic from `vibe new`
- Maintain consistency with existing ticket format
- Support both interactive and automated workflows

## Success Criteria

- [ ] `vibe plan to-ticket <file>` displays extracted tickets
- [ ] Supports `--auto` flag to create without confirmation
- [ ] Supports `--dry-run` to show preview only
- [ ] Creates tickets with proper frontmatter
- [ ] Integrates with existing `.vibe/tickets/` format
- [ ] User-friendly error messages for missing/invalid files
