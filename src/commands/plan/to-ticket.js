import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import yaml from 'js-yaml';
import { getTicketsDir, getConfig, getNextTicketId, createSlug } from '../../utils/index.js';
import { logger } from '../../utils/cli.js';

/**
 * Parse CLI arguments for the to-ticket subcommand
 */
function parseToTicketArgs(args) {
  let planFile = null;
  let dryRun = false;
  let autoCreate = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--auto') {
      autoCreate = true;
    } else if (!arg.startsWith('-')) {
      planFile = arg;
    }
  }

  return { planFile, dryRun, autoCreate };
}

/**
 * Read and validate a plan file
 */
function readPlanFile(planFile) {
  if (!planFile) {
    throw new Error('Plan file path is required');
  }

  // Resolve path relative to cwd if not absolute
  const filePath = path.isAbsolute(planFile)
    ? planFile
    : path.join(process.cwd(), planFile);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Plan file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return { filePath, content };
}

/**
 * Create a prompt for Claude to extract tickets from a plan
 */
function createExtractionPrompt(planContent) {
  return `You are a senior software engineer analyzing a project plan.

Plan content:
${planContent}

Extract all actionable work items from this plan and convert them to a JSON list of tickets.

For each ticket, provide:
- title: A clear, descriptive title (max 80 chars)
- description: The main work to be done
- acceptance_criteria: An array of 2-4 specific, measurable criteria
- priority: One of: low, medium, high, critical
- estimated_hours: Rough estimate (0.5, 1, 2, 4, 8, 16, 32)

Return ONLY a valid JSON object with this structure:
{
  "tickets": [
    {
      "title": "...",
      "description": "...",
      "acceptance_criteria": ["...", "..."],
      "priority": "medium",
      "estimated_hours": 4
    }
  ]
}

Ensure each ticket is focused, actionable, and independent.`;
}

/**
 * Parse Claude envelope and extract text
 */
function parseClaudeEnvelope(raw) {
  let envelope;
  try {
    envelope = JSON.parse(raw.trim());
  } catch {
    throw new Error('Claude returned non-JSON output');
  }

  if (envelope.is_error) {
    throw new Error(envelope.result || 'Claude reported an error');
  }

  const text = envelope.result ?? '';
  if (!text.trim()) {
    throw new Error('Claude returned an empty result');
  }

  return text;
}

/**
 * Extract JSON from Claude's text response
 */
function extractJsonFromResponse(text) {
  const cleaned = text.trim();

  // 1. Direct parse — Claude responded with pure JSON
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch { /* fall through */ }

  // 2. Markdown code block — ```json ... ``` or ``` ... ```
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    try {
      JSON.parse(inner);
      return inner;
    } catch { /* fall through */ }
  }

  // 3. Loose extraction — grab first {...} block
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      JSON.parse(objMatch[0]);
      return objMatch[0];
    } catch { /* fall through */ }
  }

  throw new Error('No valid JSON object found in Claude response');
}

/**
 * Execute Claude to extract tickets from plan
 */
async function extractTicketsFromPlan(planContent) {
  const prompt = createExtractionPrompt(planContent);

  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    const child = spawn('claude', ['--print', '--output-format', 'json'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn Claude: ${err.message}`));
    });

    child.on('close', (code) => {
      if (!stdout.trim()) {
        reject(new Error(stderr.trim() || `Claude exited with code ${code}`));
        return;
      }

      try {
        const text = parseClaudeEnvelope(stdout);
        const jsonStr = extractJsonFromResponse(text);
        const result = JSON.parse(jsonStr);
        resolve(result.tickets || []);
      } catch (err) {
        reject(new Error(`Failed to parse Claude response: ${err.message}`));
      }
    });

    child.stdin.write(prompt, 'utf8');
    child.stdin.end();
  });
}

/**
 * Create a ticket in .vibe/tickets/
 */
function createTicketFile(ticketData, ticketsDir, ticketId) {
  const slug = createSlug(ticketData.title);
  const fileName = `${ticketId}-${slug}.md`;
  const filePath = path.join(ticketsDir, fileName);

  const acceptanceCriteria = (ticketData.acceptance_criteria || [])
    .map(criterion => `- [ ] ${criterion}`)
    .join('\n');

  const content = `---
id: ${ticketId}
title: ${ticketData.title}
slug: ${slug}
description: ${ticketData.description || ''}
priority: ${ticketData.priority || 'medium'}
status: open
created_at: "${new Date().toISOString()}"
updated_at: "${new Date().toISOString()}"
estimated_hours: ${ticketData.estimated_hours || 0}
---

## Description

${ticketData.description || 'No description provided'}

## Acceptance Criteria

${acceptanceCriteria || '- [ ] Complete the work'}

## Notes

Generated from plan via \`vibe plan to-ticket\`.
`;

  fs.writeFileSync(filePath, content, 'utf-8');
  return { fileName, filePath };
}

/**
 * Main to-ticket subcommand
 */
async function toTicketCommand(args) {
  try {
    const { planFile, dryRun, autoCreate } = parseToTicketArgs(args);

    // Validate plan file
    const { filePath, content: planContent } = readPlanFile(planFile);

    console.log(`📄 Reading plan: ${path.basename(filePath)}`);
    console.log('');

    // Extract tickets using Claude
    console.log('🤖 Analyzing plan with Claude...');
    const tickets = await extractTicketsFromPlan(planContent);

    if (!tickets || tickets.length === 0) {
      console.log('⚠️  No tickets extracted from plan.');
      process.exit(0);
    }

    console.log(`✅ Extracted ${tickets.length} ticket(s)\n`);

    // Show extracted tickets
    for (const ticket of tickets) {
      console.log(`📋 ${ticket.title}`);
      console.log(`   Priority: ${ticket.priority || 'medium'}`);
      console.log(`   Est. hours: ${ticket.estimated_hours || '?'}`);
      if (ticket.acceptance_criteria && ticket.acceptance_criteria.length > 0) {
        console.log(`   Criteria: ${ticket.acceptance_criteria.length} items`);
      }
      console.log('');
    }

    if (dryRun) {
      console.log('🏁 Dry run complete. No tickets created.');
      process.exit(0);
    }

    if (!autoCreate) {
      console.log('💡 Use --auto to create these tickets automatically.');
      process.exit(0);
    }

    // Create tickets
    const ticketsDir = getTicketsDir();
    if (!fs.existsSync(ticketsDir)) {
      fs.mkdirSync(ticketsDir, { recursive: true });
    }

    console.log('✨ Creating tickets...\n');

    const createdTickets = [];
    for (const ticketData of tickets) {
      try {
        const ticketId = getNextTicketId(ticketsDir);
        const result = createTicketFile(ticketData, ticketsDir, ticketId);
        createdTickets.push({ id: ticketId, ...result });
        console.log(`  ✅ ${ticketId}: ${ticketData.title}`);
      } catch (error) {
        console.error(`  ❌ Failed to create ticket: ${error.message}`);
      }
    }

    console.log('');
    console.log(`🎉 Created ${createdTickets.length} ticket(s)`);
    console.log('');
    console.log('Next steps:');
    console.log('  vibe list           # See all tickets');
    console.log('  vibe start TKT-XXX  # Start working on a ticket');

  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}

export default toTicketCommand;
