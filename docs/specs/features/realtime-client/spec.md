# Feature Specification: Real-time client

> Behaviour-first spec per [Constitution Principle X](../../../../.specify/memory/constitution.md#x-specs-are-behaviour-first).
> Describe **what** the user observes, not how it is built. Save implementation
> details for `plan.md`. Mark any unresolved question with `[NEEDS CLARIFICATION: …]`.

**Feature ID**: `realtime-client`
**Branch**: `feat/realtime-client`
**Status**: `Draft`
**Created**: 2026-11-07
**Last updated**: 2026-11-07
**Owner**: app maintainers
**Runtime flag**: `NEXT_PUBLIC_REALTIME_ENABLED` (default off)
**Platform API dependency**: platform spec `realtime-channel`

---

## 1. Overview

The web app keeps one live connection to the platform while a signed-in user has it open.
Through it, chat messages, inbox entries, unread badges, presence and "something changed"
hints arrive within a second, so lists update without a reload and without more polling.
When the connection is unavailable (flag off, older platform, network), the app behaves
exactly as today: every feature keeps its polling cadence and shows no error. Mobile and
desktop reuse the same client later; the web app ships first.

## 2. User Scenarios

### 2.1 Primary scenarios

- **Given** a signed-in user with the app open, **when** a colleague mentions them in a
  comment, **then** the bell badge increments within a second and the inbox panel, if
  open, shows the new entry at the top.
- **Given** a user with the chat page open, **when** a message arrives in the current
  conversation, **then** it appears at the bottom immediately; when it arrives in another
  conversation, **then** that conversation's unread badge updates in the sidebar.
- **Given** a user viewing the team page, **when** a member starts a timer or goes idle,
  **then** the member's status dot changes within a few seconds.
- **Given** a user whose laptop sleeps for five minutes, **when** it wakes, **then** the
  app reconnects, replays what it missed, and the lists are correct without a reload; a
  small "reconnecting" indicator shows only while the connection is down.
- **Given** a user typing in a comment box, **when** a change hint for the same task
  arrives, **then** the comment box keeps its draft and focus; the rest of the task
  refreshes.

### 2.2 Edge cases & failures

- **Given** the flag is off or the platform refuses the connection, **when** the app
  starts, **then** no indicator and no console errors are shown and polling continues.
- **Given** the user is signed out or switches workspace, **when** that happens, **then**
  the connection closes and a new one opens for the new session.
- **Given** the connection drops for longer than the platform's replay window, **when**
  it reconnects, **then** the app refetches the affected lists once and continues.
- **Given** two tabs of the same user, **when** both are open, **then** each has its own
  connection and both stay in sync; sounds and system notifications are shown by one tab
  only.
- **Given** a flaky network, **when** reconnects keep failing, **then** the app backs off
  (up to 30 s between attempts) and retries immediately when the browser reports being
  online or the tab becomes visible.

## 3. Functional Requirements

- **FR-1** The app MUST open at most one live connection per tab per signed-in session,
  authenticated with the session's token, and MUST close it on sign-out or workspace switch.
- **FR-2** The app MUST reconnect with its last event cursor, replay missed events in
  order, and refetch affected lists when told to resynchronise.
- **FR-3** Chat, inbox and presence features MUST subscribe to the shared client and MUST
  NOT open their own connections or add polling intervals for data the channel carries.
- **FR-4** On a change hint, the app MUST refetch only the affected queries, MUST defer
  refetches while a text field in the affected area is focused, and MUST keep drafts.
- **FR-5** While connected, the app MUST pause the polling intervals that the channel
  makes redundant (unread count, member status) and MUST restore them on disconnect.
- **FR-6** The app MUST show a discreet "reconnecting" state after a drop and nothing
  while connected or when the feature is off.
- **FR-7** The app MUST send presence signals (active, idle after ten minutes without
  input, away when the window loses focus) and typing signals from the chat composer.
- **FR-8** Only one tab per user MUST play notification sounds or show system
  notifications for the same event.
- **FR-9** Events MUST never be treated as authoritative data; on any doubt the app
  refetches through HTTP.
- **FR-10** The client MUST be usable from the mobile and desktop apps through a shared
  package without web-only dependencies in its core.

## 4. Non-Functional Requirements

- **Performance**: no measurable impact on page weight (client under 10 KB gzipped,
  loaded lazily after first paint); no more than one HTTP refetch per hint per query.
- **Reliability**: reconnect with jittered exponential backoff (1 s → 30 s); replay
  applied idempotently.
- **Security & privacy**: token sent through the same mechanism as API calls; no event
  payload stored in local storage.
- **Accessibility**: the reconnecting indicator is announced once, not repeatedly.
- **Compatibility**: works with the proxy and direct API transports; older platforms
  without the channel degrade to polling.

## 5. Key Entities & Domain Concepts

| Entity / concept | Description |
| ---------------- | ----------- |
| `RealtimeClient` | The single live connection of a tab with its cursor and state |
| `Subscription`   | A feature's interest in a topic (chat, inbox, presence, change hints) |
| `ChangeHint`     | A content-free event naming an entity and action to refetch |
| `PresenceSignal` | The tab's activity state sent to the platform |

## 6. Out of Scope

- Collaborative document editing transport.
- Web push registration (inbox feature).
- Replacing the timer status polling in this release (it keeps working; it may subscribe later).

## 7. Acceptance Criteria

- [ ] A mention and a chat message reach a second browser within 1 s; badges and lists
      update without reload.
- [ ] Sleep/wake replays missed events; a long outage triggers one refetch and continues.
- [ ] Flag off or platform without the channel: no indicator, no errors, polling unchanged.
- [ ] Focused drafts survive change hints.
- [ ] Every new string present in every locale file.
- [ ] All functional requirements have a passing test.

## 8. Open Questions

- `[NEEDS CLARIFICATION: whether the client ships in apps/web first or directly in a shared package under packages/ (proposed: apps/web/core/lib/realtime first, promoted when mobile adopts it)]`

## 9. Constitution Gates

- [x] I Platform API is the backend — events come from the platform channel.
- [x] II Layered web app — client in `core/lib/realtime`, hooks in `core/hooks/realtime`.
- [x] III Every string translated — reconnecting indicator strings.
- [x] IV Runtime config; default-off flag; nothing removed — polling stays.
- [x] V One design system — indicator uses common components.
- [x] VI Security and privacy — same token mechanism; no payload persistence.
- [x] VII Real-time through the platform channel — this feature *is* the shared client.
- [x] VIII Multi-client parity stated — web first, shared package next.
- [x] IX Tests and gates.
- [x] X Behaviour-first (this document).
- [x] XI Documentation describes our product only.

## 10. References

- Platform spec: `realtime-channel` (Ever Gauzy repository, `docs/specs/features/realtime-channel/`)
- ADR: [`../../decisions/001-platform-channel-for-realtime.md`](../../decisions/001-platform-channel-for-realtime.md)
- Consumers: [`../chat/spec.md`](../chat/spec.md), [`../inbox/spec.md`](../inbox/spec.md)
