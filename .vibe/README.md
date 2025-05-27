# Welcome to VibeKit

VibeKit is a CLI tool for managing tickets, project context, and AI suggestions inside your repository.

## Getting Started

Here are the main commands you can use:

- `vibe init` - Initialize VibeKit in your repository
- `vibe new "Ticket title"` - Create a new ticket
- `vibe list` - List all tickets
- `vibe close TKT-XXX` - Mark a ticket as done

## Ticket Structure

Each ticket is a Markdown file with YAML frontmatter containing metadata like:
- id
- title
- status
- priority
- created_at
- updated_at

The body of the ticket contains sections for Description, Acceptance Criteria, Notes, and AI prompts.

## Next Steps

Check out the sample tickets we've created for you to see how VibeKit can be used in your workflow.
