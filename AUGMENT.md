# AUGMENT.md — Repo Instructions for Augment Code

This repository uses **`.augment/rules/workspace.md`** as the primary rules file for Augment Code / Augment Agent.

Most operational details (environment, build/run/test commands, architecture, docs) are shared with `CLAUDE.md`. Treat `CLAUDE.md` as the detailed source of truth.

## How Augment Should Use These Files

- Read `.augment/rules/workspace.md` for concise, always-on workspace rules (safe commands, editing guidelines, etc.).
- Use `CLAUDE.md` at the repo root for full project instructions.
- Use `AGENTS.md` for Cursor-specific agent instructions and Nx MCP tooling guidelines.

If you update scripts, env vars, or major conventions, please keep:

- `.augment/rules/workspace.md`
- `CLAUDE.md`
- `AGENTS.md`

in sync.

## Quick Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Full project instructions (env, commands, architecture, conventions) |
| `AGENTS.md` | Cursor agent instructions + Nx MCP tooling |
| `.augment/rules/workspace.md` | Augment-specific thin rules layer |

## Documentation

- **Live Docs**: <https://docs.ever.team/docs/introduction>
- **Docs Repository**: <https://github.com/ever-co/ever-teams-docs/tree/develop/website/docs>
- **GitHub**: <https://github.com/ever-co/ever-teams>
