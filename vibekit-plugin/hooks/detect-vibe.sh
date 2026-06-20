#!/usr/bin/env bash
# SessionStart hook — detect .vibe/ and emit context for Claude

if [ -d ".vibe" ]; then
  echo "VibeKit project detected."

  if command -v vibe &>/dev/null; then
    OPEN=$(vibe list --status=open 2>/dev/null | wc -l | tr -d ' ')
    IN_PROGRESS=$(vibe list --status=in_progress 2>/dev/null | wc -l | tr -d ' ')
    echo "Tickets: ${IN_PROGRESS} in progress, ${OPEN} open."
    echo "Use 'vibe list' to see tickets, 'vibe start TKT-XXX' to begin work."
  else
    echo "Install vibekit CLI: npm install -g @vibedx/vibekit"
  fi
fi
