---
description: Audit what is eating the context window in this project (CLAUDE.md size, MCP servers, rules that should be skills) and produce a concrete slimming plan with estimated token savings. Use when the user complains about context filling up fast, frequent compaction, or asks to optimize/reduce context usage.
disable-model-invocation: true
---

# /amber:diet — context audit & slimming plan

Audit this project's fixed context costs and produce a slimming plan. Fixed costs are paid **every turn of every session** — a 2,000-token CLAUDE.md in a 100-turn session is 200K tokens of spend and a fatter, dumber context.

## 1. Measure the consumers

Check each of these (skip silently if absent):

| Consumer | How to check | Red flag |
|---|---|---|
| Project `CLAUDE.md` (+ imports) | Read it, estimate tokens (~chars/3.5) | > 300 lines |
| User `~/.claude/CLAUDE.md` | Read it | Project-specific content in a global file |
| MCP servers | `.mcp.json`, `~/.claude.json` mcpServers for this project | Servers with 10+ tools that are rarely used — every tool schema is always-loaded context |
| `.claude/rules/`, large always-on context files | List + size | Rules that only apply to specific situations |
| `.claude/skills/` | List descriptions | Bloated descriptions (the description line is the only always-loaded part — bodies are free) |

## 2. Classify every instruction in CLAUDE.md

- **Keep (always-relevant)**: build commands, hard constraints, style rules that apply to every edit.
- **→ Skill (situational)**: anything starting with "when X, do Y" that isn't hit every session — deploy procedures, release checklists, how to run a specific tool. Move the body into a skill; only its one-line description stays resident.
- **→ Delete**: things Claude can derive from the code, duplicated docs, stale instructions.

## 3. Deliver the plan

Output a short report:

1. Current fixed cost estimate (tokens per turn) by consumer.
2. Specific moves: "lines X–Y of CLAUDE.md → new skill `deploy-checklist`", "disable MCP server Z (used 0 times in recent sessions, costs ~N tokens of tool schemas)".
3. Estimated fixed-cost after the diet.

Then ask whether to apply the moves. If the user approves, perform them: create the skill files (with `description` frontmatter written for recall, ≤ 2 lines), trim CLAUDE.md, and list every change made. Do not delete anything without showing it first.
