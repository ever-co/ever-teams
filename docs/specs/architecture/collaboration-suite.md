# Collaboration suite — architecture (Ever Teams)

**Status**: Accepted (2026-11-07) · **Owner**: app maintainers · **ADR**: [001](../decisions/001-platform-channel-for-realtime.md)

How Chat, Docs, Inbox, the real-time client, keyboard navigation and integration
settings fit into the web app, the shared packages, mobile and desktop. The platform
side (Ever Gauzy) owns every entity and endpoint; this app owns the experience.

## 1. Shape

```mermaid
flowchart LR
    subgraph web [apps/web]
        P[Pages app/[locale]/(main)/chat · docs · inbox · views]
        C[core/components/chat · docs · inbox · tasks]
        H[core/hooks/* TanStack Query]
        S[core/services/client/api/*]
        R[app/api/* thin proxies]
        RT[core/lib/realtime one connection]
        ST[core/stores Jotai]
    end
    P --> C --> H --> S --> R
    H --> ST
    RT --> H
    R --> G[(Platform API)]
    RT -. graphql-ws .-> G
```

## 2. What is reused in the app

| Existing piece | Where | Used by |
| --- | --- | --- |
| Notification bell + popover (read/unread/archive/mark-all, filters, keyboard rows), hooks, services, proxies, `notifications.*` i18n in 13 locales, gated `Inbox` sidebar entry and `NEXT_PUBLIC_INBOX_ENABLED` | `core/components/notifications/inbox/*`, `core/hooks/notifications/*`, `core/services/client/api/notifications/*`, `app/api/employee-notification*` | Inbox page (same hooks, paginated), live badge |
| Task drawer, task detail column, `openTaskDrawer(id)` deep link | `core/components/tasks/drawer/*`, `tasks/detail/*` | inbox targets, chat task cards, docs task chips |
| Task comments with mentions, emoji, files, Ctrl+Enter; generic `/comment` client and proxy accepting any entity | `core/components/tasks/drawer/comment-composer.tsx`, `task-drawer-comments.tsx`, `core/services/client/api/comments/*`, `app/api/comment/*` | docs page comments (entity `Document`), chat composer (forked) |
| Mention candidates and chips | `core/hooks/organizations/teams/use-team-mention-candidates.ts`, `core/lib/utils/comment-mentions.ts` | chat and docs mentions (unified on employee ids) |
| Rich editor (Tiptap 3: slash menu, mentions, images, AI help, read-only view) | `core/components/common/rich-editor/*` | Docs editor (+ tables, callouts, file blocks, task chips, comment anchors) |
| Entity files (upload, link, download through the platform Docs plugin) | `core/services/client/api/documents/entity-files.service.ts`, `app/api/plugins/docs/*` | docs file blocks, chat attachments |
| Member presence (`getMemberPresence`, heartbeat), timer status badge | `core/lib/utils/team-members.utils.ts`, `core/hooks/users/use-employee-presence-heartbeat.ts`, `core/components/timer/timer-status.tsx` | chat member list, docs presence avatars |
| Collaborate dialog member picker | `core/components/collaborate/collaborate-dialog.tsx` | "New message" / "Send to chat" pickers |
| Settings kit, settings entries, GitHub integration page, integration-tenant hooks | `core/components/settings/kit/*`, `settings-entries.ts`, `core/components/pages/integration/github/*`, `core/hooks/integrations/*` | Integrations catalogue and provider pages, notification preferences |
| Command palette, shortcuts help, sidebar recipes | `core/components/layouts/app-sidebar.tsx`, `sidebar-command-modal.tsx`, `KeyboardShortcuts` | shortcut registry, palette groups, sidebar entries with badges |
| Task list view model (grouping, ordering, filters, local storage) | `core/lib/utils/team-tasks-view.ts`, `use-team-tasks-view.ts` | saved views (server-stored) with the local model as the unsaved state |
| Runtime env, `parseBoolEnv`, `isInboxEnabled()` pattern | `core/services/server/runtime-env.ts`, `core/lib/ever-platform/env.ts`, `app-sidebar.tsx` | every new flag |
| AI assistant (`/assistant`, `/api/chat`, provider chain) | `core/components/features/assistant/*`, `core/lib/ai/*` | stays; the assistant route is renamed to `/api/ai/chat` with a redirect so `/api/chat-*` is free for messaging |

## 3. New folders

| Feature | Routes | Components | Data |
| --- | --- | --- | --- |
| Real-time client | — | `core/components/common/realtime-status.tsx` | `core/lib/realtime/{client,events,presence}.ts`, `core/hooks/realtime/*` |
| Inbox page | `app/[locale]/(main)/inbox/page.tsx` | `core/components/pages/inbox/*`, `core/components/notifications/inbox/*` (extended) | `core/services/client/api/inbox/*`, `app/api/inbox/**`, `core/hooks/inbox/*` |
| Chat | `app/[locale]/(main)/chat/{page,unreads,threads,[conversationId],[conversationId]/thread/[messageId]}` | `core/components/pages/chat/*`, `core/components/chat/*` | `core/services/client/api/chat/*`, `app/api/chat-conversation/**`, `app/api/chat-message/**`, `core/hooks/chat/*`, `core/stores/chat/*` |
| Docs | `app/[locale]/(main)/docs/{page,[docId],trash}`, `projects/[id]/docs` | `core/components/pages/docs/*`, `core/components/docs/*` | `core/services/client/api/docs/*`, `app/api/plugins/docs/**` (extended), `core/hooks/docs/*` |
| Tasks keyboard & views | `app/[locale]/(main)/views/[viewId]/{page,[taskId]}` | `core/components/tasks/bulk-toolbar.tsx`, `core/lib/shortcuts/*` | `core/services/client/api/tasks/task-view.service.ts` (extended), `core/hooks/tasks/use-task-views.ts` |
| Integration settings | `app/[locale]/(main)/settings/team/integrations/{page,[key]}` | `core/components/settings/pages/integrations/*` | `core/services/client/api/integrations/*`, `app/api/integration/**` |

## 4. Gates every lane respects

- Every string in all 13 `apps/web/locales/*.json`; brand text through `{appName}`.
- Dual transport: every client service path has a proxy route under `app/api/` for
  proxy mode; multipart gets its own route.
- `PROTECTED_APP_URL_PATHS` gains `/chat`, `/docs`, `/inbox`, `/views`.
- Feature-surface preservation: no route, export, service method or test name is removed;
  generalised helpers keep their old exports.
- Lazy-load heavy pages (editor, chat) like `LazyRichEditor`; respect the page-weight
  budget; `refetchIntervalInBackground: false`; no new polling where the channel exists.
- cspell words added with the code; knip entry points updated for new packages.
- Mobile parity stated in each spec; shared logic promoted to `packages/*` or the toolkit
  when a second client needs it.

## 5. Order of delivery

Real-time client → Inbox page → Chat → Docs → Tasks keyboard & views → Integration
settings, each behind its runtime flag, each merged into `develop` as soon as it is
coherent, each with its platform counterpart merged first.
