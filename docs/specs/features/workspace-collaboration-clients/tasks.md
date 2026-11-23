# Task Breakdown: Workspace collaboration clients

> Ordered, granular tasks derived from `plan.md`. Each task is small enough to land in
> one PR and ships with tests per Constitution Principle IX.

**Feature ID**: `workspace-collaboration-clients`
**Plan**: `./plan.md`
**Status**: `Draft`
**Last updated**: 2026-11-23

---

## How to use

- Tasks are sequential by default; `(parallel)` tasks can run alongside their predecessor.
- Each task names its files so an implementer can pick it up cold.
- Tick the checkbox as the PR lands; add new tasks at the bottom, never renumber.
- Everything stays behind the runtime flag and the tenant's feature code `FEATURE_TEAMS_COLLABORATION_CLIENTS`: the feature is off by default; after the trial period the code may be switched on by default for new tenants only (its default in the platform's feature catalogue); existing tenants keep their stored toggle until an administrator changes it.
- Depends on `people-self-service` T1 (Gauzy web app address), T3 (area availability), T4, T5, T19 (offline queue,
  conflict review, offline wrapper), T20 (app worker), T37 (worker choice) and T23 (push).
- Paths that start with `core/`, `app/`, `public/` or `locales/` are in `apps/web/`; every component and hook has its
  `*.test.tsx` (or `*.test.ts`) beside it, and every new proxy route its `route.test.ts`.

## Phase 1 — Types, services, hooks

- [ ] **T1**. Runtime flag `NEXT_PUBLIC_COLLABORATION_CLIENTS_ENABLED` in `apps/web/.env.sample`, helper
      `core/lib/utils/collaboration-clients-enabled.ts` combining it with the tenant's toggle of
      `FEATURE_TEAMS_COLLABORATION_CLIENTS` (read once per session from `GET /user/me` with the relations
      `tenant.featureOrganizations.feature`) and with each page flag; mobile and desktop keys. Files:
      `apps/web/.env.sample`, `core/lib/utils/collaboration-clients-enabled.ts`, `apps/mobile/.env.template`,
      `apps/server-web/src/main/helpers/constant.ts`. Test: `core/lib/utils/collaboration-clients-enabled.test.ts` (off by
      default; off for a tenant whose code is off while the flag is on; area needs both flags; nothing registered with
      the flag off).
- [ ] **T2**. Interfaces and Zod schemas `core/types/{interfaces,schemas}/{chat,meetings,calendar,mail,docs,summary,
      composer,share,offline}/`, promoted to `packages/types/src/collaboration/`. Files: `core/types/interfaces/chat/`,
      `core/types/schemas/chat/` and the other folders named, `packages/types/src/collaboration/index.ts`. Test:
      `core/types/schemas/collaboration-schemas.test.ts` (against platform samples; storage schema version).
- [ ] **T3**. Areas of this feature registered with the shared `core/hooks/common/use-area-availability.ts`;
      `useClientState` (offline, unreachable, maintenance, signed out, outdated) and the shared banner. Files:
      `core/hooks/common/use-area-availability.ts` (area registrations), `core/hooks/collaboration/use-client-state.ts`,
      `core/components/common/client-state-banner.tsx`. Test: `core/hooks/collaboration/use-client-state.test.tsx` (each
      state disables writes with its reason); `core/hooks/docs/use-docs-availability.ts` and
      `core/hooks/inbox/use-inbox-availability.ts` probes unchanged.
- [ ] **T4**. Rights: `useRights` over `/chat/conversations/:id/rights` and the Docs access answers. Files:
      `core/hooks/collaboration/use-rights.ts`, `core/services/client/api/chat/chat.service.ts`. Test:
      `core/hooks/collaboration/use-rights.test.tsx` (generated table of rule matrix rows shows and hides the same
      actions as the platform).
- [ ] **T5**. Chat cache `core/lib/chat-cache/` over `/chat/sync?cursor=&window=`, kept current by the cursor catch-up of
      `core/lib/realtime/client.ts`, stored through the offline queue's storage adapters; offline sends as kind
      `chat.send` of the offline queue of `people-self-service`. Files: `core/lib/chat-cache/chat-cache.ts`,
      `core/lib/chat-cache/chat-sync.ts`, `core/hooks/chat/use-chat-sync.ts`, `core/lib/realtime/client.ts`. Test:
      `core/lib/chat-cache/chat-sync.test.ts` (deletions applied; old cursor resyncs; offline send once; "sent while
      offline" over 5 minutes; refusals in the shared conflict review).
- [ ] **T6** (parallel). Local index in a worker `core/lib/chat-index/` (and the mobile adapter). Files:
      `core/lib/chat-index/chat-index.ts`, `core/lib/chat-index/chat-index.worker.ts`,
      `apps/mobile/app/services/chat-index/chat-index.ts`. Test: `core/lib/chat-index/chat-index.test.ts` (finds cached
      messages offline; respects membership loss on next sync).
- [ ] **T7** (parallel). Chat service and proxies extension (`core/services/client/api/chat/chat.service.ts`,
      `app/api/chat/**`): sections, people, Saved, Scheduled, drafts, polls, search, activity, status, cards,
      agents, actions, integrations, share, calls, data-loss check; the existing `use-chat-files.ts`, `use-chat-draft.ts`
      (server drafts per place), `use-chat-link-previews.ts` and `use-chat-webhooks.ts` extended (in `core/hooks/chat/`).
      Test: `core/services/client/api/chat/chat.service.interact.test.ts` extended per route group; existing hook tests
      unchanged.
- [ ] **T8** (parallel). Meetings service `core/services/client/api/meetings/rooms.service.ts` and proxies
      `app/api/meetings/**`; the existing token routes used only when `/meetings/status` is absent. Files:
      `core/services/client/api/meetings/rooms.service.ts`, `app/api/meetings/**/route.ts`, `app/api/livekit/route.ts`,
      `app/api/auth/meet/jwt/route.ts`. Test: `core/services/client/api/meetings/rooms.service.test.ts` (switch by status;
      same room name both ways); `app/api/livekit/route.test.ts` unchanged.
- [ ] **T9** (parallel). Calendar and mail services and proxies (`app/api/{calendar,mail}/**`); the drive and wiki
      routes added to the existing `docs/docs.service.ts` and `app/api/plugins/docs/**` (no second docs proxy); the inbox
      services gain the Mail and Summary reads. Files: `core/services/client/api/calendar/calendar-events.service.ts`,
      `core/services/client/api/mail/mail.service.ts`, `app/api/calendar/**/route.ts`, `app/api/mail/**/route.ts`,
      `core/services/client/api/docs/docs.service.ts`, `app/api/plugins/docs/**`,
      `core/services/client/api/inbox/inbox.service.ts`. Test: `core/services/client/api/mail/mail.service.test.ts`,
      `core/services/client/api/calendar/calendar-events.service.test.ts`, `core/services/client/api/docs/docs.service.test.ts`
      extended (multipart uploads streamed in parts).
- [ ] **T10**. One composer state machine `packages/utils/src/composer/` and `useComposer(target)` with target adapters
      (`chatMessage`, `threadReply`, `taskComment`, `pageComment`, `mailReply`). Files:
      `packages/utils/src/composer/composer-machine.ts`, `packages/utils/src/composer/targets.ts`,
      `packages/utils/src/index.ts`, `core/hooks/collaboration/use-composer.ts`. Test:
      `packages/utils/src/composer/composer-machine.test.ts` (unaccepted parts become links with a notice; drafts per
      place on the server).
- [ ] **T42**. Media and appearance: media streamed by byte ranges, resumable downloads, a file cache within the
      person's budget (shared with the offline items of T33), and the person's chat appearance and shortcut choices
      followed on every device. Files: `core/lib/media-cache/media-cache.ts`, `core/hooks/chat/use-media-cache.ts`,
      `core/hooks/chat/use-chat-appearance.ts`. Test: `core/lib/media-cache/media-cache.test.ts` (range reads; a download
      resumes; the budget is kept).
- [ ] **T78**. Shared pieces with only this feature on: `core/lib/utils/app-worker.ts` of `people-self-service` counts
      this feature, so with only this feature on for the tenant the app worker, the manifest, the offline queue with its
      unsent badge and conflict review drawer, the unsent prompt at sign-out and the offline wrapper's route list (with
      the chat and Docs routes of this feature) are active, while the cards, pages and offline routes of that feature
      stay hidden. Files: `core/lib/utils/app-worker.ts`, `core/lib/utils/collaboration-clients-enabled.ts`,
      `core/components/features/offline/register-app-worker.tsx`, `core/components/common/offline-wrapper.tsx`. Test:
      `core/components/features/offline/register-app-worker.test.tsx` (only this feature on: the app worker is
      registered and push keeps it; both features off: nothing registered); `core/lib/chat-cache/chat-sync.test.ts`
      (only this feature on: an offline chat send is queued, replayed once, and a refusal lands in the conflict review).

## Phase 2 — Pages and components

Pieces ship in this order: T11 to T21 (chat); T22, T45, T61, T62, T46, T63, T64, T47, T65, T66, T43 (meeting
screens); T23, T48, T49, T67, T50, T68, T69, T51 (calendar layer); T24, T52, T53, T70, T54, T55, T71, T72, T73 (files
in Docs); T25, T56, T74, T57, T58, T59, T60, T75, T76, T77 (documents and wiki); then T26 and T41.

- [ ] **T11**. Chat navigation: views Home, Direct messages, Activity, Threads, Saved, Scheduled, People, Search; sections
      with sort and filters; switcher counts; notes to self. Files: `app/[locale]/(main)/chat/{activity,saved,
      scheduled,people,search}/`, `core/components/pages/chat/navigation/*`; direct and group teasers with draft marks
      and group names in `core/components/pages/chat/conversation-list.tsx`. Test:
      `core/components/pages/chat/navigation/chat-navigation.test.tsx` (rendering and keyboard navigation; switcher counts
      per organization); `core/components/pages/chat/conversation-list.test.tsx`.
- [ ] **T12**. Channel panel and modes, manager actions, delete by typed name, people page and profile cards
      `core/components/pages/chat/{channel-panel,people}/*`; conversion of a group to a private channel and read-only
      banners in `core/components/pages/chat/conversation-header.tsx`. Test:
      `core/components/pages/chat/channel-panel/channel-panel.test.tsx` (announcement-only composer gate; actions follow
      rights); `core/components/pages/chat/conversation-header.test.tsx`.
- [ ] **T13**. Composer extras on the chat target: toolbar and preview, `@team`, warnings, emoji picker with custom emoji,
      20 files, silent send, working-hours delivery, schedule menu, data-loss warn and block. Files:
      `core/components/pages/chat/message-composer.tsx`, `core/components/pages/chat/emoji-popover.tsx`,
      `core/components/pages/chat/composer/composer-toolbar.tsx`, `core/components/pages/chat/composer/schedule-menu.tsx`,
      `core/components/pages/chat/composer/data-loss-notice.tsx`. Test: `core/components/pages/chat/message-composer.test.tsx`
      (each composer path).
- [ ] **T14**. Stream and actions: quote reply, forward, permalink, edit history, selection delete, save, remind, mark
      unread, translate, galleries, voice clips with transcript, spoilers, jumps. Files:
      `core/components/pages/chat/message-item.tsx`, `core/components/pages/chat/chat-virtual-timeline.tsx`,
      `core/components/pages/chat/message-actions/message-actions-menu.tsx`, `core/components/pages/chat/gallery/lightbox.tsx`,
      `core/components/pages/chat/voice-clip.tsx`. Test: `core/components/pages/chat/message-item.test.tsx` (action menu
      by long press and keyboard).
- [ ] **T15**. Threads, reactions, polls, pins, read receipts, Saved and Scheduled pages. Files:
      `core/components/pages/chat/thread-pane.tsx`, `core/components/pages/chat/reactions/reactions-dialog.tsx`,
      `core/components/pages/chat/polls/poll-card.tsx`, `app/[locale]/(main)/chat/saved/page.tsx`,
      `app/[locale]/(main)/chat/scheduled/page.tsx`. Test: `core/components/pages/chat/polls/poll-card.test.tsx` (poll
      results live; poll export for the author only); `core/components/pages/chat/thread-pane.test.tsx`.
- [ ] **T16**. Chat search page and header search, Files tab with record attach, Docs folder save and zip. Files:
      `app/[locale]/(main)/chat/search/page.tsx`, `core/components/pages/chat/search/chat-search.tsx`,
      `core/components/pages/chat/files-tab/files-tab.tsx`, `core/hooks/chat/use-chat-files.ts`. Test:
      `core/components/pages/chat/search/chat-search.test.tsx` (hit opens in place; offline search uses the local index).
- [ ] **T17**. Activity, notification levels, mute until, sounds, status and time-off badges, summaries and relevance sort.
      Files: `core/components/pages/chat/activity/activity-list.tsx`, `core/components/pages/chat/status/status-menu.tsx`,
      `core/hooks/chat/use-activity.ts`. Test: `core/components/pages/chat/activity/activity-list.test.tsx` (badge counts
      on the tab title; mute until a time).
- [ ] **T18**. Bots and agents: badges, agent conversations, streamed answers with stop, plan cards, undo list, prompts,
      private replies, slash commands `core/components/pages/chat/agents/*`. Files:
      `core/components/pages/chat/agents/plan-card.tsx`, `core/components/pages/chat/agents/agent-answer.tsx`,
      `core/components/pages/chat/agents/slash-commands.tsx`. Test: `core/components/pages/chat/agents/plan-card.test.tsx`
      (plan approval gate; undo within 10 minutes only).
- [ ] **T19**. Record cards and actions: record picker, live cards with transitions, approval cards, the existing
      `send-task-to-chat-dialog.tsx` grown into "Send to chat" and "Discussed in" on task and project pages, message
      actions, record posts with mute, recurring posts; everything beyond task cards only where the tenant has
      `FEATURE_CHAT_RECORD_CARDS` on. Files: `core/components/pages/chat/send-task-to-chat-dialog.tsx`,
      `core/components/pages/chat/chat-task-card.tsx`, `core/components/pages/chat/record-cards/record-card.tsx`,
      `core/components/pages/chat/record-cards/record-picker.tsx`. Test:
      `core/components/pages/chat/record-cards/record-card.test.tsx` (card renders with viewer rights; placeholder when
      unreadable); `core/components/pages/chat/chat-task-card.test.tsx` (with the flag off task cards and "send task to
      chat" behave as today).
- [ ] **T20**. Integrations panel growing `chat-webhooks-dialog.tsx`: rotation with overlap, last use, event
      subscriptions. Files: `core/components/pages/chat/chat-webhooks-dialog.tsx`, `core/hooks/chat/use-chat-webhooks.ts`,
      `core/services/client/api/chat/chat-webhooks.service.ts`. Test: `core/components/pages/chat/chat-webhooks-dialog.test.tsx`
      (rotation with overlap); existing webhook tests unchanged.
- [ ] **T21**. Guests and shared channels (badges, banner, partner state) and calls from conversations (call card,
      ringing, thread links, action items to tasks). Files: `core/components/pages/chat/guests/guests-banner.tsx`,
      `core/components/pages/chat/calls/call-card.tsx`, `core/hooks/chat/use-calls.ts`. Test:
      `core/components/pages/chat/calls/call-card.test.tsx` (call card updates live); `core/components/pages/chat/guests/guests-banner.test.tsx`
      (guest sees only invited channels).
- [ ] **T22**. Meetings over platform rooms on the existing meet pages, entry and joining: rooms and tokens from the
      platform (old room links reach the same room, today's token routes kept with the platform's meetings off), list
      of upcoming meetings, team rooms, instant rooms and sessions, device check, lobby with admit and reject, guest join
      hand-off, "move the call here", room full and duration warnings; the room itself is T45, T61 and T62, recording,
      captions and notes T46, T63 and T64, the library T47, T65 and T66. Files: `core/components/pages/meet/home/`, `core/components/pages/meet/pre-join/`,
      `core/components/pages/meet/lobby/`, `app/[locale]/(main)/meet/rooms/[roomKey]/page.tsx`. Test:
      `core/components/pages/meet/lobby/lobby.test.tsx` (admit and reject); `core/components/pages/meet/room/meet-room-bar.test.ts`
      (old room link joins the same room).
- [ ] **T23**. Calendar events layer on the existing `core/components/calendar/calendar-page.tsx`: layer switch beside the
      time entries (one layer list shared with `people-self-service`), day, work week, week, month and agenda, and the
      calendar list (show, hide, colour, order, create, share); events, invitations, availability, rooms, bookings,
      connections, record panels and the meeting scheduler follow in T48 to T51 and T67 to T69. Files:
      `core/components/calendar/calendar-page.tsx`, `core/components/calendar/events-layer/events-layer.tsx`,
      `core/components/calendar/events-layer/calendar-list.tsx`, `core/hooks/calendar/use-calendar-events-layer.ts`. Test:
      `core/components/calendar/events-layer/events-layer.test.tsx` (time entries move and split as before with the layer
      on; with the platform's calendar off no layer is offered).
- [ ] **T24**. Files in the existing Docs area, tree and views: FILE kind and the views Home, Shared with me, Recent
      (server, merged with the device-kept list, which stays the fallback), Storage in
      `core/components/pages/docs/docs-tree.tsx` and `core/hooks/docs/*`, folders as list or grid with view settings on the
      server, move, copy, rename, transfer ownership, bulk actions with per-item results and zip; uploads, sharing,
      previews and trash, search and record panels follow in T52 to T55 and T70 to T73. Files: `core/components/pages/docs/docs-tree.tsx`,
      `core/hooks/docs/use-docs-tree.ts`, `core/hooks/docs/use-docs-recent.ts`,
      `core/components/pages/docs/bulk/bulk-results.tsx`. Test: `core/hooks/docs/use-docs-recent.test.tsx` (server list
      merged with the device list; device list alone when the server does not answer);
      `core/components/pages/docs/bulk/bulk-results.test.tsx` (per-item results); no `drive/` route exists.
- [ ] **T25**. Docs depth, editor and live editing: editor additions (four heading levels with a contents block, font,
      colour and spacing, image captions and alternative text, allowed embeds, diagrams, tabs, print settings), live by
      space, local unsaved edits kept 7 days; the live schema guard `core/lib/docs-live/schema-guard.ts` and
      `pages/docs/docs-editor-extensions.ts` take the new nodes; review, templates, wiki, proposals and page settings
      follow in T56 to T60 and T74 to T77. Files: `core/components/pages/docs/docs-editor-extensions.ts`,
      `core/lib/docs-live/schema-guard.ts`, `core/lib/docs-live/unsaved-edits.ts`. Test:
      `core/lib/docs-live/schema-guard.test.ts` (a page with new nodes opens without loss);
      `core/lib/docs-live/unsaved-edits.test.ts` (unsaved edits come back after a reload and are dropped after 7 days).
- [ ] **T26**. i18n namespaces in every file of `apps/web/locales/`; cspell words. Files: `locales/*.json` (the 13
      files), the cspell word list of `apps/web`. Test: locale completeness gate of `web.before-merge` (every key in
      every locale; right-to-left layouts render).
- [ ] **T41**. Help panel: the existing shortcuts dialog grows into a help panel (shortcuts, guide, what's new,
      versions) fed by the shortcut registry, the what's-new panel and the versions of `(main)/about`, with palette
      entries for every area. Files: `core/components/common/shortcuts-dialog.tsx`, `core/lib/keyboard/shortcuts.ts`,
      `core/components/whats-new/whats-new-panel.tsx`, `core/hooks/keyboard/use-palette-shortcuts.ts`. Test:
      `core/components/common/shortcuts-dialog.test.tsx` (the four sections render; palette entries per area).
- [ ] **T43**. Meetings on records: start or schedule a meeting from task, project and team pages, their sessions
      listed there and attended minutes logged to the task, through the record page extension points. Files:
      `core/components/pages/meet/record-meetings-panel.tsx`, `core/hooks/meet/use-record-meetings.ts`. Test:
      `core/components/pages/meet/record-meetings-panel.test.tsx` (a meeting started from a task lists its session;
      attended minutes offered to the task).
- [ ] **T45**. Meeting room of T22, media and layout: push-to-talk, network quality, layouts, background blur or image,
      noise suppression, statistics with a problem report and sounds on the existing room bar. Files:
      `core/components/pages/meet/room/meet-room-bar.tsx`, `core/components/pages/meet/room/room-layouts.tsx`,
      `core/components/pages/meet/room/media-effects.tsx`, `core/components/pages/meet/room/room-statistics.tsx`. Test:
      `core/components/pages/meet/room/room-statistics.test.tsx` (a problem report carries the statistics);
      `core/components/pages/meet/room/meet-room-bar.test.ts` (existing checks unchanged).
- [ ] **T46** (parallel). Recording in the room: recording preflight with the queue position, notices and indicator for
      everyone. Files: `core/components/pages/meet/room/recording-preflight.tsx`,
      `core/components/pages/meet/room/recording-indicator.tsx`. Test:
      `core/components/pages/meet/room/recording-preflight.test.tsx` (notice shown to every participant).
- [ ] **T47** (parallel). Recording library: the list of recordings and the recording page. Files:
      `core/components/pages/meet/library/recording-library.tsx`, `app/[locale]/(main)/meet/recordings/[id]/page.tsx`.
      Test: `core/components/pages/meet/library/recording-library.test.tsx` (a recording the viewer may not read is not
      listed).
- [ ] **T48**. Events on the layer of T23: create by range, quick add or full form (time zones, all-day, private, draft,
      room, Docs attachments), move and resize, repeats edited for this, following or all. Files:
      `core/components/calendar/events-layer/event-dialog.tsx`, `core/components/calendar/events-layer/event-form.tsx`,
      `core/components/calendar/events-layer/repeat-scope-dialog.tsx`. Test:
      `core/components/calendar/events-layer/event-form.test.tsx` (each way of creating; moving a repeat asks for the
      scope).
- [ ] **T49** (parallel). Invitations: invite colleagues, teams and contacts, send, answer with a comment from the event
      or a notification, propose a time. Files: `core/components/calendar/events-layer/event-answer.tsx`,
      `core/components/calendar/events-layer/event-invitees.tsx`, `core/hooks/calendar/use-calendar-answers.ts`.
      Test: `core/components/calendar/events-layer/event-answer.test.tsx` (answer from a notification updates counts).
- [ ] **T50** (parallel). Rooms: room booking with filters, approval state, capacity warnings and check-in. Files:
      `core/components/calendar/events-layer/room-booking.tsx`. Test:
      `core/components/calendar/events-layer/room-booking.test.tsx` (a capacity warning never blocks).
- [ ] **T51**. Events on records and the meeting scheduler: event panels on task and project pages, event search, and
      the existing meeting scheduler creating calendar events when the platform's calendar is on. Files:
      `core/components/calendar/record-events-panel.tsx`, `core/hooks/calendar/use-record-events.ts`. Test:
      `core/components/calendar/record-events-panel.test.tsx` (events of the task listed; with the calendar off the
      scheduler behaves as today).
- [ ] **T52**. Uploads in the Docs tree of T24: uploads in parts with progress, folder and camera upload, name clashes,
      saved links and items of every registered kind. Files: `core/hooks/docs/use-docs-upload.ts`,
      `core/components/pages/docs/upload/upload-panel.tsx`, `core/components/pages/docs/upload/clash-dialog.tsx`. Test:
      `core/hooks/docs/use-docs-upload.test.tsx` (resumable upload continues after a reconnect);
      `core/components/pages/docs/upload/clash-dialog.test.tsx`.
- [ ] **T53** (parallel). Sharing: share dialog with the five levels, inheritance, restriction, outside recipients with
      expiry and the access panel. Files: `core/components/pages/docs/share/share-dialog.tsx`,
      `core/components/pages/docs/share/access-panel.tsx`. Test:
      `core/components/pages/docs/share/share-dialog.test.tsx` (inheritance shown in the access panel).
- [ ] **T54** (parallel). Previews, versions and trash: previews and thumbnails, the existing versions panel, the one
      trash in `docs-trash.tsx`, whose restore and delete forever keep working as today, gaining empty, retention
      labels and holds (a hold applies only where one is set in Ever Gauzy). Files:
      `core/components/pages/docs/docs-trash.tsx`, `core/components/pages/docs/docs-version-panel.tsx`,
      `core/components/pages/docs/preview/file-preview.tsx`. Test: `core/components/pages/docs/docs-trash.test.tsx`
      (restore and delete forever work as today for an item without a hold; an item under a hold set in Ever Gauzy
      cannot be deleted forever).
- [ ] **T55**. Search: search with filters and the list of duplicates in Docs. Files:
      `core/components/pages/docs/search/docs-search.tsx`, `core/components/pages/docs/search/duplicates-list.tsx`. Test:
      `core/components/pages/docs/search/docs-search.test.tsx` (each filter narrows the list; duplicates are grouped).
- [ ] **T56**. Review in Docs, comments and suggestions: comment filters, team mentions, suggestion mode with accept and
      reject and the suggestions panel, on the existing comments panel. Files: `core/components/pages/docs/docs-comments-panel.tsx`,
      `core/components/pages/docs/suggestions/suggestions-panel.tsx`. Test:
      `core/components/pages/docs/suggestions/suggestions-panel.test.tsx` (accept and reject);
      `core/components/pages/docs/docs-comments-panel.test.tsx` (existing checks unchanged; a filter narrows the list).
- [ ] **T57** (parallel). Templates and conversions: the platform's templates from `/templates?kind=page` on the existing
      Docs home (client list `docs-templates.ts` only while the platform does not answer), tasks from task items,
      meeting notes, DOCX, HTML and ODT export and DOCX import. Files: `core/lib/utils/docs-templates.ts`,
      `core/components/pages/docs/templates/templates-gallery.tsx`, `core/components/pages/docs/export/export-menu.tsx`.
      Test: `core/components/pages/docs/templates/templates-gallery.test.tsx` (platform list first, client list as the
      fallback).
- [ ] **T58** (parallel). Wiki spaces: switcher and pins, sidebar sections and links, page addresses, double-bracket
      links, backlinks and broken links. Files: `core/components/pages/docs/spaces/`,
      `core/components/pages/docs/links/backlinks-panel.tsx`. Test: `core/components/pages/docs/links/backlinks-panel.test.tsx`
      (a broken link is listed).
- [ ] **T59** (parallel). Proposals and the one review queue: propose, submit, review, merge. Files:
      `core/components/pages/docs/proposals/`, `core/components/pages/docs/review-queue/review-queue.tsx`. Test:
      `core/components/pages/docs/proposals/proposal-merge.test.tsx` (merge preview).
- [ ] **T60**. Page settings: owners, review dates, verification, the publish switch and feedback for owners. Files:
      `core/components/pages/docs/page-settings/page-settings.tsx`, `core/components/pages/docs/page-settings/page-feedback.tsx`.
      Test: `core/components/pages/docs/page-settings/page-settings.test.tsx` (verification expires on the review date).
- [ ] **T61**. Meeting room interaction: raised hands, reactions, polls and the room chat kept in the meeting's
      conversation. Files: `core/components/pages/meet/room/meeting-poll.tsx`, `core/components/pages/meet/room/room-reactions.tsx`,
      `core/components/pages/meet/room/room-chat.tsx`. Test: `core/components/pages/meet/room/meeting-poll.test.tsx`
      (results live); `core/components/pages/meet/room/room-chat.test.tsx` (messages land in the meeting's conversation).
- [ ] **T62**. Meeting room host controls and the person-hours meter. Files:
      `core/components/pages/meet/room/host-controls.tsx`, `core/components/pages/meet/room/person-hours-meter.tsx`. Test:
      `core/components/pages/meet/room/host-controls.test.tsx` (controls only for hosts);
      `core/components/pages/meet/room/person-hours-meter.test.tsx` (the meter counts every present participant).
- [ ] **T63** (parallel). Captions in the room, translated on request. Files:
      `core/components/pages/meet/room/captions-bar.tsx`. Test: `core/components/pages/meet/room/captions-bar.test.tsx`
      (captions switch on per participant; a chosen language shows the translation).
- [ ] **T64**. Agenda, notes and summary review: the agenda (the existing `core/components/pages/meet/home/meeting-agenda.tsx`)
      in the room, the shared notes page, and the summary, decisions and action items for hosts to edit and approve.
      Files: `core/components/pages/meet/home/meeting-agenda.tsx`, `core/components/pages/meet/notes/summary-review.tsx`.
      Test: `core/components/pages/meet/notes/summary-review.test.tsx` (approval publishes decisions and action items).
- [ ] **T65**. Transcripts on the recording page of T47, with search, jump and corrections. Files:
      `core/components/pages/meet/library/transcript-view.tsx`. Test:
      `core/components/pages/meet/library/transcript-view.test.tsx` (search jumps to the moment; a correction is kept).
- [ ] **T66** (parallel). Clips: cut a clip from a recording and share its link. Files:
      `core/components/pages/meet/library/clip-dialog.tsx`. Test: `core/components/pages/meet/library/clip-dialog.test.tsx`
      (a clip keeps its start and end; its link expires as set).
- [ ] **T67**. Availability: working-hours overrides, work location, free/busy and reminders. Files:
      `core/components/calendar/events-layer/working-hours-panel.tsx`, `core/components/calendar/events-layer/event-reminders.tsx`.
      Test: `core/components/calendar/events-layer/working-hours-panel.test.tsx` (an override shows in free/busy for that
      day only).
- [ ] **T68** (parallel). Booking links and bookings. Files: `core/components/calendar/booking-links/booking-links.tsx`.
      Test: `core/components/calendar/booking-links/booking-links.test.tsx` (a link lists its bookings; a paused link
      offers no times).
- [ ] **T69** (parallel). Outside calendar connections, feeds, imports and address names. Files:
      `core/components/calendar/connections/calendar-connections.tsx`. Test:
      `core/components/calendar/connections/calendar-connections.test.tsx` (a connection shows its last sync and error; an
      import reports a result per event).
- [ ] **T70** (parallel). Public links and file requests with password, expiry, limits and receipts. Files:
      `core/components/pages/docs/share/public-link-dialog.tsx`, `core/components/pages/docs/share/file-request-dialog.tsx`.
      Test: `core/components/pages/docs/share/file-request-dialog.test.tsx` (password and expiry saved; receipts listed).
- [ ] **T71**. Asking a folder through the platform's AI chat with citations. Files:
      `core/components/pages/docs/ask/ask-folder.tsx`. Test: `core/components/pages/docs/ask/ask-folder.test.tsx` (answers
      carry citations).
- [ ] **T72** (parallel). Docs files in the existing files panels on task and project pages ("attached to records",
      "create from this file"). Files: `core/components/common/entity-files/entity-files-section.tsx`,
      `core/services/client/api/documents/entity-files.service.ts`. Test:
      `core/components/common/entity-files/entity-files-section.test.tsx` (the panel lists its files as today; Docs files
      show as "attached to records").
- [ ] **T73** (parallel). Quota and the network-drive address: the person's storage use and quota in Docs, and the
      network-drive address in settings. Files: `core/components/pages/docs/storage/storage-quota.tsx`,
      `core/components/settings/network-drive-address.tsx`. Test: `core/components/pages/docs/storage/storage-quota.test.tsx`
      (use and limit shown; a warning near the limit).
- [ ] **T74**. Review in Docs, versions: named versions, compare, block restore, origins and space history on the
      existing versions panel. Files: `core/components/pages/docs/docs-version-panel.tsx`,
      `core/components/pages/docs/versions/compare-view.tsx`. Test: `core/components/pages/docs/versions/compare-view.test.tsx`
      (a restored block leaves the rest of the page unchanged).
- [ ] **T75** (parallel). Page properties with sub-page views. Files: `core/components/pages/docs/properties/properties-view.tsx`.
      Test: `core/components/pages/docs/properties/properties-view.test.tsx` (a sub-page view filters by a property).
- [ ] **T76**. Writing help and questions: writing help in the existing editor assist over `POST /documents/:id/writing`
      and questions with citations. Files: `core/components/pages/docs/assist/writing-help.ts`,
      `core/components/pages/docs/assist/page-questions.tsx`. Test: `core/components/pages/docs/assist/writing-help.test.ts`
      (a suggestion replaces only the selection); `core/components/pages/docs/assist/page-questions.test.tsx` (answers
      carry citations).
- [ ] **T77** (parallel). Digests and print: page digests for followers and print with the page's print settings. Files:
      `core/components/pages/docs/digests/digest-settings.tsx`, `core/components/pages/docs/print/print-page.tsx`. Test:
      `core/components/pages/docs/print/print-page.test.tsx` (print uses the page's print settings).

## Phase 3 — Live updates, notifications, advanced

- [ ] **T27**. `useCollabLive` invalidating every area's keys; polling fallbacks per area. Files:
      `core/hooks/collaboration/use-collab-live.ts`, `core/lib/realtime/bus.ts`. Test:
      `core/hooks/collaboration/use-collab-live.test.tsx` (event to keys table; no polling while hidden).
- [ ] **T28**. Push kinds, grouping keys, silent clear and deep links across areas `core/hooks/collaboration/
      use-collab-push.ts`, `use-deep-links.ts` on the existing inbox push. Files: `core/hooks/collaboration/use-collab-push.ts`,
      `core/hooks/collaboration/use-deep-links.ts`, `core/hooks/inbox/use-inbox-web-push.ts`. Test:
      `core/hooks/collaboration/use-deep-links.test.tsx` (routing table, the exact target opens with the app closed;
      later push replaces the earlier one).
- [ ] **T29**. One composer on every target: chat, threads, task comments, page comments, mail replies
      `core/components/common/composer/*`; old composers become wrappers. Files: `core/components/common/composer/composer.tsx`,
      `core/components/common/composer/target-adapters.ts`, `core/components/pages/chat/message-composer.tsx`. Test:
      `core/components/common/composer/composer.test.tsx` (per-target adapters); existing composer tests pass
      unchanged.
- [ ] **T30**. Summary view of the existing Inbox in `core/components/pages/inbox/*`, `useInboxSummary` with relevance
      and time order, in-place answers and summaries side by side; no separate page or sidebar count. Files:
      `core/components/pages/inbox/summary/inbox-summary.tsx`, `core/hooks/inbox/use-inbox-summary.ts`,
      `core/components/pages/inbox/inbox-page.tsx`. Test: `core/components/pages/inbox/summary/inbox-summary.test.tsx`
      (answering updates the source's own state; summaries send nothing).
- [ ] **T31**. Call window `core/components/pages/meet/call-window/*` with document picture-in-picture or the in-page
      window, controls and captions line. Files: `core/components/pages/meet/call-window/call-window.tsx`,
      `core/hooks/meet/use-call-window.ts`. Test: `core/components/pages/meet/call-window/call-window.test.tsx` (media
      session kept while navigating to a task).
- [ ] **T32**. Share target landing `app/[locale]/(main)/share/` with destination picker (conversation, task, new task,
      page, Docs folder) through the offline queue; share out to the device sheet. Files:
      `app/[locale]/(main)/share/page.tsx`, `core/components/share/share-target.tsx`, `core/components/share/share-out.ts`,
      `app/manifest.ts` (share target). Test: `core/components/share/share-target.test.tsx` (photo to a task as attachment
      plus comment; queued offline).
- [ ] **T33**. Offline documents `core/components/offline/*`, `useOfflineItems`: keep pages and files, background sync,
      budget and sign-out wipe. Files: `core/components/offline/offline-items.tsx`, `core/hooks/collaboration/use-offline-items.ts`,
      `core/components/common/offline-wrapper.tsx`. Test: `core/hooks/collaboration/use-offline-items.test.tsx` (page
      edited offline merges live, else the conflict notice; warning at 80 % of the budget; wiped at sign-out).
- [ ] **T34**. Mail view of the existing Inbox: mailbox, folder and label panel, conversation list, messages in the
      Inbox's existing isolated e-mail view, compose and reply through the one composer, shared mailbox actions; Gauzy web
      app links for discussions, workbooks and decks from Docs and notifications. Files:
      `core/components/pages/inbox/mail/mail-view.tsx`, `core/components/pages/inbox/inbox-detail.tsx`,
      `app/[locale]/(main)/inbox/mail/[[...path]]/page.tsx`, `core/hooks/mail/use-mail-view.ts`,
      `core/components/common/gauzy-web-link.tsx`. Test: `core/components/pages/inbox/mail/mail-view.test.tsx` (mail
      renders only in the isolated frame; links hidden without the Gauzy web app address).
- [ ] **T35**. Reply and mark read from notifications on the web (service worker actions). Files: `public/app-sw.js`
      (`people-self-service` T20), `core/hooks/collaboration/use-notification-actions.ts`. Test:
      `core/hooks/collaboration/use-notification-actions.test.ts` (reply queued offline; mark read clears elsewhere).
- [ ] **T44**. Calendar assistance: the scheduling assistant's proposals in the event form, focus time settings, the
      meeting load view and the discussion check before sending, over the platform's calendar routes (shown only where
      the platform answers them). Files: `core/components/calendar/assistant/time-proposals.tsx`,
      `core/components/calendar/insights/meeting-load.tsx`, `core/components/calendar/events-layer/discussion-check.tsx`,
      `core/hooks/calendar/use-calendar-insights.ts`. Test: `core/components/calendar/assistant/time-proposals.test.tsx`
      (options with their trade-off sentence); `core/components/calendar/insights/meeting-load.test.tsx` (team figures
      withheld under the threshold).

## Phase 4 — Other clients and docs

- [ ] **T36**. Mobile chat stack `apps/mobile/app/screens/authenticated/chat/*` on the chat cache and offline queue: list,
      conversation, threads, compact composer with camera and voice, gestures, haptics, files, search, offline. Files:
      `apps/mobile/app/screens/authenticated/chat/conversation-list-screen.tsx`,
      `apps/mobile/app/screens/authenticated/chat/conversation-screen.tsx`,
      `apps/mobile/app/screens/authenticated/chat/thread-screen.tsx`, `apps/mobile/app/components/chat/compact-composer.tsx`.
      Test: screen tests beside each screen (swipe actions have button equivalents).
- [ ] **T37**. Mobile inbox with the Summary view, calendar agenda with answers, meeting join through each media adapter's native
      client module, Docs files (browse, preview, upload, offline) and pages (reading with basic editing); the Mail view
      as web screens in the app; share extension; native sign-in with a proof key; language tables. Files:
      `apps/mobile/app/screens/authenticated/inbox/`, `apps/mobile/app/screens/authenticated/calendar/`,
      `apps/mobile/app/screens/authenticated/meet/`, `apps/mobile/app/screens/authenticated/docs/`,
      `apps/mobile/app/i18n/`. Test: screen tests beside each screen (share extension delivers to a task; strings in every
      language table).
- [ ] **T38**. Desktop: in `apps/server-web` the tray badge (`src/main/tray.ts`), native notifications with reply
      (`windows/desktop-notifier.ts`), call ringing, the always-on-top call window (`helpers/create-window.ts`) and
      "open with" share target; in the Ever Teams desktop timer the global capture hotkey on its existing screen capture
      and always-on-top window, with the timer's task preselected. Test: hotkey opens capture; call window stays on top.
- [ ] **T39**. Extension `apps/extensions`: unread count and "share this page" in the existing popup. Files:
      `apps/extensions/components/popup/Header.tsx`, `apps/extensions/components/popup/SharePage.tsx`,
      `apps/extensions/background.ts`. Test: `apps/extensions/components/popup/SharePage.test.tsx` (popup rendering; share
      to a conversation, task or page).
- [ ] **T40**. User docs (chat depth, meetings, files in Docs, wiki, Inbox Mail and Summary views, sharing, offline) and the
      `docs/specs/README.md` row; spec status `Implemented`; then the feature is off by default; after the trial period the code `FEATURE_TEAMS_COLLABORATION_CLIENTS` may be switched on by default for new tenants only; existing tenants keep their stored toggle until an administrator changes it. Files:
      docs site pages of Ever Teams, `docs/specs/README.md`, `docs/specs/features/workspace-collaboration-clients/spec.md`.
      Test: docs build.

## Requirement Coverage

Every functional requirement of `spec.md` §3 and the tasks that implement it; each task's test clause verifies it, together with the acceptance criteria of `spec.md` §7 that cite it.

| Requirements | Spec section | Tasks |
| --- | --- | --- |
| FR-1 | §3.1 Enabling, navigation and states | T1, T78 |
| FR-2 | §3.1 Enabling, navigation and states | T1, T3 |
| FR-3 | §3.1 Enabling, navigation and states | T11 |
| FR-4 | §3.1 Enabling, navigation and states | T3 |
| FR-5 | §3.1 Enabling, navigation and states | T4 |
| FR-6 | §3.1 Enabling, navigation and states | T23, T34 |
| FR-7 | §3.1 Enabling, navigation and states | T41 |
| FR-8 | §3.2 Chat | T11 |
| FR-9–FR-10 | §3.2 Chat | T12 |
| FR-11 | §3.2 Chat | T13 |
| FR-12–FR-13 | §3.2 Chat | T14 |
| FR-14–FR-15 | §3.2 Chat | T15 |
| FR-16 | §3.2 Chat | T15 |
| FR-17–FR-18 | §3.2 Chat | T16 |
| FR-19–FR-20 | §3.2 Chat | T17 |
| FR-21 | §3.2 Chat | T11, T12 |
| FR-22 | §3.2 Chat | T17 |
| FR-23 | §3.2 Chat | T18 |
| FR-24 | §3.2 Chat | T19 |
| FR-25 | §3.2 Chat | T19 |
| FR-26 | §3.2 Chat | T20 |
| FR-27 | §3.2 Chat | T21 |
| FR-28 | §3.2 Chat | T13 |
| FR-29 | §3.2 Chat | T21 |
| FR-30 | §3.2 Chat | T36, T38 |
| FR-31 | §3.2 Chat | T5, T6, T78 |
| FR-32 | §3.2 Chat | T42 |
| FR-33–FR-34 | §3.3 Meetings | T8, T22 |
| FR-35 | §3.3 Meetings | T22 |
| FR-36 | §3.3 Meetings | T45, T61, T62 |
| FR-37–FR-38 | §3.3 Meetings | T46, T63, T64 |
| FR-39 | §3.3 Meetings | T47, T65, T66 |
| FR-40 | §3.3 Meetings | T43 |
| FR-41 | §3.3 Meetings | T31 |
| FR-42–FR-43 | §3.4 Calendar | T23 |
| FR-44 | §3.4 Calendar | T48 |
| FR-45 | §3.4 Calendar | T49 |
| FR-46 | §3.4 Calendar | T50, T67 |
| FR-47 | §3.4 Calendar | T51, T68, T69 |
| FR-48 | §3.4 Calendar | T44, T51 |
| FR-49–FR-51 | §3.5 Mail | T34 |
| FR-52 | §3.5 Mail | T34 |
| FR-53 | §3.5 Mail | T34 |
| FR-54 | §3.6 Files in Docs | T24 |
| FR-55 | §3.6 Files in Docs | T52 |
| FR-56 | §3.6 Files in Docs | T24 |
| FR-57 | §3.6 Files in Docs | T53, T70 |
| FR-58 | §3.6 Files in Docs | T54 |
| FR-59–FR-60 | §3.6 Files in Docs | T55, T71, T72, T73 |
| FR-61–FR-62 | §3.7 Documents and wiki | T25 |
| FR-63 | §3.7 Documents and wiki | T56, T74 |
| FR-64 | §3.7 Documents and wiki | T57 |
| FR-65 | §3.7 Documents and wiki | T58 |
| FR-66 | §3.7 Documents and wiki | T59 |
| FR-67 | §3.7 Documents and wiki | T60, T75, T76, T77 |
| FR-68–FR-73 | §3.8 Discussions, workbooks and decks | T34 |
| FR-74 | §3.9 One composer and summary view (advanced) | T10, T29 |
| FR-75–FR-76 | §3.9 One composer and summary view (advanced) | T30 |
| FR-77 | §3.9 One composer and summary view (advanced) | T35 |
| FR-78 | §3.10 Capture, sharing and offline (advanced) | T32 |
| FR-79 | §3.10 Capture, sharing and offline (advanced) | T38 |
| FR-80 | §3.10 Capture, sharing and offline (advanced) | T32 |
| FR-81–FR-82 | §3.10 Capture, sharing and offline (advanced) | T33 |
| FR-83 | §3.11 Notifications, live updates and other clients | T28, T37 |
| FR-84 | §3.11 Notifications, live updates and other clients | T27 |
| FR-85 | §3.11 Notifications, live updates and other clients | T28 |
| FR-86 | §3.11 Notifications, live updates and other clients | T36, T37 |
| FR-87 | §3.11 Notifications, live updates and other clients | T38 |
| FR-88 | §3.11 Notifications, live updates and other clients | T39 |
| FR-89 | §3.11 Notifications, live updates and other clients | T26, T37 |
| FR-90 | §3.11 Notifications, live updates and other clients | T11, T36 |

## Definition of Done

- All checkboxes ticked; `web.before-merge` gate green.
- Flag default stays off; enabling it in dev shows the feature end to end.
- Constitution gates in `spec.md` §9 confirmed.
- With the flag off, chat, docs, inbox, meetings (including their token routes), whiteboard and the calendar page behave
  exactly as before, and the existing chat and comment composer tests pass unchanged.
- One documents area, one trash, one Inbox, one Calendar page: no second screen for a concept Ever Teams already shows.
- Two-user checks done for chat depth, calls, meetings over platform rooms and docs suggestions before general availability.
- No message, comment, reply or share is lost or applied twice in the sync and offline suites; no device data remains
  after sign-out.
