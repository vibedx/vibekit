# Python Project Guidelines

## Code Style
- Follow PEP 8 — use a formatter (black, ruff) to enforce
- Use type hints for function signatures and class attributes
- Prefer f-strings over format() or % formatting
- Use pathlib over os.path for file operations

## Architecture
- Keep modules focused — one responsibility per module
- Use dataclasses or Pydantic for structured data
- Prefer composition over deep inheritance hierarchies
- Use context managers for resource management

## Error Handling
- Use specific exception types, not bare except
- Let exceptions propagate — catch only when you can handle them
- Use logging, not print, for operational output

## Testing
- Use pytest with fixtures
- Test behavior, not implementation
- Use parametrize for testing multiple inputs
- Aim for integration tests over excessive mocking

## Dependencies
- Pin versions in requirements.txt or pyproject.toml
- Use virtual environments — never install globally
- Prefer standard library when it's sufficient

## Git Workflow
- One logical change per commit
- Clear commit messages explaining the why
- Keep PRs focused and reviewable
