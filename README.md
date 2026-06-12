<div align="center">

# 🟠 Amber

**Your Claude Code session, preserved in amber.**

Survive compaction. Stay focused. Zero dependencies.

[Install](#install-30-seconds) · [How it works](#how-it-works) · [Skills](#the-skills) · [FAQ](#faq)

</div>

---

## The problem

Every long Claude Code session dies the same death:

1. **Context fills up.** Tool outputs, file reads, and exploration pile up until the window is mostly noise. Models get measurably dumber as context bloats — this is *context rot*, and a bigger window (even 1M) doesn't fix it.
2. **Compaction hits.** Claude Code summarizes the conversation to free space. Summaries are lossy. The bug you were mid-way through debugging, the decision you made an hour ago, the file you agreed *not* to touch — gone.
3. **Claude starts re-asking questions you already answered** and writing code that contradicts what it wrote before lunch.

Existing fixes are heavyweight: databases, AI-powered compression, background processes, a dozen agents. They work, but now you're maintaining a memory system instead of shipping.

## What Amber does

Amber is **three plain Markdown files and two hooks**:

```
.amber/
├── STATE.md       ← Claude's own working notes (task, decisions, next steps)
├── FOCUS.md       ← the scope contract for the current task
└── checkpoint.md  ← auto-captured facts (goals, files touched, todo list)
```

- **Before every compaction** (and at session end), a hook snapshots the hard facts of your session to `checkpoint.md` — deterministically, no model call, ~50ms.
- **Right after compaction** (and on `--resume`), a hook injects your state back into context. Claude re-anchors instead of hallucinating continuity.
- **Four skills** keep the context lean in the first place — because the best compaction is the one that never triggers.

Everything is local. Everything is a file you can open, read, edit, and commit. When you uninstall Amber, your state is still right there in Markdown.

## Install (30 seconds)

```
/plugin marketplace add yanfeid/claude-amber
/plugin install amber@claude-amber
```

Requires Claude Code ≥ 2.x and Node ≥ 18 (which you almost certainly have). No npm install, no database, no config.

Try it:

```
/amber:focus migrate the auth module to OAuth2
... work for a while ...
/amber:checkpoint
/compact        ← watch your state survive
```

## How it works

```
            you work normally
                   │
   ┌───────────────┼─────────────────────────┐
   │               ▼                         │
   │   context approaching limit             │
   │               │                         │
   │        [PreCompact hook]                │
   │   parses transcript → checkpoint.md     │   deterministic,
   │               │                         │   no model call
   │           compaction                    │
   │      (summary loses details)            │
   │               │                         │
   │   [SessionStart hook, source=compact]   │
   │   injects STATE.md + FOCUS.md +         │   capped at ~8KB —
   │   checkpoint.md back into context       │   a context tool must
   │               │                         │   not be a context tax
   │               ▼                         │
   │      Claude re-anchors, continues       │
   └─────────────────────────────────────────┘
```

Two layers of memory, by design:

| Layer | Written by | Captures | Survives |
|---|---|---|---|
| `checkpoint.md` | hook (deterministic) | recent goals, files touched, todos | always — even if Claude never cooperated |
| `STATE.md` | Claude (`/amber:checkpoint`) | *why* — decisions, hypotheses, gotchas, next steps | compaction, restarts, `--resume`, new sessions |

The machine layer guarantees the facts. The model layer preserves the reasoning. Compaction destroys both; Amber restores both.

## The skills

Skills are the second half of the story: they only occupy context when invoked (one description line otherwise), which makes them the official, sanctioned way to keep instructions out of your always-loaded context.

| Skill | What it does |
|---|---|
| `/amber:focus <task>` | Writes a **focus contract** — in-scope paths, out-of-scope zones, done criteria. Claude reads only what the task needs and routes broad searches to subagents instead of dumping files into the main context. |
| `/amber:checkpoint` | Claude writes its working state to `STATE.md` — for an amnesiac reader: the task, the *why* behind decisions, the failing test and current hypothesis, concrete next steps. |
| `/amber:resume` | Reloads `.amber/`, cross-checks it against reality (git moved on?), re-grounds in 5 sentences, continues the plan. |
| `/amber:diet` | Audits what's eating your window — oversized CLAUDE.md, MCP servers with 30 always-loaded tool schemas, rules that should be skills — and produces a slimming plan with estimated token savings. |

`/amber:diet` is the one to run first on an existing project. Most people are paying 2–5K tokens of fixed cost *per turn* without knowing it.

## vs. the alternatives

| | **Amber** | claude-mem | memory-bank templates |
|---|---|---|---|
| Storage | 3 Markdown files | SQLite + AI compression | many Markdown files |
| Dependencies | none (Node built-in) | install + background process | none |
| Model calls to save state | 0 (hook layer) | yes (AI compression) | yes |
| Restore after compaction | automatic, budget-capped | automatic | manual |
| Can you read your memory? | it's Markdown in your repo | query the DB | yes |
| Context cost when idle | ~4 skill description lines | varies | large always-loaded files |
| Setup | 2 commands | guided install | copy templates, edit 12 files |

These are good projects with different philosophies. Amber's bet: **for most developers, session memory should be boring** — files, not infrastructure.

## FAQ

**Does this work with Fable 5 / Opus / Sonnet?**
Yes — Amber operates at the harness level (hooks + skills), not the model level. It works with any model Claude Code runs, and it matters *more* on expensive models where re-establishing lost context costs real money.

**I have a 1M context window. Do I still need this?**
A 1M window delays compaction; it doesn't prevent it, and it makes context rot *worse* — more accumulated noise diluting your signal. Lean context + durable state beats big context every time.

**Where does my data go?**
Nowhere. Everything is plain files under `.amber/` in your project. No network calls, no telemetry, no cloud.

**Should I commit `.amber/` to git?**
Your call. `STATE.md` and `FOCUS.md` can be useful to teammates (and to Claude on other machines); `checkpoint.md` is machine-generated churn. The default `.gitignore` recommendation is to ignore the whole directory.

**Does the restore hook bloat my fresh context?**
It's hard-capped at ~8KB (~2K tokens), prioritized: your `STATE.md` first, focus contract second, machine checkpoint last. If `.amber/` is empty it injects exactly zero tokens.

**What about secrets?**
The checkpoint hook records goals and file *paths*, not file contents. The `/amber:checkpoint` skill explicitly instructs Claude never to write secrets into `STATE.md`. Still: treat `.amber/` like any other repo file.

## Roadmap

- [ ] Statusline integration: context % + last checkpoint age at a glance
- [ ] `/amber:handoff` — generate a teammate-readable handoff doc from session state
- [ ] Token-usage report after each session (what actually ate your window)
- [ ] OpenCode / other-harness ports if there's demand

## Contributing

Issues and PRs welcome. The whole plugin is ~400 lines — read it in ten minutes:

```
hooks/scripts/checkpoint.js   ← transcript → checkpoint.md
hooks/scripts/restore.js      ← .amber/ → injected context
skills/*/SKILL.md             ← the four skills
```

Test locally without installing:

```bash
claude --plugin-dir ./claude-amber
```

## License

MIT

---

<div align="center">

*Context is not storage. It's attention. Spend it like money.*

If Amber saved your session, ⭐ the repo — it's how other people find it.

</div>
