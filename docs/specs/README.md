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
| Real-time client (one push connection, query invalidation, presence) | [`features/realtime-client/`](features/realtime-client/spec.md) | In progress — [`plan`](features/realtime-client/plan.md) · [`tasks`](features/realtime-client/tasks.md) · branch `feat/realtime-client` | `NEXT_PUBLIC_REALTIME_ENABLED` | `realtime-channel` |
| Inbox page (full notification inbox, triage, snooze, preferences) | [`features/inbox/`](features/inbox/spec.md) | In progress — [`plan`](features/inbox/plan.md) · [`tasks`](features/inbox/tasks.md) · branch `feat/inbox-page` | `NEXT_PUBLIC_INBOX_ENABLED` (exists) | `inbox` |
| Chat (channels, direct messages, threads, mentions, task cards) | [`features/chat/`](features/chat/spec.md) | Phase 1 in review — [`plan`](features/chat/plan.md) · [`tasks`](features/chat/tasks.md) · branch `feat/chat` | `NEXT_PUBLIC_CHAT_ENABLED` | `chat` |
| Docs (page tree, editor, comments, versions) | [`features/docs/`](features/docs/spec.md) | In review — [`plan`](features/docs/plan.md) · [`tasks`](features/docs/tasks.md) · branch `feat/docs` · PR [#4968](https://github.com/ever-co/ever-teams/pull/4968) | `NEXT_PUBLIC_DOCS_ENABLED`, `NEXT_PUBLIC_DOCS_LIVE_ENABLED` (live editing) | existing Docs API + `docs-collaboration` |
| Tasks: keyboard-first lists, command palette, bulk actions, saved views | [`features/tasks-keyboard-and-views/`](features/tasks-keyboard-and-views/spec.md) | Phase 1 in review ([#4970](https://github.com/ever-co/ever-teams/pull/4970)) — [`plan`](features/tasks-keyboard-and-views/plan.md) · [`tasks`](features/tasks-keyboard-and-views/tasks.md) | `NEXT_PUBLIC_TASK_VIEWS_ENABLED` | `task-views-and-bulk-actions` |
| Comments and trash (edit/delete/resolve comments, reactions, task trash) | [`features/comments-and-trash/`](features/comments-and-trash/spec.md) | In review — [`plan`](features/comments-and-trash/plan.md) · [`tasks`](features/comments-and-trash/tasks.md) · branch `feat/comments-reactions-trash` | `NEXT_PUBLIC_COMMENT_REACTIONS_ENABLED`, `NEXT_PUBLIC_TASK_TRASH_ENABLED` | `comments-and-trash` |
| Integration settings (Asana, Linear, Trello, GitHub) | [`features/integrations-settings/`](features/integrations-settings/spec.md) | Draft | per integration | `integrations-asana-linear-trello` |
| Time, attendance and leave (check-in and check-out, attendance, time off, shifts, approvals in the Inbox) | [`features/people-self-service/`](features/people-self-service/spec.md) | Draft — [`plan`](features/people-self-service/plan.md) · [`tasks`](features/people-self-service/tasks.md) | `NEXT_PUBLIC_PEOPLE_SELF_SERVICE_ENABLED` | `attendance-and-shifts`, `time-off-management`, `approval-workflows`, `calendar-and-scheduling` |
| Workspace collaboration clients (chat, meetings, calendar events, mail, files and wiki on web, desktop and mobile) | [`features/workspace-collaboration-clients/`](features/workspace-collaboration-clients/spec.md) | Draft — [`plan`](features/workspace-collaboration-clients/plan.md) · [`tasks`](features/workspace-collaboration-clients/tasks.md) | `NEXT_PUBLIC_COLLABORATION_CLIENTS_ENABLED` | `chat-messaging`, `chat-agents-and-record-actions`, `chat-administration-and-clients`, `meetings`, `calendar-and-scheduling`, `mail`, `drive`, `documents-and-wiki` |

Statuses: `Draft` → `In Review` → `Approved` → `Implemented` → `Retrospective`.

## Scaffolding a new feature

```bash
.specify/scripts/bash/create-new-feature.sh <slug> "Feature Title"
```
