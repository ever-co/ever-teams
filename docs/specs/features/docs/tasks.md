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
- [x] T12 Phase 2: text-anchored comments with Inbox entries: the platform's comments on entity `Document`, a thread on
  the block of the selected text (`[[block:<blockId>]]` first line, the platform editor's anchor; `BlockIds` gives every
  block its UUID `blockId`, kept in the JSON the page opens from); Comments panel (Open / Resolved, quote of the block,
  "text gone" for a detached thread, replies, resolve / reopen, edit / delete for the author, copy link); the blocks with
  an open thread marked in the editor (their marker opens the thread); Comment in the selection toolbar, Mod-Alt-M and the
  phone's row; mentions (`mentionEmployeeIds`) and the page's followers reach the Inbox through the platform, whose entries
  open the thread (`?thread=`) or the page's comments (`?comments=1`); realtime comment hints refresh the panel; specs
  `docs-comments.test.ts`, `block-id-extension.test.ts`, `docs-editor-extensions.test.ts`, `inbox-entry.test.ts`
- [x] T13 Phase 2: presence avatars: the co-editors of a live page (its session's awareness) beside "Live" in the page header (T16)
- [x] T14 Phase 2: task chips, command palette entries, `?block=` / `?thread=` deep links: a link to a task page reads
  as a chip with the task's number and status (the team's tasks the app holds) that opens the task drawer (Mod-click on
  the link too), a pasted task address becomes a link titled with the task; the palette lists the pages the platform's
  search matches (title and text) with their space and description; `/docs/[pageId]?block=` scrolls to and lights the
  block, `?thread=` opens the thread, Copy link to block in the selection toolbar; specs `docs-links.test.ts`,
  `docs-editor-extensions.test.ts`
- [x] T15 Phase 2: sub-page zip export, drag to reorder among siblings, phone editing polish: Export with sub-pages (zip)
  from `GET …/:id/export/markdown?subtree=true` (proxy twin), drop before / after a row (the top and bottom quarter)
  reorders among the siblings (`POST …/reorder`) or moves to the other parent at that place (`POST …/:id/move` with
  `index`); on a phone the tree opens as a drawer over the page and a formatting row sits above the on-screen keyboard;
  specs `docs-tree.test.ts`, `docs-viewport.test.ts`
- [x] T16 Live co-editing on the platform's live sessions (`docs-collaboration` T15–T18), behind `NEXT_PUBLIC_DOCS_LIVE_ENABLED`:
  `core/lib/docs-live/` (binding, transport, schema guard) binds TipTap `Collaboration` to an empty `Y.Doc` filled by the
  `sync` frame, drops a document of another lineage, sends what the platform lacks after every `sync`, batches edits
  (75 ms, `Y.mergeUpdates`), carets and presence over `y-protocols/awareness`, read-only with its reason, and falls back
  to the autosave ("Not live", page read again) on `closed`, a 404 status route, a refused session or content the editor
  cannot carry; specs `binding.test.ts`, `schema-guard.test.ts`, `live-collaboration.test.ts`
- [x] T17 Spaces and follows (`docs-collaboration` T5–T6): team spaces in the tree (`GET …/documents/spaces`, `TEAM` pages
  grouped by team), new pages in a team space, Move to space (`POST …/:id/space`), Follow / Mute in the page menu
  (`GET|POST …/:id/follow`, `…/unfollow|mute|unmute`); hidden while the platform answers 404
- [ ] T18 Manual check of live editing against a platform with `GAUZY_DOCS_LIVE_ENABLED` (two tabs: carets, avatars, offline
  edits merging, read-only on a locked page, "Not live" when the page is trashed)
