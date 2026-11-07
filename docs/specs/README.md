# Ever Teams specs

Spec-driven development for the app, following the
[GitHub Spec Kit](https://github.com/github/spec-kit) workflow adapted in
[`.specify/`](../../.specify/README.md). The constitution
([`.specify/memory/constitution.md`](../../.specify/memory/constitution.md)) is the
highest-priority document: every spec, plan and task list reconciles with it.

```
docs/specs/
├── README.md            # this index
├── architecture/        # cross-feature architecture docs
├── decisions/           # Architecture Decision Records (ADRs)
└── features/<slug>/     # spec.md (what) · plan.md (how) · tasks.md (PR-sized steps)
```

Ever Teams is a client of the Ever Gauzy platform API. Every feature below names the
platform spec it depends on; the platform specs live in the Ever Gauzy repository under
`docs/specs/features/`.

## Architecture

| Doc | Covers |
| --- | ------ |
| [`architecture/collaboration-suite.md`](architecture/collaboration-suite.md) | How Chat, Docs, Inbox, the real-time client, keyboard navigation and integration settings fit into the web app shell, the shared packages, mobile and desktop |

## Features

| Feature | Spec | Status | Runtime flag | Platform spec |
| ------- | ---- | ------ | ------------ | ------------- |
| Real-time client (one push connection, query invalidation, presence) | [`features/realtime-client/`](features/realtime-client/spec.md) | Draft | `NEXT_PUBLIC_REALTIME_ENABLED` | `realtime-channel` |
| Inbox page (full notification inbox, triage, snooze, preferences) | [`features/inbox/`](features/inbox/spec.md) | Draft | `NEXT_PUBLIC_INBOX_ENABLED` (exists) | `inbox` |
| Chat (channels, direct messages, threads, mentions, task cards) | [`features/chat/`](features/chat/spec.md) | Draft | `NEXT_PUBLIC_CHAT_ENABLED` | `chat` |
| Docs (page tree, editor, comments, versions) | [`features/docs/`](features/docs/spec.md) | Draft | `NEXT_PUBLIC_DOCS_ENABLED` | `docs-pages` |
| Tasks: keyboard-first lists, command palette, bulk actions, saved views | [`features/tasks-keyboard-and-views/`](features/tasks-keyboard-and-views/spec.md) | Draft | `NEXT_PUBLIC_TASK_VIEWS_ENABLED` | `task-views-and-bulk-actions` |
| Integration settings (Asana, Linear, Trello, GitHub) | [`features/integrations-settings/`](features/integrations-settings/spec.md) | Draft | per integration | `integrations-asana-linear-trello` |

Statuses: `Draft` → `In Review` → `Approved` → `Implemented` → `Retrospective`.

## Scaffolding a new feature

```bash
.specify/scripts/bash/create-new-feature.sh <slug> "Feature Title"
```
