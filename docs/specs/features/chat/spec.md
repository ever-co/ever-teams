# Feature Specification: Chat

> Behaviour-first spec per [Constitution Principle X](../../../../.specify/memory/constitution.md#x-specs-are-behaviour-first).
> Describe **what** the user observes, not how it is built. Save implementation
> details for `plan.md`. Mark any unresolved question with `[NEEDS CLARIFICATION: …]`.

**Feature ID**: `chat`
**Branch**: `feat/chat`
**Status**: `Draft`
**Created**: 2026-11-07
**Last updated**: 2026-11-07
**Owner**: app maintainers
**Runtime flag**: `NEXT_PUBLIC_CHAT_ENABLED` (default off)
**Platform API dependency**: platform spec `chat` (+ `realtime-channel` for live updates)

---

## 1. Overview

Team members talk to each other inside the app: channels grouped in categories, direct
and group messages, and threads under any message. Messages support formatting,
@mentions, reactions, pins, attachments and link previews. Tasks are first-class in chat:
a task reference or link shows a task card members can act on, a task can be sent to a
conversation from its page or drawer, and a task can be created from a message. Unread
and mention badges appear in the sidebar and on conversations; mentions also land in the
Inbox. The web app ships first with a three-pane layout (conversations, messages, thread)
and a phone layout with list → conversation navigation.

## 2. User Scenarios

### 2.1 Primary scenarios

- **Given** the flag is on, **when** a user opens Chat from the sidebar, **then** they see
  Unreads, Threads, their categories with channels, and direct messages, and the last
  conversation they had open.
- **Given** a user in a channel, **when** they type and press Enter, **then** the
  message appears immediately (sending state, then confirmed), `Shift+Enter` inserts a
  newline, and the composer keeps a draft per conversation if they navigate away.
- **Given** a user typing `@`, **when** the suggestion list opens, **then** it offers
  conversation members and `@channel`/`@here`, inserts a chip, and the sent message shows
  the chip for everyone.
- **Given** a message, **when** a user hovers it, **then** a toolbar offers quick
  reactions, reply in thread, and more (copy link, pin, edit own, delete own); clicking
  "reply in thread" opens the thread pane.
- **Given** a message that references a task, **when** it renders, **then** a task card
  shows title, status, priority, assignees and due date, lets members change status or
  assignee inline, and opens the task drawer on click.
- **Given** a task drawer, **when** the user chooses "Send to chat" and picks a
  conversation, **then** the task card is posted there and the drawer shows a link to
  the message.
- **Given** a message, **when** the user chooses "Create task", **then** the task
  composer opens prefilled with the message text; on save, the message shows the task card.
- **Given** unread conversations, **when** the user opens the Unreads view, **then** it
  lists them newest first; `Alt+Shift+↓` jumps to the next unread conversation.
- **Given** a user, **when** they press `Mod+K` and type a channel or person's name,
  **then** the command palette offers the conversation and opens it.
- **Given** a member with a running timer, **when** others view the conversation members,
  **then** the member shows the same status dot used across the app.

### 2.2 Edge cases & failures

- **Given** the real-time client is off, **when** the user uses chat, **then** messages
  send normally and the open conversation refreshes every few seconds; the sidebar badges
  refresh on the existing cadence.
- **Given** a send fails, **when** the network returns, **then** the message retries with
  the same idempotency key and never duplicates; a failed message shows a retry action.
- **Given** a conversation the user was removed from, **when** they are on it, **then** the
  view shows "no longer available" and returns to the list.
- **Given** a message with a link to a private address, **when** rendered, **then** no
  preview is shown and nothing is fetched by the browser.
- **Given** a phone, **when** the user opens a conversation, **then** the list is
  replaced by the conversation with a back action; threads open as a full view.
- **Given** the flag is off, **when** `/chat` is visited, **then** the user is sent home.

## 3. Functional Requirements

- **FR-1** The app MUST provide `/chat`, `/chat/unreads`, `/chat/threads`,
  `/chat/[conversationId]` (with `?thread=` side pane and `?m=` jump-to-message) and
  `/chat/[conversationId]/thread/[messageId]`.
- **FR-2** Users MUST be able to create channels (public/private), browse and join public
  channels, start direct and group messages, favourite conversations, set a
  per-conversation notify level, and (with permission) manage categories and channel
  settings.
- **FR-3** The composer MUST support formatting (bold, italic, code, code block, lists,
  links), @mentions with chips, emoji autocomplete, attachments by picker, paste and drop
  (images shrunk client-side before upload), drafts per conversation, `Enter` to send,
  `Shift+Enter` for newline, and `Escape` to cancel an edit.
- **FR-4** Messages MUST render formatting, mention chips, reactions with counts, pinned
  state, edited marker, deleted placeholder, attachments with lightbox, link preview
  cards, and task cards with inline status and assignee pickers.
- **FR-5** Threads MUST open in a side pane on desktop and as a full view on phones, show
  follow state, and allow "also send to channel".
- **FR-6** Unread handling MUST follow the platform's counters: bold conversations, count
  badges for mentions and direct messages, mark read on view, mark unread from a message,
  mark all read with undo, and a sidebar badge on the Chat entry.
- **FR-7** Task integration MUST include task cards from references and links, "Send to
  chat" in the task drawer and task page menus, and "Create task from message".
- **FR-8** Keyboard shortcuts MUST include `Alt+↑/↓` previous/next conversation,
  `Alt+Shift+↑/↓` previous/next unread, `Mod+Shift+A` unreads, `Shift+Escape` mark all
  read, `Mod+Enter` send comment in threads when configured; all listed in the shortcuts help.
- **FR-9** The command palette MUST include conversations and "New message".
- **FR-10** Presence MUST reuse the app's member status indicator.
- **FR-11** The AI assistant route MUST remain available; chat and assistant are
  separate entries.
- **FR-12** `/chat` MUST be a protected path; every string MUST exist in every locale.

## 4. Non-Functional Requirements

- **Performance**: conversation opens with the newest 50 messages under 1 s warm; chat
  pages lazily loaded; virtualized message list; within the page-weight budget.
- **Reliability**: optimistic send with idempotency key; retry with backoff; outbox kept
  in memory until confirmed.
- **Security & privacy**: content sanitised before rendering; previews come from the
  platform; attachments through existing upload paths.
- **Accessibility**: messages are a list with roving focus; toolbar actions have labels;
  reduced motion honoured.
- **Compatibility**: web first; mobile ships the conversation list, messages and threads
  in the following release; desktop wraps the web.

## 5. Key Entities & Domain Concepts

| Entity / concept | Description |
| ---------------- | ----------- |
| `Conversation`   | A channel, direct or group conversation with the user's membership state |
| `Message`        | A message with formatting, mentions, reactions, attachments, thread root and task references |
| `TaskCard`       | The inline rendering of a referenced task with quick actions |
| `Draft`          | Unsent composer text per conversation kept in local storage |

## 6. Out of Scope

- Voice and video calls (meetings exist).
- Custom emoji, stickers, message scheduling.
- Guest access.

## 7. Acceptance Criteria

- [ ] Two users exchange messages, thread replies and reactions and see each other's
      actions live; badges match on reload.
- [ ] Mention chips, task cards, send-to-chat and create-task-from-message work.
- [ ] Unreads view, mark-all-read with undo and keyboard navigation work.
- [ ] Phone layout works; the flag off removes the entry and redirects `/chat`.
- [ ] Every new string present in every locale file.
- [ ] All functional requirements have a passing test.

## 8. Open Questions

- `[NEEDS CLARIFICATION: whether the assistant keeps its /api/chat route or moves to /api/ai/chat before the chat proxies land (proposed: move, with a redirect, to keep /api/chat-* for messaging)]`

## 9. Constitution Gates

- [x] I Platform API is the backend.
- [x] II Layered web app.
- [x] III Every string translated.
- [x] IV Runtime config; default-off flag; nothing removed.
- [x] V One design system.
- [x] VI Security and privacy.
- [x] VII Real-time through the platform channel.
- [x] VIII Multi-client parity stated.
- [x] IX Tests and gates.
- [x] X Behaviour-first (this document).
- [x] XI Documentation describes our product only.

## 10. References

- Platform spec: `chat` (Ever Gauzy repository, `docs/specs/features/chat/`)
- Related: [`../realtime-client/spec.md`](../realtime-client/spec.md), [`../inbox/spec.md`](../inbox/spec.md)
