# Changelog

All notable changes to VibeKit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] - 2026-05-09

### Added
- **`vibe pr`** — open GitHub PRs from ticket branches
  - `vibe pr` for current branch, `vibe pr --all` for all worktrees
  - Auto-populates title/body from ticket content, sets status to `review`
  - Supports `--draft` and `--dry-run` flags
- **`vibe status`** — show active worktrees and ticket status at a glance
- **`vibe start --agent`** — spawn Claude Code agents to work on tickets
  - Works without `-w` for single tickets (agent runs in current directory)
  - Agent timeout defaults to 15 minutes, configurable via `.vibe/config.yml`
  - Full tool access for spawned agents

### Fixed
- Slug type coercion in `getBranchName` preventing TypeError on numeric slugs
- Ticket cleanup: removed non-template fields, closed completed tickets (TKT-019, TKT-023)

## [0.1.0] - 2024-12-14

### Added
- **🤖 AI Integration**: Complete Claude Code integration for ticket enhancement
  - `vibe link` - Connect Claude Code with secure API key management
  - `vibe refine` - AI-powered ticket enhancement with interactive refinement
  - `vibe unlink` - Disconnect AI provider
- **📝 Technical Formatting**: Developer-friendly ticket content
  - Code formatting with backticks for file paths, commands, functions
  - "Implementation Notes" instead of "Notes" for technical details
  - Brief, focused "Testing & Test Cases" sections
- **🛠️ Enhanced CLI**: Robust command-line interface
  - Arrow key navigation with `src/utils/arrow-select.js`
  - Improved prompts and user interaction in `src/utils/prompts.js`
  - Comprehensive logging and feedback in `src/utils/cli.js`
- **🎯 Advanced Ticket Management**: Enhanced ticket operations
  - Dynamic ticket parsing and updating in `src/utils/ticket.js`
  - Title updates during refinement process
  - Improved slug generation and file renaming
- **📁 Instructions System**: Template-based AI instructions
  - AI instructions templates in `assets/instructions/`
  - Generated instructions in `.context/instructions/` (gitignored)
  - Support for multiple AI providers (Claude Code ready, Codex planned)

### Enhanced
- **📋 New Command**: Major improvements to ticket creation
  - AI enhancement option for new tickets
  - Better error handling and validation
  - Integration with refine command
- **🏗️ Project Structure**: Improved organization
  - Enhanced templates with technical guidance
  - Better configuration with AI settings
  - Comprehensive documentation and examples

### Technical
- **🔧 Code Quality**: Production-ready codebase
  - Comprehensive JSDoc documentation throughout
  - Robust error handling and input validation
  - Consistent code formatting and style
  - Secure API key handling (environment variables)
- **📦 Package**: Enhanced npm package
  - Proper metadata and repository information
  - Publishing scripts and version management
  - Node.js 18+ requirement for modern features

### Documentation
- **📖 README**: Complete documentation overhaul
  - "Why VibeKit?" section explaining benefits
  - Comprehensive examples and usage patterns
  - AI integration setup and usage guide
  - Configuration reference and best practices

## [Unreleased]

### Planned
- **🔮 OpenAI Codex Integration**: Support for additional AI providers
- **🧪 Testing Framework**: Comprehensive test suite
- **🔌 Plugin System**: Extensible command architecture
- **📊 Analytics**: Usage tracking and insights

---

*VibeKit uses VibeKit to develop VibeKit - we vibin! 🔄*