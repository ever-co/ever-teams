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
- [x] T13 Phase 2: attachments (picker, paste, drop; large photos shrunk
  before the upload; thumbnails with a lightbox; the conversation's files
  in its header) and emoji autocomplete (`:` and two letters) (#5048).
  Link previews: the platform has no preview route yet, so none is shown
  and nothing is fetched (T16)
- [x] T14 Phase 2: send-to-chat from the task drawer / page,
  create-task-from-message (#4991)
- [x] T15 Phase 2: command palette (conversations, people to write to,
  "New message"), presence dots (the team's member status on direct
  conversations and member lists), virtualised timeline (behind
  `NEXT_PUBLIC_CHAT_VIRTUAL_LIST_ENABLED`, off by default), phone polish
  (16 px composer text, touch targets, safe area, back from a thread),
  shortcuts (`Alt+↑/↓`, `Alt+Shift+↑/↓`, `Mod+Shift+A`, `Shift+Escape`:
  registry commands, rebindable, in the shortcuts help). `Mod+Enter` to
  send a thread reply waits for the setting that turns it on (FR-8) (#5052)
- [x] T16 Link preview cards, from what the platform returns
  (`GET /chat/link-preview?url=`; the browser fetches no page itself):
  up to three links per message (code left out, the app's own links
  too), one ask per link shared by every message, asked again every 2 s
  while `pending` (three times at most), a link `unavailable` or refused
  not asked again in the page; a platform without the route (404) turns
  them off for the page after one ask; at most 100 asks a minute, a 429
  asked again twice after a pause. A compact card of text only (the site's
  name and always its host, title, two lines of description). Behind
  `NEXT_PUBLIC_CHAT_LINK_PREVIEWS_ENABLED`, off by default; the platform's
  route needs `GAUZY_CHAT_LINK_PREVIEWS_ENABLED=true`. The answer's `image`
  and `icon` sit on the linked site's hosts, and drawing them would make each
  reader's browser call that site, so the card never uses those addresses
- [x] T16b The page's picture in a preview card, as the platform serves it
  (`GET /chat/link-preview/image?url=<the link>`, platform chat T30; proxy
  twin `/api/chat/link-preview/image`): shown from the bytes answered (an
  object URL, released with the card), never from the linked site; asked
  only when the preview names a picture; 204 keeps the card text only, 404
  turns pictures off for the page, 429 / 503 asked again twice; the alt is
  the page's picture description. Behind
  `NEXT_PUBLIC_CHAT_LINK_PREVIEW_IMAGES_ENABLED` (off by default, needs the
  previews on); the platform's route needs
  `GAUZY_CHAT_LINK_PREVIEW_IMAGES_ENABLED=true`
- [x] T17 Platform gaps (ever-gauzy #11800): editable task cards (status,
  priority and assignees in place, through `PATCH /chat/messages/:id/tasks/:taskId`,
  FR-14), "is typing" under the timeline and under a thread (`typing.signalled`),
  messages of files only (empty body, `📎 names` in previews), unsent uploads
  discarded (`DELETE /chat/attachments/:documentId`), `chatService.reorderCategories`
  (no ordering UI yet), thumbnails sized from the files' `width` / `height` (#5072)
