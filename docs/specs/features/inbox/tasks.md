# Tasks: Inbox page

**Feature**: `inbox` · **Plan**: [`plan.md`](./plan.md) · **Branch**: `feat/inbox-page`

- [x] T1 Types, `inboxService`, proxy routes
- [x] T2 `toInboxEntry` and the bell-data adapter; filters, snooze presets, day groups + spec
- [x] T3 Hooks: scope, availability probe, infinite items, counts, optimistic actions with undo, keyboard
- [x] T4 Page: header, tabs, source filter, search, selection bar, day groups, infinite scroll, detail pane, skeleton
- [x] T5 Rows: avatar, sentence, subject, source chip, age, hover actions (read, snooze menu, done, archive)
- [x] T6 Route `/inbox` (protected), flag check, bell links to the page, `inbox` strings in the 13 locales
- [ ] T7 Gate: `yarn test:web`, typecheck, cspell — fix forward
- [ ] T8 Manual check against a platform with the inbox plugin on: tabs, snooze returns, done, undo, legacy mode on an older platform
- [x] T9 Decisions answered in the detail pane (`POST /inbox/items/:id/reply`) (#4989)
- [x] T10 Delivery preferences and push (platform `inbox` spec T13–T15): email per kind, quiet hours and digest
  hour (#4978), browser push on this device (#4985); push per kind (`pushByType`), the person's devices with a
  remove action, and the sound of a new entry in this browser + specs
- [x] T11 Mobile list and open-target: below the large breakpoint a row opens its target (task drawer, chat message,
  link); a question and an entry with nothing to open show in the sheet over the list; row actions under the text
  on touch screens (#5008) + specs
