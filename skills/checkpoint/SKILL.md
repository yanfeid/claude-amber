---
description: Write the current working state (task, decisions, files touched, open problems, next steps) to .amber/STATE.md so it survives compaction and session restarts. Use when the user asks to checkpoint/save state, before risky long operations, when context feels heavy, or before ending a work session.
---

# /amber:checkpoint — seal your working state

Write everything a fresh instance of you would need to continue this work, to `.amber/STATE.md` (overwrite; create `.amber/` if needed).

Additional instruction from user (may be empty): $ARGUMENTS

## What to write

Use exactly this structure:

```markdown
# Working state
Sealed: <ISO datetime>

## Task
<What we are doing and WHY — one short paragraph. Include who asked and what done looks like.>

## Decisions made (do not re-litigate)
- <decision> — <one-line reason>

## Current status
<Where the work stands right now. What is verified working, what is untested.>

## Files in play
- <path> — <what changed / why it matters>

## Open problems / gotchas
- <Anything that bit you: failing test + suspected cause, weird constraint, thing the user corrected you on>

## Next steps
1. <Concrete next action, specific enough to execute without re-reading the whole conversation>
```

## Rules

- Write for an amnesiac: assume the reader has NOT seen this conversation. No "as discussed above", no shorthand labels you invented mid-session.
- Record **why**, not just what — the reasoning is exactly what compaction destroys.
- Mid-debug? The error message, what you tried, and your current hypothesis are the most valuable lines in the file. Never omit them.
- Budget: under 60 lines. Drop anything derivable from the code or git history.
- Do not put secrets, API keys, or tokens in this file.

After writing, tell the user in one sentence that state is sealed and will auto-restore after compaction or in the next session.
