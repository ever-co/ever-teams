# Implementation Plan: Real-time client

**Feature**: `realtime-client` · **Spec**: [`spec.md`](./spec.md) · **Branch**: `feat/realtime-client` · **Status**: In progress (2026-11-07)

## 1. Summary

One live connection per tab to the platform's real-time channel (`realtime-channel`): the web app opens a
`graphql-transport-ws` socket to the platform's GraphQL endpoint with the session's credential, subscribes to
`collaborationEvents`, turns every content-free change hint into a folded TanStack Query refetch, replays what a
drop missed through `GET /realtime/events` (an exact `(after, afterId)` cursor, `hasMore`, `resync`), and
sends presence and typing signals. Off unless `NEXT_PUBLIC_REALTIME_ENABLED=true` (runtime env): the app then
behaves exactly as today.

## 2. Reuse (what exists and is used as is)

| Need | Existing piece | How it is used |
| --- | --- | --- |
| Credential and scope | `getAccessTokenCookie`, `useReactiveAccessTokenCookie`, `useUserQuery` | `connection_init` payload: `authorization: Bearer …`, `tenant-id`, `organization-id` — the names the HTTP calls present |
| Dual transport | `APIService` (`core/services/client/api.service.ts`), `forwardToGauzy` | `realtimeService` (`/realtime/*`) + `app/api/realtime/{events,status,presence,typing}/route.ts` proxies |
| Runtime flags | `readRuntimeEnv` (`env-config.ts`) | `NEXT_PUBLIC_REALTIME_ENABLED`, `NEXT_PUBLIC_REALTIME_URL` read at runtime, build-time fallback |
| Query keys | `core/query/keys` | hints map onto `tasks`, `taskComments`, `notifications`, `organizationTeams` keys |
| Global state | Jotai (`core/stores/common`) | `realtimeStatusAtom` |
| Shell mount | `app/[locale]/(main)/layout.tsx` | `<RealtimeMount />` next to `<AppState />` |
| Presence persistence | `useEmployeePresenceHeartbeat` (minute heartbeat) | kept; the channel adds instant `presence.changed` signals |
| i18n | next-intl, 13 locale files | `realtime.RECONNECTING` |

No new dependency: the `graphql-transport-ws` protocol is a few message types over the browser's own
`WebSocket` (`core/lib/realtime/graphql-ws.ts`, ~200 lines), which also keeps the core free of web-only
packages for the mobile and desktop apps (they pass their own socket factory).

## 3. Design

```mermaid
flowchart LR
    L[(main) layout] --> M[RealtimeMount]
    M --> C[useRealtimeClient]
    M --> P[useRealtimePresence]
    M --> S[RealtimeStatus note]
    C --> RC[RealtimeClient<br/>core/lib/realtime/client.ts]
    RC --> WS[GraphqlWsConnection<br/>graphql-ws.ts]
    WS -. wss://api/graphql .-> G[(platform)]
    RC -. GET /realtime/events .-> RS[realtimeService] -. proxy or direct .-> G
    RC --> B[realtimeBus]
    B --> F[features: useRealtimeEvent]
    RC --> I[InvalidationScheduler]
    I --> Q[(TanStack Query)]
    P -. POST /realtime/presence .-> RS
```

### 3.1 Modules (`apps/web`)

| Module | Responsibility |
| --- | --- |
| `core/lib/realtime/events.ts` | event names, families (`task.*` …), envelope / hint / catch-up types, `matchesEventName` |
| `core/lib/realtime/config.ts` | flag, socket URL derivation (`NEXT_PUBLIC_REALTIME_URL` or `NEXT_PUBLIC_GAUZY_API_SERVER_URL` → `wss://host/graphql`), constants |
| `core/lib/realtime/graphql-ws.ts` | the protocol client: init/ack, subscribe/next/error/complete, ping/pong, dead-socket detection, fatal close codes |
| `core/lib/realtime/client.ts` | `RealtimeClient`: status machine (`off → connecting → connected ↔ reconnecting`, `stopped` on a refused credential), cursor, catch-up loop, de-duplication by `eventId`, jittered exponential backoff (1 s → 30 s), reconnect on `online` / visible |
| `core/lib/realtime/bus.ts` | in-tab fan-out for features (`useRealtimeEvent`) |
| `core/lib/realtime/invalidation.ts` | hint → query keys (pure), `resyncInvalidations` |
| `core/lib/realtime/invalidation-scheduler.ts` | folds refetches per window; holds editing-area refetches while a text field is focused (≤ 15 s), flushes on `focusout` |
| `core/lib/realtime/tab-claim.ts` | one tab acts on an event every tab receives (FR-8): a claim per key in `localStorage` with a 10-minute expiry, read and written under one Web Lock (`navigator.locks`), or written and read back after 60 ms where there are no Web Locks; a hidden tab yields 400 ms to a visible one |
| `core/services/client/api/realtime/realtime.service.ts` | `status`, `catchUp`, `presence`, `typing` |
| `app/api/realtime/*/route.ts` | proxy-mode routes (`forwardToGauzy`) |
| `core/hooks/realtime/*` | `useRealtimeClient`, `useRealtimeEvent` / `useRealtimeResync`, `useRealtimePresence` |
| `core/components/common/realtime-status.tsx` | the discreet "Reconnecting…" note (`role=status`, `aria-live=polite`, shown only while reconnecting) |
| `core/stores/common/realtime.ts` | `realtimeStatusAtom` |

### 3.2 Rules

- **Events are never data** (FR-9): a hint only names what to refetch; the read APIs decide what the caller sees.
- **Cursor**: `{ at: occurredAt ms, id: eventId }` of the newest event applied, kept in memory only (no
  payload in local storage). The first acknowledgement takes the platform's own `now` (`GET /realtime/events`
  without a cursor) so clock skew cannot hide events.
- **Replay**: subscribe first, then catch up from the cursor until `hasMore` is false; duplicates are dropped
  by `eventId` (last 2000 remembered). `resync: true` or a failed listing → every feature refetches.
- **Polling pause** (FR-5): `useUnreadNotificationCount` turns its interval off while the atom says
  `connected`; others follow as they adopt the channel (team presence stays on its cadence this release).
- **Presence** (FR-7): `active` on connect and on input after a pause, `idle` after 10 min without input,
  `away` while hidden/unfocused, `offline` on `pagehide`; transitions only; a platform without the route (404)
  stops the signals. Typing is a service call for the chat composer (`chat` feature).
- **Credential changes**: the effect re-runs on a new token / tenant / user (reconnect); a sign-out closes.
- **Refused credential** (`4401`/`4403`): the client stops and shows nothing; a new token restarts it.

## 4. Flags and configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_REALTIME_ENABLED` | off | turns the channel on (runtime) |
| `NEXT_PUBLIC_REALTIME_URL` | — | explicit socket URL (proxy-mode deployments); else derived from the API URL |

## 5. Tests

Jest (node): `events`, `config` (URL derivation), `graphql-ws` (scripted socket: init/ack, subscribe,
ping/pong, dead socket, close codes), `client` (first position, de-duplication, backoff, replay pages, resync,
refused credential, online event), `invalidation-scheduler` (folding, hold while editing, max hold, flush),
`invalidation` (hint → keys).

## 6. Risks

| Risk | Mitigation |
| --- | --- |
| Proxy-mode deployment without a socket URL | nothing opens; polling continues; documented in `.env.sample` |
| Many hints at once (bulk task edit) | folded per query per 400 ms window; the platform coalesces per aggregate per second |
| A held refetch during a long edit | released after 15 s at the latest |
| Browser throttling of background tabs | pings every 25 s, dead socket after two silent intervals, reconnect on visible |

## 7. Later

- Promote `core/lib/realtime` to a shared package when the mobile app adopts it (open question in the spec).
- Team presence polling subscribes to `presence.changed` instead of its interval.
- ~~Sounds / system notifications claimed by one tab (FR-8) ship with the inbox feature.~~ Done (T16):
  `claimForThisTab` (`tab-claim.ts`) and the inbox's `useInboxAlerts` (mounted with the connection): a fresh
  `inbox_item.created` for this user plays a short chime in the one tab that claims `inbox-<itemId>`, when the
  person switched the sound on for this browser (notification settings, off by default). The claims live in
  `localStorage`, not on a `BroadcastChannel`, so a tab that replays the event after sleep still finds them;
  replays older than two minutes stay silent. System notifications come from the push worker, one per entry and
  device (tag `inbox-<itemId>`), so no tab shows its own; a hidden tab stays silent where the browser is subscribed.
