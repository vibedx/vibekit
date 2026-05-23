# Karpathy-Style Development Guidelines

Follow Andrej Karpathy's principles for clean, effective code.

## Core Philosophy
- Write code that is simple, readable, and does one thing well
- Avoid premature abstraction — start concrete, generalize only when patterns emerge
- Prefer flat code over deeply nested structures
- Delete code aggressively — less code = fewer bugs

## Implementation
- Start with the simplest thing that could work
- Get something running end-to-end before optimizing
- Use standard tools and libraries — don't reinvent the wheel
- Write scripts, not frameworks — bias toward direct solutions

## Debugging
- Add print statements and visualizations liberally during development
- Test with small data first, scale up after
- When stuck, reduce the problem to the smallest failing case
- Read error messages carefully — they usually tell you what's wrong

## Documentation
- Code should be self-documenting through clear naming
- Comments explain why, never what
- Keep READMEs short and actionable — how to run, how to contribute

## Iteration
- Ship fast, iterate based on feedback
- Measure before optimizing
- Perfect is the enemy of good — ship the 80% solution
- Refactor only when the code actively hurts productivity

## Git Workflow
- Small, frequent commits
- Each commit should leave the project in a working state
- Commit messages: what changed and why, in plain English
