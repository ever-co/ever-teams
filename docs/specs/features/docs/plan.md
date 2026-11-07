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
- **Content interop**: the editor opens the HTML cache and writes both the HTML and its JSON; the platform's other
  clients read the JSON (nodes the app does not know are kept out of the app's editor by the HTML parser, never
  thrown away by a crash).
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

## 6. Phase 2

Text-anchored comments (generic comments on entity `Document` + anchors in the JSON), presence through the
real-time client, task chips (`useTaskDrawer`), command palette entries, `?block=` / `?thread=` deep links,
sub-page zip export, drag to reorder among siblings, phone editing polish, live co-editing when the platform's
collaboration transport ships.
