import fs from 'fs';
import path from 'path';
import { getProjectRoot } from './index.js';

function getStateDir() {
  const root = getProjectRoot();
  return path.join(root, '.vibe', '.state');
}

function getSwarmPath() {
  return path.join(getStateDir(), 'swarm.json');
}

export function getLogsDir() {
  return path.join(getStateDir(), 'logs');
}

export function loadSwarmState() {
  const swarmPath = getSwarmPath();
  if (!fs.existsSync(swarmPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(swarmPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveSwarmState(state) {
  const stateDir = getStateDir();
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  fs.writeFileSync(getSwarmPath(), JSON.stringify(state, null, 2), 'utf-8');
}

export function createSwarmState(config) {
  const now = new Date();
  const id = `swarm-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString(36)}`;
  return {
    id,
    started: now.toISOString(),
    config: {
      maxAgents: config.maxAgents || 3,
      timeout: config.timeout || 900
    },
    agents: []
  };
}

export function addAgentToState(state, entry) {
  state.agents.push({
    ticket: entry.ticket,
    title: entry.title,
    pid: entry.pid,
    status: 'running',
    worktree: entry.worktree,
    branch: entry.branch,
    logFile: entry.logFile || null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    pr: null,
    error: null
  });
}

export function updateAgentStatus(state, ticketId, status, extra = {}) {
  const agent = state.agents.find(a => a.ticket === ticketId);
  if (agent) {
    agent.status = status;
    if (status !== 'running') {
      agent.finishedAt = new Date().toISOString();
    }
    Object.assign(agent, extra);
  }
}
