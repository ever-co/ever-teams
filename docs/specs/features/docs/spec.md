# Feature Specification: Docs

> Behaviour-first spec per [Constitution Principle X](../../../../.specify/memory/constitution.md#x-specs-are-behaviour-first).
> Describe **what** the user observes, not how it is built. Save implementation
> details for `plan.md`. Mark any unresolved question with `[NEEDS CLARIFICATION: …]`.

**Feature ID**: `docs`
**Branch**: `feat/docs`
**Status**: `Draft`
**Created**: 2026-11-07
**Last updated**: 2026-11-07
**Owner**: app maintainers
**Runtime flag**: `NEXT_PUBLIC_DOCS_ENABLED` (default off)
**Platform API dependency**: the existing Docs API (documents, tree, versions, shares, links, files) and the platform spec `docs-collaboration` (spaces, live co-editing, notifications, export) + `realtime-channel` for presence

---

## 1. Overview

Teams write things down next to their work. **Docs** adds a page tree per workspace
(team spaces and a private space per person, favourites, recent), a page editor built on
the app's existing rich editor (headings, lists, checklists, tables, code, callouts,
images, files, mentions, task links), page comments anchored to text, version history
with restore, duplicate, move, trash and restore, Markdown export, and a search that
covers page titles and text. Pages can be attached to a project and show up in the
project's Docs tab. Presence avatars show who has a page open; live co-editing arrives in
a later release (single-writer autosave with conflict detection ships first).

## 2. User Scenarios

### 2.1 Primary scenarios

- **Given** the flag is on, **when** a user opens Docs from the sidebar, **then** they see
  Favourites, their team spaces with page trees, Private, Recent and Trash, and the last
  page they visited opens.
- **Given** a page, **when** the user types, **then** the content saves automatically
  within two seconds of the last change and the header shows "Saved" / "Saving…";
  leaving with unsaved changes warns.
- **Given** the editor, **when** the user types `/`, **then** a menu offers headings,
  lists, checklist, quote, code block, divider, table, callout, image, file, sub-page and
  task link; typing `@` offers members to mention.
- **Given** a user selects text and chooses Comment, **when** they post, **then** a
  thread anchors to that text, appears in the Comments panel (Open / Resolved) and
  mentioned members get an Inbox entry opening the thread.
- **Given** a page edited by two people, **when** the second saves on an older version,
  **then** they see a conflict notice with "Reload" and "Keep my changes as a new
  version"; nothing is silently lost.
- **Given** a page with history, **when** the user opens Version history, **then** they
  see versions grouped by day, can preview and restore one (the current state is kept as
  a version).
- **Given** a project, **when** a member opens its Docs tab, **then** they see pages
  attached to that project and can create one there.
- **Given** a task link pasted in a page, **when** rendered, **then** it shows the task's
  number, title and status as a chip that opens the task drawer.
- **Given** the command palette, **when** the user types a word, **then** matching pages
  appear with their space and a snippet, next to tasks.
- **Given** a page, **when** the user chooses Export → Markdown, **then** a Markdown file
  (with sub-pages as a zip when chosen) downloads.

### 2.2 Edge cases & failures

- **Given** a private page, **when** another member has its link, **then** they see
  "not found".
- **Given** a page in the trash, **when** opened from an old link, **then** the user sees
  it is in the trash with a Restore action (if allowed).
- **Given** the platform lacks the pages API, **when** Docs is enabled, **then** the
  sidebar entry is hidden and `/docs` shows "not available on this server".
- **Given** a very long page, **when** editing, **then** typing stays responsive (the
  editor virtualises or chunks rendering) and saves stay under the size limit with a
  clear message when exceeded.
- **Given** a phone, **when** editing, **then** a formatting bar sits above the keyboard
  and the tree is a drawer.

## 3. Functional Requirements

- **FR-1** The app MUST provide `/docs` (tree + last page), `/docs/[pageId]` (with
  `?block=` to scroll to a block and `?thread=` to open a comment thread), `/docs/trash`,
  and a project Docs tab at `/projects/[id]/docs`.
- **FR-2** The tree MUST support create (page, sub-page), rename, icon, drag to reorder
  and nest, move between spaces, duplicate (with or without sub-pages), favourite,
  trash, restore and permanent delete (where allowed), and MUST reveal the active page.
- **FR-3** The editor MUST reuse the app's rich editor with these additions: tables,
  callouts, file blocks, sub-page links, task links as chips, text-anchored comments and
  a "Turn into" block menu; images and files upload through existing paths.
- **FR-4** Autosave MUST debounce two seconds, send the page version, and handle
  conflicts with reload / keep-as-new-version; the header MUST show save state.
- **FR-5** Comments MUST reuse the app's comment components with a text anchor, Open /
  Resolved tabs, resolve/reopen, author edit/delete, mentions and Inbox entries.
- **FR-6** Version history MUST list, preview and restore versions.
- **FR-7** Presence avatars MUST show members with the page open when the real-time
  client is connected.
- **FR-8** Search MUST cover titles and text through the platform and appear in the
  command palette and the Docs header.
- **FR-9** Export MUST offer Markdown (single page, with sub-pages as zip) and print to
  PDF through the browser.
- **FR-10** `/docs` MUST be a protected path; every string MUST exist in every locale.
- **FR-11** The feature MUST detect a platform without the pages API once per session and
  hide itself.

## 4. Non-Functional Requirements

- **Performance**: page opens under 1 s warm; editor lazily loaded; within the
  page-weight budget.
- **Reliability**: no silent data loss on conflicts or disconnects; local draft kept
  until saved.
- **Security & privacy**: HTML sanitised on render; private pages never listed to
  others; file access through signed URLs.
- **Accessibility**: editor keyboard operable; tree navigable with arrows; comments
  panel focus-managed.
- **Compatibility**: web first; mobile gets read + basic edit (existing mobile editor)
  in a following release.

## 5. Key Entities & Domain Concepts

| Entity / concept | Description |
| ---------------- | ----------- |
| `Page`           | A document with title, icon, content, version, space, parent and optional project |
| `Space`          | A team space or a person's private space holding a page tree |
| `PageComment`    | A thread anchored to a text range on a page |
| `PageVersion`    | A snapshot of a page's title and content at a time |

## 6. Out of Scope

- Live multi-cursor co-editing (next release, when the platform's collaboration
  transport ships).
- Public sharing links, per-page permissions beyond space visibility.
- Databases/properties inside pages, templates (may follow).

## 7. Acceptance Criteria

- [ ] Tree operations, autosave, conflict handling, comments, versions, export and
      search work end to end against the platform.
- [ ] Project Docs tab lists and creates project pages.
- [ ] Private pages are invisible to others; trash and restore work.
- [ ] Platform without the API: feature hidden, no errors.
- [ ] Every new string present in every locale file; behind `NEXT_PUBLIC_DOCS_ENABLED`.
- [ ] All functional requirements have a passing test.

## 8. Open Questions

- Resolved 2026-11-07: pages are the platform's existing documents (kind "page") whose content is editor JSON plus rendered HTML; the app's Tiptap editor reads and writes that JSON directly, and live co-editing arrives with the platform's docs-collaboration feature.

## 9. Constitution Gates

- [x] I Platform API is the backend.
- [x] II Layered web app.
- [x] III Every string translated.
- [x] IV Runtime config; default-off flag; nothing removed.
- [x] V One design system.
- [x] VI Security and privacy.
- [x] VII Real-time through the platform channel (presence).
- [x] VIII Multi-client parity stated.
- [x] IX Tests and gates.
- [x] X Behaviour-first (this document).
- [x] XI Documentation describes our product only.

## 10. References

- Platform spec: `docs-pages` (Ever Gauzy repository, `docs/specs/features/docs-pages/`)
- Related: [`../inbox/spec.md`](../inbox/spec.md), [`../realtime-client/spec.md`](../realtime-client/spec.md)
