# Tasks: Chat

**Feature**: `chat` · **Plan**: [`plan.md`](./plan.md) · **Branch**: `feat/chat`

- [x] T1 Contract types, `chatService`, proxy routes
- [x] T2 Formatting and mention helpers + spec
- [x] T3 Hooks: scope/people, lists, timeline, threads, drafts, actions (optimistic send with nonce)
- [x] T4 Conversation list (Unreads, Threads, categories, channels, direct) with badges and actions
- [x] T5 Conversation view: header (favourite, notify level, leave), timeline, composer, edit mode, read on view
- [x] T6 Message item: Markdown subset, mention chips, reactions, pins, edited / deleted, task cards, toolbar and menu
- [x] T7 Thread pane with follow state and "also send to the conversation"
- [x] T8 Dialogs: new channel, new message, browse channels
- [x] T9 Routes, sidebar entry, protected path, `teamChat` strings in the 13 locales
- [ ] T10 Gate: `yarn test:web`, typecheck, cspell — fix forward
- [ ] T11 Manual check against a platform with the chat plugin on (two users: messages, threads, reactions, badges)
- [x] T12 Live channel through `useRealtimeEvent` (after `realtime-client` merges); drop the polls while connected (#4987)
- [ ] T13 Phase 2: attachments, link previews, emoji autocomplete
- [x] T14 Phase 2: send-to-chat from the task drawer / page,
  create-task-from-message (#4991)
- [ ] T15 Phase 2: command palette, presence dots, virtualised list, phone polish, shortcuts
