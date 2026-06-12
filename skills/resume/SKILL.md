---
description: Reload saved working state from .amber/ (STATE.md, FOCUS.md, checkpoint.md) and continue the previous task. Use when the user says resume/continue where we left off, or at the start of a session in a project that has an .amber directory.
---

# /amber:resume — pick up where you left off

1. Read, in this order, whichever exist:
   - `.amber/STATE.md` — model-written working state (authoritative)
   - `.amber/FOCUS.md` — active focus contract (still binding unless the user changes the task)
   - `.amber/checkpoint.md` — machine-captured facts (recent goals, files touched)

2. If none exist, say so and ask what to work on. Do not invent prior state.

3. Cross-check the state against reality before acting: the files listed — do they still exist, do they contain what the state claims? Git may have moved on since the checkpoint. If reality contradicts the state, trust reality and say what changed.

4. Give the user a 3–5 sentence re-grounding: what the task is, where it stood, and the single next step you propose. Then, unless they redirect you, execute that next step.

5. If `.amber/STATE.md` says "Next steps", do not re-plan from scratch — continue the plan.
