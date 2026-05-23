# React Project Guidelines

## Architecture
- Use functional components with hooks
- Keep components small and single-responsibility
- Colocate related files (component, styles, tests, types)

## State Management
- Use local state (useState) for component-specific state
- Lift state up when shared between siblings
- Use context sparingly — prefer prop drilling for shallow trees

## Patterns
- Extract custom hooks for reusable logic
- Use composition over inheritance
- Prefer controlled components for forms
- Memoize expensive computations with useMemo, not every render

## Styling
- Use CSS modules or the project's styling solution consistently
- Follow mobile-first responsive design
- Keep styles colocated with components

## Testing
- Test behavior, not implementation details
- Use React Testing Library
- Write integration tests for user flows, unit tests for utilities

## Performance
- Lazy load routes and heavy components
- Avoid unnecessary re-renders — profile before optimizing
- Use React.memo only when measured improvement exists

## Git Workflow
- One component/feature per PR
- Write clear commit messages describing the user-facing change
