# Agent Collaboration Workflow

A reference pattern for teams using vibekit as the backbone for AI agent coordination — multiple agents working across repos, picking up tickets autonomously, and escalating to humans when they get stuck.

This guide is framework-agnostic. It works with any AI coding agent (Claude Code, Codex, Cursor, OpenClaw, and others) and any communication channel (Slack, Discord, email, webhooks). The only requirement is that your agents can execute shell commands and read files.

## Why Use Vibekit for Agent Collaboration

When you have more than one agent touching a codebase — or agents working alongside human developers — you need a shared source of truth for **who is doing what**. Without it, agents step on each other, duplicate work, and lose context between sessions.

Vibekit solves this with three primitives:

1. **Tickets** — scoped units of work, stored as markdown files in git, with clear assignees
2. **Team config** — `.vibe/team.yml` maps member IDs to external handles (GitHub, Slack, etc.)
3. **Status + assignee** — `vibe list --assignee=<me> --status=open` is all an agent needs to know what to pick up

Because tickets live in git, every agent sees the same state. No shared database, no message bus, no race conditions.

## The Reference Flow

```
        ┌───────────────┐
        │  Human or     │
        │  Agent creates│
        │  ticket       │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │  vibe new     │──┐
        │  --assignee=X │  │ assignee = X
        └───────┬───────┘  │
                │          │
                ▼          │
        ┌───────────────┐  │
        │  Agent X polls│◄─┘
        │  vibe list    │
        │  --assignee=X │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │  vibe start   │
        │  TKT-NNN      │
        │  (new branch) │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │  Agent does   │
        │  the work     │
        └───┬───────┬───┘
            │       │
       done │       │ blocked / needs input
            ▼       ▼
     ┌──────────┐ ┌────────────┐
     │vibe close│ │ mark       │
     │TKT-NNN   │ │ blocked +  │
     │          │ │ notify     │
     │ notify   │ │ human      │
     └──────────┘ └────────────┘
```

## Step 1: Set Up Team Config

Each project's `.vibe/team.yml` lists humans and bot agents as first-class members. Agents are just team members with a bot-style ID.

```bash
vibe team add alice --name "Alice" --github alice --role "Engineer"
vibe team add bob --name "Bob" --github bob --role "Designer"
vibe team add agent-1 --name "Research Agent" --github agent-1 --role "AI Engineer"
vibe team add agent-2 --name "Review Agent" --github agent-2 --role "AI Reviewer"
```

Now tickets can be assigned to anyone — human or bot — by their ID.

```bash
vibe new "Add password reset flow" --assignee alice -n
vibe new "Generate boilerplate for new endpoint" --assignee agent-1 -n
vibe new "Review accessibility of new dialog" --assignee agent-2 -n
```

The `-n` flag is important for automation — it skips the interactive AI enhancement prompt that would otherwise block a non-interactive shell.

## Step 2: Agents Poll for Work

Each agent should run on a schedule (cron, launchd, systemd timer, CI job, etc.) and check for tickets assigned to it.

The simplest loop an agent needs:

```bash
# Every N minutes, run this:
vibe list --assignee=agent-1 --status=open
```

If there are tickets, iterate over them in priority order. Read the full ticket from `.vibe/tickets/TKT-NNN-*.md` — the description, acceptance criteria, and implementation notes are the agent's full context for the task.

### Agent System Prompt Template

Use a prompt like this when spawning an agent session:

```
You are agent-1, an engineering agent working on this repo.

Your workflow:
1. Run `vibe list --assignee=agent-1 --status=open` to find your tickets
2. Pick the highest-priority ticket
3. Read `.vibe/tickets/<ticket-id>-*.md` for the full scope
4. Run `vibe start <ticket-id>` to create a branch
5. Implement the work following the acceptance criteria
6. Commit with `git commit -m "<ticket-id>: <short description>"`
7. Run `vibe close <ticket-id>` when done
8. If you get stuck, edit the ticket to add a "## Blocker" section
   and set `status: blocked` in the frontmatter
9. Never work on tickets assigned to someone else

Rules:
- One ticket at a time
- Never touch main directly — always work in the ticket's branch
- If acceptance criteria are unclear, mark blocked and stop
- Keep commits scoped to the ticket
```

## Step 3: Coordinating Multiple Agents

When two agents share a repo, avoid collisions with these conventions:

1. **One assignee per ticket.** Never assign a ticket to multiple agents. If work needs to split, create separate tickets and link them via the description.
2. **Branch per ticket.** `vibe start` handles this automatically — each ticket lives on its own branch.
3. **Atomic polling.** Agents should not hold a ticket across polling cycles. Start → work → close or start → work → block. Partial state is fine (status stays `in_progress`), but don't dangle.
4. **Respect ownership.** An agent should never touch a ticket assigned to another agent or a human, even if it looks easy. Escalate via a comment or a new ticket instead.

### Delegation Pattern

If agent-1 realizes agent-2 is better suited for a task, it should **create a new ticket** assigned to agent-2 rather than reassigning the original. This keeps the chain of custody auditable.

```bash
# agent-1 is working on TKT-042 and realizes accessibility review is needed
vibe new "Accessibility review for TKT-042 dialog" --assignee agent-2 --priority medium -n
# Link back in the description, continue with TKT-042
```

## Step 4: Notifications

Vibekit itself doesn't send notifications — that's intentional. Wire notifications to whatever channel your team uses by reading ticket status on a cadence.

A simple pattern: after running `vibe close TKT-NNN`, the agent posts a message to a channel of your choice with the ticket ID, title, and summary. The exact mechanism (webhook, CLI tool, API call) is up to the team.

Keep notifications focused on state changes:
- Ticket opened
- Ticket started
- Ticket closed
- Ticket blocked (most important — this needs a human)

For blocked tickets, tag a human reviewer with enough context that they can unblock without digging into the codebase.

## Step 5: Escalation to Humans

When an agent gets stuck, the escalation path is:

1. Edit the ticket file to add a `## Blocker` section describing exactly what's unclear
2. Set `status: blocked` in the frontmatter
3. Commit the updated ticket
4. Notify a human reviewer through your normal channel
5. Stop work on the ticket — don't guess or spin

When the human responds (via editing the ticket, via chat, whatever), the agent picks it back up on the next polling cycle.

### Bot-to-Bot Loop Prevention

Without safeguards, two agents can ping-pong forever — agent-1 delegates to agent-2, agent-2 delegates back, etc. Cap interactions:

- **Max exchanges per ticket chain**: e.g. 3 back-and-forth delegations
- **After the cap**: mark blocked and tag a human, regardless of ticket state
- **Watchdog**: a separate process (or a scheduled job) scans for tickets that have been `in_progress` longer than expected and forces them to `blocked`

The rule of thumb: if two agents can't resolve something in 3 exchanges, a human needs to intervene. Loops are a signal that something is ambiguous.

## Example: A Full Cycle

Here's what a full human → agent → human cycle looks like in practice:

```bash
# Alice (human) creates a ticket for agent-1
vibe new "Add rate limiting middleware" \
    --assignee agent-1 \
    --author alice \
    --priority high \
    -n
# Output: Created TKT-105

# Alice edits .vibe/tickets/TKT-105-add-rate-limiting-middleware.md to add
# detailed acceptance criteria and implementation notes, commits, pushes.

# --- 15 minutes later, agent-1's polling cycle runs ---

# Agent-1 sees TKT-105, reads it, starts work:
vibe start TKT-105
# → branch: feature/TKT-105-add-rate-limiting-middleware

# Agent-1 implements the middleware, runs tests, commits:
git commit -m "TKT-105: add sliding-window rate limiter"
git commit -m "TKT-105: add tests for 429 responses"

# Agent-1 closes the ticket:
vibe close TKT-105

# Agent-1 posts to the team channel (through whatever mechanism):
# "TKT-105 done — rate limiting added. PR: <url>"

# Alice (or another human) reviews and merges.
```

If agent-1 had hit an ambiguity — say, the spec didn't say whether rate limiting should be per-user or per-IP — it would have stopped, added a `## Blocker` section asking exactly that question, set `status: blocked`, and tagged Alice. Alice would clarify in the ticket, and agent-1 would pick it up on the next cycle.

## Anti-Patterns

- **Assigning tickets to "everyone"** — defeats the ownership model
- **Agents working on main** — always use `vibe start` for a branch
- **Long-running in-progress tickets** — if it's been in progress for hours without activity, mark it blocked
- **Agents editing other agents' tickets** — never, except to add a new comment section
- **Silent failures** — if an agent fails, it should mark blocked, not skip silently

## Minimal Agent Implementation

The entire pattern can be implemented in ~20 lines of shell for any agent framework:

```bash
#!/bin/bash
# run-agent.sh — minimal agent polling loop
set -e

AGENT_ID="agent-1"
REPO="/path/to/repo"

cd "$REPO"
git pull --rebase

# Get open tickets assigned to this agent
TICKETS=$(vibe list --assignee="$AGENT_ID" --status=open 2>/dev/null | grep TKT- | awk '{print $1}')

for TKT in $TICKETS; do
    echo "Working on $TKT"
    vibe start "$TKT"

    # Hand the ticket file to your agent of choice
    your-agent-cli --input ".vibe/tickets/$TKT"*.md

    # Commit whatever the agent produced
    git add -A
    git commit -m "$TKT: agent work" || true
    vibe close "$TKT"
done
```

Replace `your-agent-cli` with however you invoke your AI agent in non-interactive mode. The important part is the ticket-driven loop — vibekit gives you the state machine, you bring the intelligence.

## Summary

Vibekit gives teams a ticket-driven protocol that works equally well for humans and AI agents. The core ideas:

- **Tickets are the source of truth** — not chat, not tribal knowledge
- **Assignees are first-class** — any agent is just a team member
- **One ticket, one branch, one assignee** — no ambiguity
- **Escalate by marking blocked** — don't guess, don't loop
- **Framework-agnostic** — wrap it with any agent, any notification channel

The result: a codebase where multiple agents and humans can collaborate without stepping on each other, with a full audit trail in git.
