---
id: TKT-032
title: vibe docs command — project documentation system
slug: TKT-032-vibe-docs-command
status: in_progress
priority: medium
assignee: ""
author: maniyadv
created_at: 2026-07-04
updated_at: "2026-07-04T13:21:18.442Z"
---

## Description

Add a `vibe docs` command that lets teams create and manage project documentation inside `.vibe/docs/`. Mirrors the ticket system pattern: markdown files with frontmatter, per-type templates, AI refinement.

**Subcommands:**
- `vibe docs add "title" [--type <type>]` — create a new doc from template, open in $EDITOR
- `vibe docs list [--type <type>] [--status <status>] [--tag <tag>]` — list docs with filters
- `vibe docs refine <id>` — AI pass to improve/expand the doc content
- `vibe docs show <id>` — print doc to stdout

**Doc types (templates):** `guide` (default), `design-doc`, `code-doc`, `faq`

**Frontmatter schema:**
```yaml
---
id: DOC-001
title: "My Doc"
type: guide
status: draft         # draft | review | published
tags: []
author: ""
created_at: 2026-07-04
updated_at: 2026-07-04
---
```

**Storage:** `.vibe/docs/DOC-001-my-doc.md`
**Templates:** `.vibe/.templates/docs/default.md`, `design-doc.md`, `code-doc.md`, `faq.md`
**Config key in `config.yml`:**
```yaml
docs:
  path: .vibe/docs
  id_format: DOC-{number}
  default_template: .vibe/.templates/docs/default.md
  default_type: guide
  status_options:
    - draft
    - review
    - published
```

## Acceptance Criteria

- [ ] `vibe docs add "title"` creates DOC-NNN slug file with correct frontmatter and opens in $EDITOR
- [ ] `--type` flag selects the right template; falls back to default if type not recognised
- [ ] `vibe docs list` renders a table similar to `vibe list` (id, type, status, title)
- [ ] `vibe docs refine <id>` sends doc content to Claude with a refine prompt and writes back
- [ ] `vibe init` creates the `.vibe/docs/` folder and all four templates on first run
- [ ] `config.yml` `docs:` key is read for path/id_format/status_options
- [ ] IDs are sequential and independent from ticket IDs (DOC-001, DOC-002…)

## Implementation Notes

- Reuse slug/ID generation logic from `src/commands/new/`
- Template loading follows the same fallback as tickets: custom template path → bundled default
- `vibe docs refine` can reuse the Claude integration from `src/commands/refine/`
- Keep `vibe docs` as a top-level command with subcommands (not nested under `vibe new --type doc`)

## AI Prompt

Build the `vibe docs` command for the vibekit CLI. Structure:
1. `src/commands/docs/index.js` — command entry, subcommand routing
2. `src/commands/docs/add.js` — create doc
3. `src/commands/docs/list.js` — list docs
4. `src/commands/docs/refine.js` — AI refinement
5. `src/commands/docs/show.js` — print doc
6. `src/templates/docs/` — four bundled templates (guide, design-doc, code-doc, faq)
7. Update `src/commands/init/` to scaffold `.vibe/docs/` and copy templates
8. Register `vibe docs` in the main CLI entry point

Follow patterns from `src/commands/new/` and `src/commands/refine/` exactly.

## AI Workflow

<!-- NOTE (Do not remove) -->
Always use `vibe start` to start working on this ticket and `vibe close` to close this ticket when done. Keep tickets up to date with implementation details and progress. Read .vibe/.context/aiworkflow directory for following vibekit cli workflow and follow the instructions to work on the tickets.
