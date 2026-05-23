import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadSkillContext() {
  try {
    const skillPath = path.join(__dirname, '..', '..', 'skills', 'vibekit', 'SKILL.md');
    return fs.readFileSync(skillPath, 'utf-8');
  } catch {
    return '';
  }
}

export function buildAgentPrompt(ticket, customPrompt, skillContext) {
  if (customPrompt) return customPrompt;

  const ticketContent = fs.readFileSync(ticket.filePath, 'utf-8');
  const title = ticket.frontmatter.title || 'Untitled';
  let prompt = `You are working on ticket ${ticket.frontmatter.id}: ${title}\n\nHere is the full ticket:\n\n${ticketContent}\n\nImplement the ticket requirements. Follow the acceptance criteria. Commit your work when done. Update the ticket status to done when complete.`;

  if (skillContext) {
    prompt += `\n\n--- VibeKit Skill Reference ---\n${skillContext}`;
  }

  return prompt;
}

export function spawnAgent(prompt, cwd, timeoutSeconds) {
  const agentProcess = spawn('claude', ['-p', prompt, '--timeout', String(timeoutSeconds * 1000)], {
    cwd,
    stdio: 'ignore',
    detached: true
  });

  agentProcess.unref();
  return agentProcess.pid;
}

export function spawnAgentWithLogs(prompt, cwd, timeoutSeconds, logPath) {
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logStream = fs.openSync(logPath, 'w');
  const agentProcess = spawn('claude', ['-p', prompt, '--timeout', String(timeoutSeconds * 1000)], {
    cwd,
    stdio: ['ignore', logStream, logStream],
    detached: true
  });

  agentProcess.unref();
  return agentProcess.pid;
}

export function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function killProcess(pid) {
  try {
    process.kill(pid, 'SIGTERM');
    return true;
  } catch {
    return false;
  }
}
