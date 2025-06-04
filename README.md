# Vibe CLI

A powerful CLI tool for managing development tickets and project workflows.

## Installation

```bash
npm install -g @vibedx/vibekit
```

## Features

- 🚀 Quick project initialization with `vibe init`
- 📝 Create and manage tickets with `vibe new` and `vibe close`
- 📋 List and track tickets with `vibe list`
- 🎓 Get started guide with `vibe get-started`

## Commands

### Initialize a Project
```bash
vibe init
```

### Create a New Ticket
```bash
vibe new
```

### List Tickets
```bash
vibe list
```

### Close a Ticket
```bash
vibe close
```

### Get Started Guide
```bash
vibe get-started
```

## Configuration

The CLI uses a `.vibe` folder in your project root with the following structure:

```
.vibe/
  ├── config.yml        # Configuration file
  ├── .templates/       # Ticket templates
  └── tickets/         # Your tickets
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
