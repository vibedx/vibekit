# Node.js Project Guidelines

## Architecture
- Separate concerns: routes, controllers, services, data access
- Use dependency injection for testability
- Keep middleware thin — delegate to service layer

## Error Handling
- Use typed errors with meaningful messages
- Let errors bubble up to a centralized handler
- Never swallow errors silently
- Return appropriate HTTP status codes

## Security
- Validate all external input at the boundary
- Use parameterized queries — never interpolate user input into SQL/NoSQL
- Keep dependencies updated; audit regularly
- Never log sensitive data (tokens, passwords, PII)

## Performance
- Use streaming for large payloads
- Cache expensive operations with TTLs
- Use connection pooling for databases
- Profile before optimizing — measure, don't guess

## Testing
- Unit test business logic in isolation
- Integration test API endpoints with real database
- Use fixtures, not mocks, for data layer tests

## Git Workflow
- One logical change per commit
- Write commit messages that explain why, not what
- Keep PRs reviewable — under 400 lines when possible
