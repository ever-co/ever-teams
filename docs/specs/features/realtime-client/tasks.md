# Tasks: Real-time client

**Feature**: `realtime-client` · **Plan**: [`plan.md`](./plan.md) · **Branch**: `feat/realtime-client`

- [x] T1 Event model and selection (`core/lib/realtime/events.ts`) + spec
- [x] T2 Runtime flag and socket URL derivation (`config.ts`) + spec
- [x] T3 `graphql-transport-ws` client over the browser socket (`graphql-ws.ts`) + scripted-socket spec
- [x] T4 `RealtimeClient`: credential, subscribe, cursor, catch-up pages, de-duplication, backoff, online/visible, refused credential + spec
- [x] T5 In-tab bus and `useRealtimeEvent` / `useRealtimeResync`
- [x] T6 Hint → query-key mapping + folding scheduler with editing hold + specs
- [x] T7 `realtimeService` (`status`, `catchUp`, `presence`, `typing`) and proxy routes `app/api/realtime/*`
- [x] T8 `useRealtimeClient` (wiring, invalidation, resync) and `RealtimeMount` in the main layout
- [x] T9 Reconnecting note (`realtime-status.tsx`), `realtime.RECONNECTING` in the 13 locales
- [x] T10 Pause the unread-count poll while connected
- [x] T11 Presence signals hook (`useRealtimePresence`)
- [x] T12 `.env.sample` entries, `realtimeStatusAtom`
- [ ] T13 Gate: `yarn test:web`, typecheck, cspell (in-cluster gate or CI) — fix forward
- [ ] T14 Manual check against a platform with `GAUZY_REALTIME_ENABLED=true`: a task update reaches a second browser within 1 s; sleep/wake replays; flag off shows nothing
- [ ] T15 Team presence view subscribes to `presence.changed` (replace its interval while connected)
- [ ] T16 One-tab claim for sounds / system notifications (with the inbox feature)
