# AI Instructions Templates

This directory contains instruction templates for different AI coding assistants that can be used with VibeKit.

## Files

### `claude.md`
Template for Claude Code (Anthropic) instructions. This file is copied to `.context/instructions/claude.md` when running `vibe link` to configure Claude Code integration.

### `codex.md`
Placeholder template for future OpenAI Codex integration. Coming soon.

## How It Works

1. **Templates stored here** - All AI instruction templates are maintained in `assets/instructions/`
2. **Copied on link** - When running `vibe link`, the appropriate template is copied to `.context/instructions/`
3. **AI reads from .context** - AI assistants automatically read instructions from `.context/instructions/`

## Adding New AI Providers

To add support for a new AI provider:

1. Create a new template file: `assets/instructions/{provider}.md`
2. Update the link command to handle the new provider
3. Ensure the template follows VibeKit's ticket-driven workflow

## Directory Structure

```
assets/instructions/
├── README.md         # This file
├── claude.md         # Claude Code template
└── codex.md          # OpenAI Codex template (placeholder)

.context/instructions/ (created by vibe link)
├── README.md         # Generated documentation
├── claude.md         # Active Claude instructions
└── codex.md          # Active Codex instructions (when available)
```

## Best Practices

- Keep instructions focused on VibeKit's ticket-driven workflow
- Include clear command references and examples
- Emphasize the "ticket-first" approach for all changes
- Update templates when adding new VibeKit features