# VibeKit Workflow Instructions for Claude

⚠️ **IMPORTANT**: Only modify this file if you understand that Claude Code will use these instructions as workflow guidelines for this project. These instructions will be automatically followed by Claude when working in this codebase.

## 🎯 PRIMARY RULE: Always Work Through Tickets
This project uses VibeKit for organized development. **For ANY task, feature, or bug fix:**

1. **Create a ticket first**: `vibe new`
2. **Start working**: `vibe start <ticket-id>` 
3. **Track progress**: `vibe list`
4. **Close when done**: `vibe close <ticket-id>`

## 📋 VibeKit Commands Reference
- `vibe new` - Create new ticket (ALWAYS do this first!)
- `vibe list` - List all tickets with status
- `vibe start <id>` - Start working on ticket (creates/switches branch)
- `vibe close <id>` - Close ticket and merge branch
- `vibe link` - Configure AI provider (Claude Code)
- `vibe unlink` - Disable AI features

## 🔄 Mandatory Workflow Rules
1. **NO direct code changes** - Always create a ticket first with `vibe new`
2. **Descriptive tickets** - Clear title and detailed acceptance criteria
3. **One feature per ticket** - Keep scope focused and manageable
4. **Branch per ticket** - `vibe start` handles branch creation automatically
5. **Ticket-driven development** - Even for small changes or fixes

## 🏗️ Ticket Structure
Located in `.vibe/tickets/` with YAML frontmatter:
- id, title, status, priority
- created_at, updated_at timestamps
- Detailed description and acceptance criteria

## 🔐 AI Integration
- Claude Code integrated via Anthropic API
- Uses environment variables (ANTHROPIC_API_KEY) or .env files
- No credentials stored in config files
- Configuration via `vibe link`

## 💡 Best Practices for Claude
- Always start with `vibe new` before any code changes
- Use clear, descriptive ticket titles
- Include detailed acceptance criteria in tickets
- Follow the branch workflow via `vibe start`
- Keep tickets focused and actionable
- Reference ticket IDs in commits

## 🚀 Example Workflow
```bash
# User asks: "Add a dark mode toggle"
vibe new  # Create ticket first
vibe start TKT-XXX  # Start working on the ticket
# Make changes, commit with ticket reference
vibe close TKT-XXX  # Close when complete
```

**Remember: VibeKit promotes organized, ticket-driven development. Always create tickets first!**

---
*This file is automatically created by VibeKit. Future versions will support Codex and other AI providers.*
