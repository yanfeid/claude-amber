#!/usr/bin/env node
/**
 * Amber checkpoint — runs on PreCompact and SessionEnd.
 *
 * Reads the hook payload from stdin, parses the session transcript (JSONL),
 * and writes a small, human-readable snapshot to .amber/checkpoint.md in the
 * project directory. This is the deterministic safety net: even if the model
 * never ran /amber:checkpoint, the facts of the session (recent goals, files
 * touched) survive compaction.
 *
 * Zero dependencies. Node >= 18. Never throws — a checkpoint hook must not
 * break the session it is trying to protect.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MAX_GOALS = 6;          // recent user messages to keep
const MAX_GOAL_CHARS = 500;   // truncate long user messages
const MAX_FILES = 40;         // files-touched cap
const MAX_LINES = 200000;     // transcript line safety cap

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function safeJson(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/** Extract plain text from a message content field (string or block array). */
function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('\n');
}

/** True for harness-injected noise we don't want in the checkpoint. */
function isNoise(text) {
  if (!text) return true;
  const t = text.trim();
  if (!t) return true;
  if (t.startsWith('<system-reminder>')) return true;
  if (t.startsWith('<command-name>')) return true;
  if (t.startsWith('<local-command')) return true;
  if (t.startsWith('Caveat:')) return true;
  // Skill bodies are injected into the transcript as user messages — not goals.
  if (t.startsWith('Base directory for this skill:')) return true;
  if (t.startsWith('Launching skill:')) return true;
  return false;
}

function main() {
  const input = safeJson(readStdin()) || {};
  const cwd = input.cwd || process.cwd();
  const transcriptPath = input.transcript_path;
  const trigger = input.hook_event_name || 'unknown';

  const goals = [];
  const files = new Map(); // path -> Set of tool names
  let lastTodos = null;

  if (transcriptPath && fs.existsSync(transcriptPath)) {
    let lines;
    try {
      lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
    } catch {
      lines = [];
    }
    if (lines.length > MAX_LINES) lines = lines.slice(-MAX_LINES);

    for (const line of lines) {
      if (!line.trim()) continue;
      const entry = safeJson(line);
      if (!entry) continue;
      const msg = entry.message;
      if (!msg) continue;

      if (msg.role === 'user') {
        const text = textOf(msg.content);
        if (!isNoise(text)) {
          goals.push(text.length > MAX_GOAL_CHARS ? text.slice(0, MAX_GOAL_CHARS) + ' …' : text);
          if (goals.length > MAX_GOALS * 4) goals.splice(0, goals.length - MAX_GOALS * 4);
        }
      }

      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (!block || block.type !== 'tool_use' || !block.input) continue;
          const fp = block.input.file_path || block.input.notebook_path;
          if (typeof fp === 'string' && fp) {
            // Only record mutations + reads of project files; skip transient temp paths.
            if (!files.has(fp)) files.set(fp, new Set());
            files.get(fp).add(block.name || 'tool');
            if (files.size > MAX_FILES * 3) {
              const firstKey = files.keys().next().value;
              files.delete(firstKey);
            }
          }
          if (block.name === 'TodoWrite' && Array.isArray(block.input.todos)) {
            lastTodos = block.input.todos;
          }
        }
      }
    }
  }

  const recentGoals = goals.slice(-MAX_GOALS);
  const mutated = [];
  const readOnly = [];
  for (const [fp, tools] of files) {
    const t = [...tools];
    if (t.some((n) => /write|edit/i.test(n))) mutated.push(fp);
    else readOnly.push(fp);
  }

  const now = new Date().toISOString();
  const out = [];
  out.push('# Amber checkpoint (auto-generated)');
  out.push('');
  out.push(`> Sealed at ${now} · trigger: \`${trigger}\` · do not edit by hand.`);
  out.push('> This is the machine snapshot. The model-written state lives in `STATE.md`.');
  out.push('');
  out.push('## Recent user goals (newest last)');
  out.push('');
  if (recentGoals.length) {
    for (const g of recentGoals) out.push(`- ${g.replace(/\s*\n\s*/g, ' ')}`);
  } else {
    out.push('- (none captured)');
  }
  out.push('');
  out.push('## Files modified this session');
  out.push('');
  if (mutated.length) {
    for (const fp of mutated.slice(-MAX_FILES)) out.push(`- ${fp}`);
  } else {
    out.push('- (none)');
  }
  if (readOnly.length) {
    out.push('');
    out.push('## Files read (context that was in scope)');
    out.push('');
    for (const fp of readOnly.slice(-15)) out.push(`- ${fp}`);
  }
  if (lastTodos && lastTodos.length) {
    out.push('');
    out.push('## Last known todo list');
    out.push('');
    for (const td of lastTodos) {
      const status = td.status || 'pending';
      const mark = status === 'completed' ? 'x' : ' ';
      out.push(`- [${mark}] ${td.content || ''}${status === 'in_progress' ? ' ← in progress' : ''}`);
    }
  }
  out.push('');

  try {
    const dir = path.join(cwd, '.amber');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'checkpoint.md'), out.join('\n'), 'utf8');
  } catch {
    // Never fail the session over a checkpoint.
  }

  process.exit(0);
}

main();
