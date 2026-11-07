# Tasks: Docs

**Feature**: `docs` · **Plan**: [`plan.md`](./plan.md) · **Branch**: `feat/docs`

- [x] T1 Contract types, `docsService`, proxy twins of the documents endpoints
- [x] T2 Pure helpers + specs: tree, recent / expanded memory, Markdown export, mentions
- [x] T3 Hooks: scope, availability probe, tree and trash, page and path, autosave with conflicts, actions, versions, search, favourites, recent, project pages
- [x] T4 Tree pane: search, favourites, workspace, private, recent, trash; keyboard; drag to nest; page menu
- [x] T5 Page view: breadcrumb, title, icon, save state, editor surface (lazy), notices (conflict, locked, oversize, error), menu, export, print
- [x] T6 Version panel with preview and restore; trash page with restore and delete for good
- [x] T7 Dialogs: name, move to, pick a page, icon
- [x] T8 Project Docs tab; attachments no longer list pages
- [x] T9 Routes, sidebar entry, protected path, env sample, cspell, `docs` strings in the 13 locales
- [ ] T10 Gate: `yarn test:web`, typecheck, cspell — fix forward (cluster run `nopush-ever-teams-feat-docs-*`)
- [ ] T11 Manual check against a platform with documents on (two users: conflict notice, versions, trash, project tab)
- [ ] T12 Phase 2: text-anchored comments with Inbox entries
- [ ] T13 Phase 2: presence avatars through `useRealtimeEvent` (after `realtime-client` merges)
- [ ] T14 Phase 2: task chips, command palette entries, `?block=` / `?thread=` deep links
- [ ] T15 Phase 2: sub-page zip export, drag to reorder among siblings, phone editing polish
