# Privacy Policy — Amber

Effective: 2026-06-12

Amber is a local-only Claude Code plugin. In plain terms:

- **No data collection.** Amber does not collect, store, or transmit any personal data, usage data, or telemetry.
- **No network requests.** Amber's hook scripts and skills make zero network calls of any kind. The only I/O is reading the local session transcript that Claude Code already stores on your machine, and writing Markdown files to the `.amber/` directory inside your own project.
- **Everything stays on your machine.** Session snapshots (`checkpoint.md`), working state (`STATE.md`), and focus contracts (`FOCUS.md`) are plain text files in your project directory, under your control. Delete the `.amber/` directory at any time to remove them.
- **No accounts, no third parties.** Amber has no backend, no analytics provider, and no third-party services.

Note: the contents of `.amber/` files may be read back into your Claude Code session by design (that is the plugin's purpose), and are therefore visible to the model within your own session — the same as any other file in your project. Do not store secrets in `.amber/` files; the `/amber:checkpoint` skill explicitly instructs Claude never to write secrets there.

Questions: open an issue at https://github.com/yanfeid/claude-amber/issues
