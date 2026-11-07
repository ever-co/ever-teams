# ADR 001 — Live updates come from one platform push connection

**Status**: Accepted
**Date**: 2026-11-07
**Deciders**: app maintainers

## Context

The web app refreshes everything by polling (shell interval for teams and tasks, 30 s for
member timer status, 60 s for the unread notification count and invitations). The store
exposes a `dataSyncModeState` of `'REAL_TIME' | 'PULL'` whose real-time branch was never
implemented. Chat, a live inbox and collaborative docs need sub-second delivery and
presence, and adding more polling multiplies load on the platform API.

The platform is adding a push channel (its `realtime-channel` spec): an authenticated
WebSocket per user and organization that delivers numbered, replayable events (chat,
notifications, presence, typing) and coarse "something changed" signals.

## Decision

1. The app opens **one** platform push connection per browser tab (one shared client in
   `core/lib/realtime/`), authenticated with the same token the API calls use, and
   reconnects with a cursor so missed events replay.
2. Features **subscribe** to that client: chat and inbox hooks patch or invalidate their
   TanStack Query caches on events; presence and typing live in a small external store.
   No feature opens its own socket or adds a polling interval for data the channel carries.
3. **Polling stays as the fallback.** When the runtime flag is off, the connection is
   refused, or the platform predates the channel, every feature keeps its documented
   polling cadence. The client flips `dataSyncModeState` to `'REAL_TIME'` only while
   connected, and back to `'PULL'` on loss.
4. Events never carry authority: resource data still comes from HTTP. An event tells the
   app what to refetch or how to patch a cache; a conflict is resolved by refetching.

## Consequences

- Chat and inbox ship with instant updates where the channel exists and still work on
  older platform versions.
- The existing presence heartbeat and timer polling keep working untouched; they can be
  driven by the channel later without changing their consumers.
- Mobile and desktop reuse the same client once it moves to a shared package.
- The before-merge gate's polling budget is unchanged: the channel reduces requests, it
  never adds any.
