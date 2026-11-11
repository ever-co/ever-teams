# Implementation Plan: Chat

**Feature**: `chat` · **Spec**: [`spec.md`](./spec.md) · **Branch**: `feat/chat` · **Status**: Phase 1 in review (2026-11-07)

## 1. Summary

Team chat on the platform chat API (platform spec `chat`): channels in categories, direct and group messages,
threads, reactions, pins, mentions and task cards, with the person's unread state. Behind
`NEXT_PUBLIC_CHAT_ENABLED` (runtime flag, off by default); the AI assistant keeps its own entry. Phase 1 ships
the three-pane web layout, the composer with mentions, threads, reactions, read state and the dialogs; phase 2
adds attachments, link previews, emoji autocomplete, send-to-chat / create-task, the command palette, presence
and the live channel.

## 2. Reuse

| Need | Existing piece | How it is used |
| --- | --- | --- |
| Platform data | `/chat/*` (conversations, direct, members, state, messages, threads, reactions, read, read-all) | `chatService` + 28 proxy twins `app/api/chat/**` (generated; parameters encoded) |
| People | `activeTeamState.members` (`personFromTeamMember`) | avatars, mention chips and suggestions |
| Tasks | `tasksByTeamState`, `useTaskDrawer` | task cards and their target |
| Markdown | `react-markdown` (already a dependency) | the body, allowed elements only; mention tokens rendered as chips by a `text` component |
| Chrome | `PageLayout`, `Dialog`, `DropdownMenu`, `Input`, `Button`, notification states | the page |
| Query keys | `queryKeys.chat.*` (new group) — the real-time client invalidates the `chat` prefix | hooks |
| Flags | `readRuntimeEnv` | `isChatEnabled` (sidebar entry, page redirect) |

## 3. Modules (`apps/web`)

| Module | Responsibility |
| --- | --- |
| `core/types/interfaces/common/chat.ts` | the platform contract as the app reads it |
| `core/services/client/api/chat/chat.service.ts` | every route, both transports |
| `core/lib/utils/chat-format.ts` | mention tokens → chips, plain preview, `@` query + suggestions, titles, sort, grouping, drafts, nonce, page merge |
| `core/hooks/chat/*` | scope and people; conversations / browse / members / followed threads; the timeline (newest page, older on scroll, newer by polling), threads; drafts; the actions (optimistic send with nonce + retry, edit, delete, pin, react, read, unread-from, read-all + undo, follow, notify level, favourite, create, direct, join, leave) |
| `core/components/pages/chat/*` | page (three panes, views, dialogs, `Shift+Escape`), conversation list, conversation view, message item, composer, thread pane, Markdown renderer, skeleton |
| `app/[locale]/(main)/chat/**` | `/chat`, `/chat/[conversationId]`, `/chat/unreads`, `/chat/threads` |

## 4. Rules

- **Send is optimistic**: the message shows as pending with its nonce; the platform's answer replaces it; a
  refusal marks it failed with Retry (same nonce, never a duplicate) and Discard.
- **Read on view**: opening a conversation with unread messages marks it read; "mark unread from here" and
  mark-all-read (with Undo through the platform's snapshot) are explicit.
- **Mentions** are rename-safe tokens (`<@employeeId>`, `<!channel>`, `<!here>`); the composer inserts them
  from the `@` suggestions; the renderer resolves names at render time and highlights the reader's.
- **Live updates**: until the real-time client lands, the open conversation polls for newer messages every 5 s
  and the lists every 30 s; then `useRealtimeEvent` invalidates by query key (phase 2).
- **Permissions**: the page shows what the platform answers; management actions appear for admins and managers.

## 5. Tests

`chat-format` (tokens, preview, `@` query, suggestions, titles, sort, grouping, merge, draft keys).

Phase 2: `chat-emoji` (the `:` query, outside code; index and ranking), `chat-attachments` (shrink size, limits,
the body of a message of files alone, transfers, safe addresses, unknown files), `document-upload-fields` (the upload
proxy passes only the vetted fields), and the hooks of the files and of the uploads.

## 6. Phase 2

Attachments (upload path), link previews (platform), emoji autocomplete, send-to-chat from the task drawer and
page, create-task-from-message, command palette entries, presence dots, virtualised list, phone polish,
keyboard shortcuts beyond `Shift+Escape`, categories management, channel settings.
