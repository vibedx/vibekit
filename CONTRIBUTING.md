# Contributing to vibekit

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

**Prerequisites:** Node.js >= 18

```bash
# Fork and clone the repo
git clone https://github.com/your-username/vibekit.git
cd vibekit

# Install dependencies
npm install

# Run the CLI locally
node index.js
```

## Development Workflow

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Start with file watching
npm start
```

Tests must pass before submitting a PR. New features should include tests.

## Submitting Changes

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding standards below.

3. **Write or update tests** for any changed behaviour.

4. **Ensure all tests pass:**
   ```bash
   npm test
   ```

5. **Commit** using conventional commit messages:
   ```
   feat: add new lint rule for missing sections
   fix: handle missing ticket ID gracefully
   docs: update README with new commands
   chore: bump dependency versions
   ```

6. **Open a Pull Request** against `main`. Fill in the PR template.

## Coding Standards

- **Modern JS** — ES modules (`import`/`export`), async/await, no CommonJS
- **JSDoc** — document all exported functions
- **Small, focused functions** — break down long functions; extract config/utils where it makes sense
- **No unnecessary abstractions** — solve the problem at hand, not hypothetical future ones
- **Clean formatting** — consistent indentation, readable structure

## Reporting Bugs

Open an issue on [GitHub Issues](https://github.com/vibedx/vibekit/issues) and include:

- vibekit version (`node index.js --version`)
- Node.js version (`node --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behaviour

## Suggesting Features

Open a [GitHub Issue](https://github.com/vibedx/vibekit/issues) with the label `enhancement`. Describe the use case and why it would benefit users.
