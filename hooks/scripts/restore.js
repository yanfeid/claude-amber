#!/usr/bin/env node
/**
 * Amber restore — runs on SessionStart with source "compact" or "resume".
 *
 * Reads the .amber/ directory in the project and prints a compact restore
 * block to stdout. For SessionStart hooks, plain stdout is injected into the
 * model's context — so right after a compaction wipes the details, the model
 * gets its state back.
 *
 * Deliberately budget-capped: a context-saving tool must not become a
 * context tax. Total injection is capped at ~8 KB.
 *
 * Zero dependencies. Node >= 18. Never throws.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TOTAL_BUDGET = 8000; // chars, ~2K tokens worst case

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function readIfExists(fp, cap) {
  try {
    if (!fs.existsSync(fp)) return null;
    let content = fs.readFileSync(fp, 'utf8').trim();
    if (!content) return null;
    if (content.length > cap) content = content.slice(0, cap) + '\n… (truncated by Amber to protect your context budget)';
    return content;
  } catch {
    return null;
  }
}

function main() {
  const input = safeJson(readStdin()) || {};
  const cwd = input.cwd || process.cwd();
  const source = input.source || 'unknown';
  const dir = path.join(cwd, '.amber');

  // Priority order: model-written state > declared focus > machine checkpoint.
  const sections = [];
  let remaining = TOTAL_BUDGET;

  const state = readIfExists(path.join(dir, 'STATE.md'), Math.min(4500, remaining));
  if (state) {
    sections.push({ title: 'Working state (written by you in a previous turn via /amber:checkpoint)', body: state });
    remaining -= state.length;
  }

  const focus = readIfExists(path.join(dir, 'FOCUS.md'), Math.min(1500, Math.max(remaining, 0)));
  if (focus && remaining > 200) {
    sections.push({ title: 'Active focus contract (set via /amber:focus — stay inside this scope)', body: focus });
    remaining -= focus.length;
  }

  const checkpoint = readIfExists(path.join(dir, 'checkpoint.md'), Math.max(remaining, 0));
  if (checkpoint && remaining > 200) {
    sections.push({ title: 'Machine checkpoint (auto-captured facts of this session)', body: checkpoint });
  }

  if (!sections.length) {
    // Nothing to restore — stay silent, inject zero tokens.
    process.exit(0);
  }

  const reason =
    source === 'compact'
      ? 'Context was just compacted. Details may have been lost in summarization — the state below is authoritative.'
      : 'Session resumed. The state below is from your previous work in this project.';

  const out = [];
  out.push('<amber-restore>');
  out.push(`[Amber] ${reason}`);
  out.push('Re-anchor on it before continuing. Do not re-ask questions it already answers, and do not re-derive decisions it already records.');
  out.push('');
  for (const s of sections) {
    out.push(`--- ${s.title} ---`);
    out.push(s.body);
    out.push('');
  }
  out.push('</amber-restore>');

  process.stdout.write(out.join('\n'));
  process.exit(0);
}

main();
