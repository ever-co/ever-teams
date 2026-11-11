# Implementation Plan: Docs

**Feature**: `docs` · **Spec**: [`spec.md`](./spec.md) · **Branch**: `feat/docs` · **Status**: Phase 1 in review (2026-11-07)

## 1. Summary

Docs on the platform's existing documents API: a page is a document of kind `PAGE` whose content is the editor's
JSON (canonical) plus a rendered HTML cache; folders group pages; the trash is the platform's archive. Behind
`NEXT_PUBLIC_DOCS_ENABLED` (runtime flag, off by default). Phase 1 ships the tree pane, the page with autosave and
conflict handling, versions, trash, Markdown export, print and the project Docs tab; phase 2 adds text-anchored
comments, presence, task chips, the command palette and the sub-page zip export; live co-editing waits for the
platform's collaboration transport.

## 2. Reuse

| Need | Existing piece | How it is used |
| --- | --- | --- |
| Platform data | `/plugins/docs/documents` (list, count, one, path, content, move, reorder, duplicate, archive, unarchive, delete, recover, versions, links) | `docsService` + proxy twins `app/api/plugins/docs/documents/**` (parameters encoded) |
| Project attachment | `/plugins/docs/links` (entity `OrganizationProject`) through `entityFilesService` | the project Docs tab; `filesOf` no longer lists pages as attachments |
| Editor | `core/components/common/rich-editor` (Tiptap, HTML value, handle with the editor) | `DocsEditorSurface` (its own lazy chunk) reads the HTML cache and writes HTML + `editor.getJSON()` |
| Read-only text | `RichTextView` | locked pages, pages in the trash, version previews |
| Favourites | platform favourites (`useFavoritesQuery`, create, delete) with entity `Document` | the Favourites section and the star |
| People | `activeTeamState.members` (`personFromTeamMember`) | the editor's `@` suggestions (employee ids, which the platform notifies on save) |
| Emoji | `LazyEmojiPicker` | the page icon |
| Chrome | `PageLayout`, `Dialog`, `DropdownMenu`, `AlertDialogConfirmation`, `Breadcrumb`, `AnimatedEmptyState` | the pages |
| Query keys | `queryKeys.docs.*` (new group) | hooks and invalidation |
| Flags | `readRuntimeEnv` | `isDocsEnabled` (sidebar entry, page redirect, project tab) |

## 3. Modules (`apps/web`)

| Module | Responsibility |
| --- | --- |
| `core/types/interfaces/common/docs.ts` | the platform contract as the app reads it (kinds, visibility, page, version, path, queries, inputs) |
| `core/services/client/api/docs/docs.service.ts` | every route, both transports; list scope in `where`, detail scope at the top level |
| `core/lib/utils/docs-tree.ts` | tree building and sorting, flattening by expansion, ancestors / descendants, move guard, reorder, spaces, local filter, keyboard movement |
| `core/lib/utils/docs-recent.ts` | per-device, per-organization memory: recent pages, last visited, expanded nodes |
| `core/lib/utils/docs-markdown.ts` | editor JSON → Markdown, export file name, mentioned employees |
| `core/hooks/docs/*` | scope and mention candidates; availability probe; tree and trash; one page and its path; autosave with conflict handling; actions (create, update, move, reorder, duplicate, trash, restore, delete, restore version, attach / detach); versions; search; favourites; recent and expanded; project pages |
| `core/components/pages/docs/*` | the page shell (views, dialogs, actions), tree pane and tree, page view, editor surface, version panel, trash, dialogs (name, move, pick, icon), skeleton |
| `core/components/pages/projects/project-detail/project-docs-tab.tsx` | the project Docs tab |
| `app/[locale]/(main)/docs/**` | `/docs`, `/docs/[pageId]`, `/docs/trash` |

## 4. Rules

- **Autosave** two seconds after the last change, with the page's last known `updatedAt` as `expectedUpdatedAt`.
  A 409 shows Reload (drops the draft) or Keep my changes (re-reads the clock, saves with `forceSnapshot` so the
  other version is captured first). A 423 (locked) and an oversize draft are told; any other error keeps the draft
  for a retry. Unsaved text warns on unload and saves when the person leaves the page inside the app.
- **Content interop, lossless**: the page's editor JSON is the source of truth, and the app's editor opens that
  JSON when the page has it (the HTML cache only for a page that has no JSON yet). Before opening, the JSON is
  checked against the editor's schema: a page holding a node or mark type the app's editor does not know (written
  by another client) opens read-only, rendered from its HTML, with a notice that it is edited in the platform —
  the app never saves a reduced document over it. Every save writes the editor's JSON and the HTML rendered
  from it.
- **Trash** is the platform's archive (restore = unarchive); "delete for good" is the platform's delete with the
  `subtree` strategy, recoverable there by an administrator.
- **Spaces**: private pages (`visibility: PRIVATE`) form the person's private tree; the rest is the workspace.
- **Availability**: one count request per page load decides whether the platform serves documents; 404 / 405 /
  501 hide the feature.
- **Permissions**: the page shows what the platform answers; the project tab's actions follow `useProjectPermissions`.

## 5. Tests

`docs-tree` (build, cycles, flatten, ancestors, descendants, move guard, next index, reorder, spaces, titles,
sort, local filter, keyboard), `docs-recent` (recent, last visited, expanded, garbage), `docs-markdown` (blocks,
lists, marks, tables, unknown nodes, file names, mentions).

## 6. Live co-editing (`NEXT_PUBLIC_DOCS_LIVE_ENABLED`, default off)

On the platform's live sessions (ever-gauzy `DocsLivePlugin`, `GAUZY_DOCS_LIVE_ENABLED`):
`Subscription.documentLive(documentId, connectionId)` on the platform's GraphQL socket (`realtimeSocketUrl`, the credential
the real-time client presents, one socket per open page) streams the frames; edits go to
`POST /plugins/docs/documents/:id/live/updates`, carets and presence to `…/live/awareness`, both with proxy twins.

| Module | Responsibility |
| --- | --- |
| `core/lib/docs-live/protocol.ts` | frames, reasons, error codes, the subscription, base64 |
| `core/lib/docs-live/binding.ts` | one tab's session of one page: the document, the frames, batching, awareness, reconnects, the fallback |
| `core/lib/docs-live/schema-guard.ts` | the node and mark types an update or a document holds that the editor does not know |
| `core/lib/docs-live/transport.ts` | the socket (`GraphqlWsConnection`) and the two routes |
| `core/hooks/docs/use-docs-live.ts` | the page view's session (made on subscribe, destroyed on leave), the status probe, the page read again on fallback |
| `core/components/common/rich-editor/live-collaboration.ts` | `Collaboration` (field `default`) + the carets (`yCursorPlugin`); loaded by the Docs editor only |
| `core/components/pages/docs/docs-live-presence.tsx` | "Live" / "Reconnecting…" / "Not live" and the co-editors' avatars |

Rules that keep the shared document whole:

- The editor binds an **empty** `Y.Doc`; the `sync` frame fills it. Nothing is seeded from `contentJson` here.
- A document kept in the tab (the last eight pages, dropped on sign-out) whose `lineage` differs from the platform's is
  dropped before the state is applied.
- After every `sync`, `Y.encodeStateAsUpdate(doc, stateVector)` goes when it carries anything: edits made while the
  session was down, or sent and lost, merge that way. So any doubt about a sent edit (404 `DOCS_LIVE_SESSION_NOT_FOUND`,
  a network error) opens the session again instead of resending.
- Local edits go 75 ms after the first of a batch, merged (`Y.mergeUpdates`), one request at a time.
- `readOnly` (`sync`, `mode`, a 403 or 413) makes the editor non-editable with its reason; edits refused meanwhile go
  through a new session once it is writable again.
- The editor's binding deletes from the shared document whatever its schema cannot render: the document is checked
  before an editor is bound to it, and every update after, before it is applied. Unknown content ends live editing and
  the page shows its read-only view, as a stored page of unknown content does.
- `closed`, a 404 status route, a refused subscription (no access, the user's session limit, no such field), no first
  state within 10 s, or unknown content: live editing stops for the page view, the header says "Not live", the page is
  read again and the autosave (with its revision / 409 handling) takes over.
- UndoRedo is off while live (the shared document's history, one per person, replaces it).

## 7. Spaces and follows (`docs-collaboration`, `GAUZY_DOCS_COLLAB_ENABLED`)

The tree lists a section per team space (`GET /plugins/docs/documents/spaces`; `TEAM` pages grouped by
`organizationTeamId`, a team the spaces do not name still shown) and creates pages in it (`visibility: TEAM`); the page
menu moves a page to another space (`POST …/:id/space`, with its sub-pages) and follows or mutes it (`…/follow`,
`…/unfollow`, `…/mute`, `…/unmute`). A platform without Docs collaboration answers 404: the tree keeps the workspace
and the private pages, and the menu its Make private / Make workspace.

## 8. Phase 2

Text-anchored comments (generic comments on entity `Document` + anchors in the JSON), presence through the
real-time client, task chips (`useTaskDrawer`), command palette entries, `?block=` / `?thread=` deep links,
sub-page zip export, drag to reorder among siblings, phone editing polish. Live co-editing: section 6.
