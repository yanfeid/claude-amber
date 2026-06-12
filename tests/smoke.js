#!/usr/bin/env node
/**
 * Smoke test for Amber's hook scripts. Zero dependencies.
 * Run: node tests/smoke.js
 */

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let failures = 0;

function check(name, cond) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures++;
    console.error(`FAIL  ${name}`);
  }
}

function runHook(script, payload) {
  const res = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', script)], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    timeout: 15000,
  });
  return res;
}

// --- setup a fake session ---
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amber-smoke-'));
const transcript = path.join(dir, 'transcript.jsonl');
fs.writeFileSync(
  transcript,
  [
    JSON.stringify({ type: 'user', message: { role: 'user', content: 'migrate auth to OAuth2' } }),
    JSON.stringify({
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [
          { type: 'tool_use', name: 'Edit', input: { file_path: '/proj/src/auth/login.ts' } },
          { type: 'tool_use', name: 'TodoWrite', input: { todos: [{ content: 'migrate login', status: 'in_progress' }] } },
        ],
      },
    }),
    JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: '<system-reminder>noise</system-reminder>' }] } }),
    JSON.stringify({ type: 'user', message: { role: 'user', content: 'Base directory for this skill: /x # skill body noise' } }),
    'not json — must be skipped',
  ].join('\n'),
  'utf8'
);

// --- checkpoint.js ---
const cp = runHook('checkpoint.js', {
  session_id: 's1',
  transcript_path: transcript,
  cwd: dir,
  hook_event_name: 'PreCompact',
});
check('checkpoint.js exits 0', cp.status === 0);

const ckPath = path.join(dir, '.amber', 'checkpoint.md');
check('checkpoint.md written', fs.existsSync(ckPath));
const ck = fs.existsSync(ckPath) ? fs.readFileSync(ckPath, 'utf8') : '';
check('captures user goal', ck.includes('migrate auth to OAuth2'));
check('captures modified file', ck.includes('/proj/src/auth/login.ts'));
check('captures todo', ck.includes('migrate login'));
check('filters system-reminder noise', !ck.includes('noise'));
check('filters skill-body noise', !ck.includes('skill body noise'));

// --- restore.js with state ---
fs.writeFileSync(path.join(dir, '.amber', 'STATE.md'), '# Working state\n## Task\nOAuth2 migration\n', 'utf8');
const rs = runHook('restore.js', { cwd: dir, hook_event_name: 'SessionStart', source: 'compact' });
check('restore.js exits 0', rs.status === 0);
check('restore wraps in amber-restore tag', rs.stdout.includes('<amber-restore>') && rs.stdout.includes('</amber-restore>'));
check('restore includes STATE.md first', rs.stdout.indexOf('OAuth2 migration') < rs.stdout.indexOf('Amber checkpoint'));
check('restore stays under budget', rs.stdout.length < 9000);

// --- restore.js with nothing to restore ---
const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'amber-empty-'));
const rsEmpty = runHook('restore.js', { cwd: emptyDir, source: 'compact' });
check('empty restore exits 0', rsEmpty.status === 0);
check('empty restore injects zero bytes', rsEmpty.stdout === '');

// --- checkpoint.js must never crash on garbage input ---
const garbage = spawnSync(process.execPath, [path.join(ROOT, 'hooks', 'scripts', 'checkpoint.js')], {
  input: 'this is not json',
  encoding: 'utf8',
  timeout: 15000,
});
check('checkpoint.js survives garbage stdin', garbage.status === 0);

fs.rmSync(dir, { recursive: true, force: true });
fs.rmSync(emptyDir, { recursive: true, force: true });

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll smoke checks passed.');
