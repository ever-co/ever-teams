# Feature Specification: Integration settings (Asana, Linear, Trello, GitHub)

> Behaviour-first spec per [Constitution Principle X](../../../../.specify/memory/constitution.md#x-specs-are-behaviour-first).
> Describe **what** the user observes, not how it is built. Save implementation
> details for `plan.md`. Mark any unresolved question with `[NEEDS CLARIFICATION: …]`.

**Feature ID**: `integrations-settings`
**Branch**: `feat/integrations-settings`
**Status**: `Draft`
**Created**: 2026-11-07
**Last updated**: 2026-11-07
**Owner**: app maintainers
**Runtime flag**: per integration (`NEXT_PUBLIC_INTEGRATION_ASANA_ENABLED`, `…_LINEAR_…`, `…_TRELLO_…`; GitHub exists)
**Platform API dependency**: platform spec `integrations-asana-linear-trello` and the existing integration tenant / setting / entity-setting API used by GitHub

---

## 1. Overview

Team managers connect third-party work tools to the workspace from one **Integrations**
settings page: a catalogue of available integrations with their state (not connected,
connected, needs attention), a per-integration page to connect (OAuth or token), pick
what to sync (which external projects/boards map to which of our projects, which fields),
run a one-time **import**, enable continuous **sync**, see the last sync result and
errors, and disconnect. The GitHub page keeps working as today and moves into the same
catalogue. Synced items show their source badge on tasks and can be opened in the source
tool.

## 2. User Scenarios

### 2.1 Primary scenarios

- **Given** a manager, **when** they open Settings → Integrations, **then** they see
  GitHub, Asana, Linear and Trello (those enabled by flags) with a state badge and a
  Configure action.
- **Given** the Asana page, **when** the manager clicks Connect, **then** they complete
  the provider's sign-in in a new window, return to the page, and see the connected
  account with its workspaces.
- **Given** a connected Linear workspace, **when** the manager maps "Backend" (Linear)
  to "API" (ours) and chooses "Import now", **then** a progress panel shows counts
  (issues, comments, labels, attachments), and on completion the tasks appear in the
  project with a Linear badge and a link back.
- **Given** a mapping with continuous sync on, **when** an issue changes in Trello,
  **then** the task updates within the documented interval and the sync panel shows the
  last run time and result.
- **Given** a sync error (expired token), **when** the manager opens the page, **then**
  the integration shows "needs attention" with the reason and a Reconnect action.
- **Given** a synced task, **when** any member opens it, **then** the drawer shows the
  source badge and "Open in Linear/Asana/Trello".
- **Given** a manager, **when** they disconnect an integration, **then** sync stops,
  imported tasks remain (with their badge and link), and the page returns to "not
  connected".

### 2.2 Edge cases & failures

- **Given** a non-manager, **when** they open the Integrations page, **then** they see
  the catalogue read-only with states, without connect or sync actions.
- **Given** the platform lacks a provider's plugin, **when** the page loads, **then** that
  provider is hidden even if its flag is on.
- **Given** an import that is interrupted, **when** the page is reopened, **then** the
  progress panel shows it as resumable and offers Resume.
- **Given** a mapping to a project the user cannot manage, **when** they try to save it,
  **then** the action is refused with a clear message.

## 3. Functional Requirements

- **FR-1** The app MUST provide `/settings/team/integrations` (catalogue) and
  `/settings/team/integrations/[key]` for `github`, `asana`, `linear`, `trello`, each
  gated by its runtime flag and by the platform's availability of the integration.
- **FR-2** Each provider page MUST support connect (OAuth popup or token form as the
  platform requires), show the connected account, list external workspaces/projects/
  boards, map them to our projects, choose sync options (direction, fields, labels,
  comments, attachments, assignee matching by email), run and monitor an import, toggle
  continuous sync, show the last sync result and errors, reconnect and disconnect.
- **FR-3** The GitHub page MUST keep its current behaviour and gain the catalogue entry.
- **FR-4** Tasks created by an integration MUST show a source badge and "Open in
  <provider>" in the drawer and the task page.
- **FR-5** The catalogue MUST also list platform-provided integrations when the platform
  link is enabled (existing behaviour) without duplicating entries.
- **FR-6** Every string MUST exist in every locale; `/settings/team/integrations` MUST
  be manager-only in the settings navigation.

## 4. Non-Functional Requirements

- **Performance**: pages lazily loaded; import progress polled every few seconds while
  visible, or pushed over the real-time client when connected.
- **Reliability**: resumable imports; optimistic toggles with rollback.
- **Security & privacy**: tokens never touch the browser beyond the OAuth code exchange
  handled by the platform; secrets never displayed.
- **Accessibility**: progress is announced; forms labelled.
- **Compatibility**: web only.

## 5. Key Entities & Domain Concepts

| Entity / concept | Description |
| ---------------- | ----------- |
| `IntegrationCatalogueEntry` | A provider with its state and page |
| `ProjectMapping` | An external project/board mapped to one of our projects with sync options |
| `ImportRun`      | A one-time import with progress, counts and errors |
| `SyncStatus`     | Last run time, result and errors of continuous sync |

## 6. Out of Scope

- Building new providers beyond the four.
- Outgoing webhooks configuration.

## 7. Acceptance Criteria

- [ ] Catalogue shows the four providers with states; non-managers see it read-only.
- [ ] Connect, map, import, sync toggle, error display, reconnect and disconnect work
      for each enabled provider.
- [ ] Source badges and open-in links appear on synced tasks.
- [ ] Every new string present in every locale file; behind per-provider flags.
- [ ] All functional requirements have a passing test.

## 8. Open Questions

- `[NEEDS CLARIFICATION: whether imports are run from this page only or also from the project page's "Import tasks" menu (proposed: both, same panel)]`

## 9. Constitution Gates

- [x] I Platform API is the backend — all tokens and sync run on the platform.
- [x] II Layered web app.
- [x] III Every string translated.
- [x] IV Runtime config; default-off flags; nothing removed — GitHub page kept.
- [x] V One design system — settings kit.
- [x] VI Security and privacy.
- [ ] VII Real-time — progress hints only.
- [x] VIII Multi-client parity stated — web only.
- [x] IX Tests and gates.
- [x] X Behaviour-first (this document).
- [x] XI Documentation describes our product only.

## 10. References

- Platform spec: `integrations-asana-linear-trello` (Ever Gauzy repository)
