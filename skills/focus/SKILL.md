---
description: Declare a focus contract for the current task to keep context lean — scopes which files/dirs are in play, bans out-of-scope exploration, and routes broad searches to subagents. Use when starting a task, when the user says "focus on X", or when the session is drifting across unrelated parts of the codebase.
---

# /amber:focus — set a focus contract

The user wants to work on: **$ARGUMENTS**

A focus contract is how this session stays cheap and sharp. Big contexts make models dumber (context rot) and die in compaction. Your job now:

## 1. Define the scope

From the task description (ask one clarifying question only if genuinely ambiguous), determine:

- **In-scope paths**: the files/directories this task will actually touch. Be narrow. Use Glob/Grep to identify them — do not read whole files yet.
- **Out-of-scope**: everything else, named explicitly if the user has been drifting there.
- **Done criteria**: 1–3 checkable statements for what "finished" means.

## 2. Write the contract

Write `.amber/FOCUS.md` in the project root (create the directory if needed):

```markdown
# Focus contract
- Task: <one sentence>
- In scope: <paths/globs>
- Out of scope: <paths or topics, if relevant>
- Done when: <checkable criteria>
- Set: <ISO date>
```

Keep it under 20 lines. This file is re-injected after every compaction, so every line costs tokens forever — earn each one.

## 3. Obey the contract for the rest of the session

- Read only in-scope files, and only the parts you need (offset/limit on large files).
- When you need broad codebase knowledge (where is X defined, how is Y used everywhere), **delegate to an Explore subagent** and consume only its conclusion — never pull file dumps into the main context.
- If the user asks for something out of scope, do it, but say so and offer to update the contract.
- When the task's done criteria are met, say so and suggest `/amber:checkpoint` if the session continues.

Confirm the contract to the user in 2–3 sentences, then start the task.
