```
╭─────────────────────────────────────────────────────────────────╮
│                                                                 │
│   ██╗   ██╗██╗██████╗ ███████╗    ██╗  ██╗██╗████████╗        │
│   ██║   ██║██║██╔══██╗██╔════╝    ██║ ██╔╝██║╚══██╔══╝        │
│   ██║   ██║██║██████╔╝█████╗      █████╔╝ ██║   ██║           │
│   ╚██╗ ██╔╝██║██╔══██╗██╔══╝      ██╔═██╗ ██║   ██║           │
│    ╚████╔╝ ██║██████╔╝███████╗    ██║  ██╗██║   ██║           │
│     ╚═══╝  ╚═╝╚═════╝ ╚══════╝    ╚═╝  ╚═╝╚═╝   ╚═╝           │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

<div align="center">

[![npm version](https://img.shields.io/npm/v/@vibedx/vibekit.svg)](https://www.npmjs.com/package/@vibedx/vibekit)
[![npm downloads](https://img.shields.io/npm/dm/@vibedx/vibekit.svg)](https://www.npmjs.com/package/@vibedx/vibekit)
[![GitHub license](https://img.shields.io/github/license/vibedx/vibekit.svg)](https://github.com/vibedx/vibekit/blob/main/LICENSE)

**A CLI tool to help you vibe your code better** ✨  
*Vibe your development workflow*  
_vibekit uses vibekit to develop vibekit - we vibin!_ 🔄

</div>

---

## 🚀 Quick Start

```bash
# Install globally
npm install -g @vibedx/vibekit

# Initialize in your project
vibe init

# Create your first ticket
vibe new "Add user authentication"

# Start working on it
vibe start TKT-001
```

## 🤔 Why VibeKit?

- **🎯 Vibe code with manageable smaller tasks** - Break down complex features into focused tickets
- **🎮 Stay in control** - You drive the development, AI assists with structure and clarity
- **🧠 Less model hallucination** - Clear, scoped tickets reduce AI confusion and improve accuracy
- **📚 Develop docs as you go** - Maintain work history and context with every ticket
- **🔍 Let models vibe review** - AI can review your work against the original ticket requirements
- **🚀 AI-native ticket management** - Purpose-built for AI-assisted development workflows
- **⚡ Generate tickets using Claude Code and Codex power** - Leverage cutting-edge AI for planning
- **🔄 Seamless git workflow** - Automatic branch creation and status tracking
- **📝 Living documentation** - Your tickets in git become your project's development story

## ✨ Features

```
   🎯 Smart Ticket Management    📋 Interactive Lists & Filters
   🔗 Git Branch Integration     🤖 AI-Powered Enhancement (Claude Code / Codex)
   📝 Customizable Templates     🔍 Quality Validation & Auto-Fix
```

- **🎯 Smart Tickets**: Create, manage, and track development tickets with unique IDs
- **🔗 Git Integration**: Automatic branch creation and workflow management  
- **🤖 AI Enhancement**: Claude Code integration for ticket refinement and content improvement
- **📋 Interactive CLI**: Beautiful terminal interface with arrow navigation
- **📝 Templates**: Customizable ticket templates for consistent workflows
- **🔍 Quality Control**: Automated linting and validation with auto-fix capabilities
- **🚀 Quick Actions**: One-command ticket creation, status updates, and more

## 📚 Commands Reference

### 🏗️ Project Setup
```bash
# Initialize VibeKit in your project
vibe init [--with-samples|-s]

# Get started with sample tickets and guide
vibe get-started
```

### 🎫 Ticket Management
```bash
# Create a new ticket
vibe new "Fix login bug"
vibe new "Add dark mode" --priority high --status open

# List all tickets (with optional filtering)
vibe list
vibe list --status=open

# Close/complete a ticket
vibe close TKT-001

# Start working on a ticket (creates git branch)
vibe start TKT-001
vibe start TKT-001 --base main --update-status
```

### 🤖 AI Integration
```bash
# Connect Claude Code for ticket enhancement
vibe link

# Enhance a ticket using Claude with AI
vibe refine TKT-001

# Interactive refinement with custom goals
vibe refine TKT-005 "focus on performance and error handling"

# Disconnect AI integration
vibe unlink
```

### 🔍 Quality & Validation
```bash
# Validate ticket documentation formatting
vibe lint

# Lint with detailed output including warnings
vibe lint --verbose

# Automatically fix missing frontmatter fields and sections
vibe lint --fix

# Lint a specific ticket file
vibe lint TKT-001-example.md
```

## 🛠️ Usage Examples

### Creating Your First Workflow
```bash
# 1. Initialize your project
$ vibe init --with-samples
✅ Created .vibe directory structure
📝 Added sample tickets and templates

# 2. Create a new feature ticket
$ vibe new "Add dark mode toggle" --priority high
🎫 Created TKT-004: Add dark mode toggle
🤖 Want to enhance with AI? (y/n) y

# 3. Start working on it
$ vibe start TKT-004
🌿 Created branch: feature/TKT-004-add-dark-mode-toggle
📝 Updated ticket status to in_progress

# 4. Check your progress
$ vibe list
┌─────────┬──────────────┬─────────────────────────────┐
│ ID      │ Status       │ Title                       │
├─────────┼──────────────┼─────────────────────────────┤
│ TKT-004 │ in_progress  │ Add dark mode toggle        │
│ TKT-003 │ open         │ Fix responsive layout       │
│ TKT-002 │ done         │ Setup authentication        │
└─────────┴──────────────┴─────────────────────────────┘
```

### Working with AI Enhancement
```bash
# Connect Claude Code (one-time setup)
$ vibe link
🔗 Configure Claude Code integration
✨ Enter your API key: [hidden]
✅ AI features enabled!

# Claude will automatically enhance new tickets
$ vibe new "Optimize database queries"
🎫 Created TKT-005: Optimize database queries
🤖 Enhancing using Claude...
✨ Added acceptance criteria, technical details, and test plan!

# Or refine existing tickets with AI
$ vibe refine TKT-003
▶ Analyzing ticket TKT-003...
ℹ Found: TKT-003 - Fix responsive layout
🧠 Analyzing ticket content...
✨ Generating enhancements...

🔧 Refinement Options
❯ Apply refinements to ticket
  Ask for changes/improvements  
  View diff in terminal
  Cancel and exit

# View what Claude enhanced before applying
📊 TICKET REFINEMENT DIFF
═══════════════════════════════════════
🔹 Title (refined):
────────────────────────────────────────
Fix responsive layout issues in `src/components/Layout.jsx`

🔹 Implementation Notes (refined):
────────────────────────────────────────
- Update CSS Grid in `src/styles/layout.css` for mobile breakpoints
- Add `useMediaQuery()` hook for responsive state management
- Test on devices: iPhone SE, iPad, desktop (1920px+)
```

### Quality Control with Lint
```bash
# Check all tickets for formatting issues
$ vibe lint
🔍 VibeKit Ticket Linter Results

❌ TKT-001-setup.md
   Error: Missing required frontmatter field: slug
   Error: Missing required section: ## Implementation Notes

❌ TKT-003-responsive.md
   Error: Invalid status "in-review". Must be one of: open, in_progress, review, done
   Error: Section "## Testing & Test Cases" appears to be empty or too short

✅ TKT-002-auth.md

📊 Summary:
   Files checked: 3
   Files with issues: 2
   Total errors: 4
   Total warnings: 0

💡 Fix the errors above to ensure consistent ticket formatting.
💡 Use --fix flag to automatically fix missing sections.

# Automatically fix missing fields and sections
$ vibe lint --fix
🔍 VibeKit Ticket Linter Results

🔧 TKT-001-setup.md (FIXED)
   Fixed: 1 missing frontmatter fields and 3 missing sections

❌ TKT-003-responsive.md
   Error: Invalid status "in-review". Must be one of: open, in_progress, review, done

📊 Summary:
   Files checked: 3
   Files with issues: 1
   Files fixed: 1
   Total errors: 1
   Total warnings: 1

🎉 Most issues have been fixed! Please review and fix remaining errors manually.
```

### 🦀 OpenClaw Integration - Stay in Control, Code with Agents

Use VibeKit with OpenClaw to delegate ticket-based work to AI agents while maintaining full visibility and control:

```bash
# 1. Create focused tickets
vibe new "Add user authentication"
vibe new "Setup database migrations"

# 2. Dispatch work to agents (Opus, Haiku)
# Agent reads ticket, creates branch, implements, updates status
sessions_spawn(task="Work on TKT-001 and TKT-002 using vibe CLI", model="anthropic/claude-opus-4-6")

# 3. Monitor progress
vibe list  # Track real-time status updates
```

**Key Benefits:**
- 🎯 **Bounded Context** - Agents work on focused tickets, not ambiguous tasks
- 🔍 **Full Visibility** - See exactly what agents are doing via ticket updates and git branches
- 🎮 **Stay in Control** - You manage priorities, review work, close/reopen tickets
- 🚀 **Parallel Work** - Spawn multiple agents on different tickets simultaneously
- 📋 **Self-Documenting** - Tickets become your project's implementation history

**📚 [Full OpenClaw Integration Guide →](./docs/openclaw-use-case/OPENCLAW_INTEGRATION.md)** with workflow examples and screenshot walkthrough.

#### Getting Started with Your OpenClaw Bot

Tell your bot to:
1. **Install VibeKit** - `npm install -g @vibedx/vibekit`
2. **Create tickets** - Break down work into focused tasks: `vibe new "Feature description"`
3. **Track work over chats** - Bot reads tickets from `.vibe/tickets/` during each session
4. **Never lose context** - All work is stored in markdown files, accessible anytime
5. **Recreate context if needed** - When token limits hit, bot uses `vibe list` to resume from where it left off

This way, tickets become the **single source of truth** for your project—no context loss, no repeated explanations. The bot always knows what was done, what's pending, and what's next.

## ⚙️ Configuration

VibeKit creates a `.vibe` directory in your project root:

```
📁 .vibe/
  ├── 📋 config.yml           # Main configuration
  ├── 📁 .templates/          # Ticket templates
  │   └── 📄 default.md       # Default ticket template
  ├── 📁 tickets/             # Your ticket files
  │   ├── 🎫 TKT-001-setup.md
  │   └── 🎫 TKT-002-auth.md
  └── 📄 README.md           # Project guidance
```

### Sample config.yml
```yaml
# Project settings
project:
  name: vibekit
  description: CLI tool for managing tickets, project context, and AI suggestions

# Ticket settings
tickets:
  path: .vibe/tickets
  id_format: TKT-{number}
  default_template: .vibe/.templates/default.md
  use_status_folders: false
  slug:
    max_length: 30
    word_limit: 5
  status_options:
    - open
    - in_progress
    - review
    - done
  priority_options:
    - low
    - medium
    - high
    - critical

# AI integration
ai:
  enabled: true
  provider: claude-code

# Git integration
git:
  branch_prefix: feature/
  default_base: main

# Hooks
hooks:
  pre_commit: false
  post_checkout: false
```

## 🤝 Contributing & Feedback

We'd love your help making VibeKit better! Here's how you can contribute:

- 🐛 **Report bugs** → [GitHub Issues](https://github.com/vibedx/vibekit/issues)
- 💡 **Suggest features** → [Discussions](https://github.com/vibedx/vibekit/discussions)  
- 🔧 **Submit PRs** → [Contributing Guide](https://github.com/vibedx/vibekit/blob/main/CONTRIBUTING.md)
- ⭐ **Star the repo** → Show your support!

### Development Setup
```bash
git clone https://github.com/vibedx/vibekit.git
cd vibekit
npm install
npm start  # Watch mode
```

## 👥 Contributors

<div align="center">

*Thank you to everyone who helps make VibeKit better!*

*Want to see your name here? [Contribute to the project!](https://github.com/vibedx/vibekit/blob/main/CONTRIBUTING.md)*

</div>

## Release Preparation

### Prerequisites
- [ ] NPM account with publish permissions
- [ ] All features tested and working
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (if applicable)

### Release Steps
1. **Test the build**: `npm start` to verify everything works
2. **Version bump**: 
   - Patch: `npm version patch` (bug fixes)
   - Minor: `npm version minor` (new features)
   - Major: `npm version major` (breaking changes)
3. **Publish**: `npm publish --access=public` (for scoped packages)
4. **Verify**: `npm info @vibedx/vibekit` to confirm publication

### Pre-Release Checklist
- [ ] All commands work as expected
- [ ] No sensitive data in published files
- [ ] Package.json metadata is correct
- [ ] README reflects current functionality
- [ ] Version number follows semantic versioning

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
