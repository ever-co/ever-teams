# Feature Specification: Workspace collaboration clients

> Behaviour-first spec per [Constitution Principle X](../../../../.specify/memory/constitution.md#x-specs-are-behaviour-first).
> Describe **what** the user observes, not how it is built. Save implementation
> details for `plan.md`. Mark any unresolved question with `[NEEDS CLARIFICATION: …]`.

**Feature ID**: `workspace-collaboration-clients`
**Branch**: `feat/workspace-collaboration-clients`
**Status**: `Draft`
**Created**: 2026-11-16
**Last updated**: 2026-11-23
**Owner**: app maintainers
**Runtime flag**: `NEXT_PUBLIC_COLLABORATION_CLIENTS_ENABLED` (default off; the mobile and desktop apps read the same key); existing pages also keep their own flags (`NEXT_PUBLIC_CHAT_ENABLED`, `NEXT_PUBLIC_DOCS_ENABLED`, `NEXT_PUBLIC_INBOX_ENABLED`, `NEXT_PUBLIC_REALTIME_ENABLED`)
**Platform API dependency**: platform specs `chat-messaging`, `chat-agents-and-record-actions`, `chat-administration-and-clients`, `meetings`, `calendar-and-scheduling`, `mail`, `drive`, `documents-and-wiki`; the existing chat, docs, inbox and real-time channel routes

---

## 1. Overview

The web app has chat, docs (pages, folders, trash, recent, favourites, versions, live editing), the Inbox (mentions,
chat, docs, e-mail, integrations and people items, decisions answered in place), the real-time client, comment
reactions, meetings on two media servers, a whiteboard, an assistant and the Calendar page, which is the member time
calendar (where a member's time went, day by day, against what they planned); on the web only and mostly behind flags.
This feature makes those existing screens the full client of the platform's collaboration features on **web, desktop
and mobile**, extending each in place: **chat** gains what the platform adds (sections, channel modes, people, rich
composer, scheduling, reminders, saved items, polls, search, activity, status, bots, agents, record cards, guests,
calls, offline reading and sending, native gestures); the **meet** pages move onto platform rooms (lobby, guests, host
controls, recording, captions, notes, summaries); the **Calendar** page gains events, invitations and rooms as a layer
beside the time entries; the **Inbox** gains a Mail view and a Summary view; the **Docs** area gains files and the
drive views next to its pages, and wiki spaces, suggestions, compare, templates and proposals. Records and rules live in
the platform; Ever Teams owns screens, client state, offline behaviour, push and live updates. Web ships first; the
desktop app adds tray, notifications, the call window and capture; mobile ships chat, inbox, calendar, meetings and
docs natively (plan §8). Discussions, and the editing of workbooks and decks, are not part of Ever Teams: they open in
the Gauzy web app.

**Advanced capabilities.** **One composer** writes chat messages, comments and mail replies with the same formatting,
mentions, files, cards and drafts. **One Summary view** of the Inbox gathers what waits across chat, mail, document
comments and meeting summaries, answered in place. **Picture-in-picture meetings with live captions** keep a call on
screen while the person works on a task. **Share to Ever Teams** from any app, and a **desktop capture hotkey**, land a file,
photo or link in a conversation, task, page or folder. **Offline documents** keep chosen pages and files on the device
and sync them in the background.

## 2. User Scenarios

### 2.1 Primary scenarios

- **Given** a manager in a busy channel, **when** they open the Inbox Summary view at 8:00, **then** they see two
  mentions, a thread reply, a mail waiting three days, a suggestion on their page and a meeting summary to approve, and
  answer three of them in place with the one composer.
- **Given** a member who mentions an agent and asks it to move three tasks, **then** the answer streams with progress,
  a plan card lists the three changes with Approve, and after approval the run shows "undo" for 10 minutes.
- **Given** a direct conversation, **when** one person starts a call, **then** the other's phone rings, both join the
  platform room, and when one opens a task the call shrinks to a floating window with captions running.
- **Given** a guest joining by link, **then** the host admits them from the lobby and, after the call, approves the
  summary proposal.
- **Given** a phone, **when** the person shares a gallery photo to Ever Teams and picks a task, **then** it is attached with
  the caption as a comment, queued if offline; on the desktop the capture hotkey sends a region screenshot to the
  task their timer runs on.
- **Given** a wiki space and a file marked "available offline", **then** both open on a plane with their age shown,
  and page edits merge on landing.
- **Given** a phone offline for a day, **when** it reconnects, **then** chat receives only the changes since its cursor,
  deletions included, and the local search finds yesterday's messages.
- **Given** a member on the Calendar page, **when** they switch on the events layer, **then** their meetings and
  invitations show next to their time entries, and moving a time entry works as before.

### 2.2 Edge cases & failures

- **Given** the flag off, **then** every existing page behaves as today; **given** a platform without an area, **then**
  it is hidden, and with platform meetings off the meet pages keep their current token routes.
- **Given** a platform in maintenance with reads allowed, **then** one banner says so, reads work and every write is
  disabled with the retry time; an outdated client is asked to update and its writes are refused.
- **Given** a send to a conversation the person left while offline, **then** the queued message shows the platform's
  reason with copy and discard; nothing is lost silently.
- **Given** a data-loss rule, **then** warn mode asks for a reason before sending and block mode keeps the message in
  the composer naming the rule; **given** a guest, **then** only invited channels show, with a guest badge.
- **Given** an offline page edited on two devices, **then** live pages merge; single-writer pages show the existing
  conflict notice with "keep my changes as a new version".
- **Given** notifications blocked on the device, **then** settings say so with steps, and in-app badges keep working.
- **Given** a workbook or deck in the Docs tree and no Gauzy web app address configured, **then** it shows without an
  open action and with a note where to open it.

## 3. Functional Requirements

Platform requirements are cited by spec and number: CM `chat-messaging`, CAR `chat-agents-and-record-actions`, CA
`chat-administration-and-clients`, MEE `meetings`, CAL `calendar-and-scheduling`, MAIL `mail`, DRV `drive`, DOC
`documents-and-wiki`. "Chat" extends this app's `chat` feature, "docs" its `docs` feature and "Inbox" its `inbox`
feature; none is restated.

### 3.1 Enabling, navigation and states

- **FR-1** The app MUST, with the flag off, register nothing of this feature and keep chat, docs, inbox, meetings,
  whiteboard and calendar pages as today under their own flags.
- **FR-2** The app MUST show each area or depth only when its page flag is on (where one exists), the platform answers
  its probe or status route (MEE FR-4, CAL FR-5, MAIL FR-1, DRV FR-2, DOC FR-2, CA FR-41) and the person holds its
  permission, probing once per session through the app's one area-availability check.
- **FR-3** The organization switcher MUST show chat unread and mention counts per organization and reopen the last
  conversation there (CM FR-5, FR-6); the sidebar shows each existing area with its count.
- **FR-4** One banner MUST show offline, unreachable, maintenance (reads only, retry time), signed out and outdated
  states (CA FR-41, FR-42), with writes disabled and the reason given while they cannot work.
- **FR-5** The app MUST show only the actions the platform's rights answer allows on a conversation, file or page (CA
  FR-14, FR-15, DRV FR-20), never relying on hiding.
- **FR-6** Calendar events and mail MUST be Ever Teams screens over the platform API (FR-42 to FR-53); Ever Teams shows a
  link to the Gauzy web app for discussions and for the editing of workbooks and decks, which opens at the record.
- **FR-7** The existing shortcuts dialog MUST grow into a help panel (shortcuts, guide, what's new, versions; CA FR-45),
  with palette entries for every area.

### 3.2 Chat

- **FR-8** Chat MUST offer Home, Direct messages, Activity, Threads, Saved, Scheduled, People and Search with counts,
  personal sections, sort and filter choices and a notes-to-self conversation (CM FR-7 to FR-10, FR-25).
- **FR-9** Chat MUST offer channel modes (everyone, announcement-only), the channel panel (description, linked record,
  files, pins, links, threads), join and leave everywhere, manager promotion, archive and delete by typed name, as
  rights allow (CM FR-13 to FR-24, FR-26).
- **FR-10** Chat MUST offer a People page, profile cards and adding a team as members (CM FR-27, FR-28, FR-118).
- **FR-11** The composer MUST add the toolbar with a reader preview, `@team`, non-member warnings, custom emoji with skin
  tones and recents, animated images, 20 files with one caption, silent send, delivery at the recipient's working
  hours, the schedule menu and server drafts on every device (CM FR-29 to FR-37, FR-47, FR-49, FR-55, FR-83, FR-125).
- **FR-12** Message actions MUST include quote reply, forward, permalink, edit history, selection delete, save, remind,
  mark unread and translate, from the toolbar, context menu and long press (CM FR-39 to FR-44, FR-78, FR-81, FR-122).
- **FR-13** The stream MUST show day separators, the new line, grouping, jumps to date, pin or latest, galleries with a
  lightbox, players, voice clips with transcript, hidden spoilers, the person's preview style and blocked links as
  plain links, in a virtualised list (CM FR-45, FR-46, FR-51, FR-53, FR-58, FR-90, FR-126; CA FR-4, FR-48).
- **FR-14** Threads MUST follow as the platform decides, list followed and all threads, show repliers live, open from
  any push, hit or link, and let a reader join from the thread (CM FR-64 to FR-70).
- **FR-15** Chat MUST offer quick reactions from the person's most used, the reactions dialog, bundled reactions in
  Activity, polls with live results and export, the latest pin in the header and read receipts (CM FR-59, FR-71 to
  FR-80).
- **FR-16** Saved MUST list saved messages and reminders, Scheduled the scheduled messages to edit, send or cancel (CM
  FR-78, FR-81 to FR-86).
- **FR-17** The Files tab MUST filter, preview, attach a file to a record or save it to a Docs folder, share a Docs file
  with an access request, and zip a selection (CM FR-88, FR-91 to FR-95).
- **FR-18** Chat MUST offer header search and a search page (messages, files, links, polls) with every filter, opening
  hits in place (CM FR-96 to FR-103), and search synced messages on the device offline (FR-31).
- **FR-19** Activity MUST list mentions, replies, quotes, bundled reactions, thread replies and fired reminders; the
  person can mute until a time, set levels, choose sounds and see counts on the tab and icon (CM FR-60, FR-104 to
  FR-112).
- **FR-20** A person can set availability and a custom status with an expiry, see time-off badges and consent to
  presence from the timer or a meeting (CM FR-50, FR-113 to FR-115, FR-124).
- **FR-21** Direct and group conversations MUST show teasers with draft marks, group names, conversion of a group to a
  private channel and read-only banners (CM FR-116 to FR-119).
- **FR-22** A person can ask for a summary of a conversation, a record what they missed, and sort Unreads by relevance
  (CM FR-120, FR-121, FR-123).
- **FR-23** Chat MUST show bots and agents with badges, agent conversations with "new topic", agent mentions with
  streamed answers and stop, plan cards with previews and Approve, 10-minute undo, cited sources, prompts, private
  replies and slash commands with forms (CAR FR-5, FR-7 to FR-11, FR-19 to FR-27, FR-44).
- **FR-24** Chat MUST offer a record picker (up to five cards), cards with the viewer's rights and live updates, card
  actions and workflow transitions, approval cards, and "Send to chat" and "Discussed in" on the app's task and project
  pages (CAR FR-32 to FR-40); cards of records other than tasks, "Discussed in" and message actions appear where the
  tenant has `FEATURE_CHAT_RECORD_CARDS` on, and task cards and "send task to chat" work as today without it.
- **FR-25** Chat MUST run message actions with prefilled forms, show record posts with their source that managers can
  mute, let channels follow a record or view, and schedule recurring bot posts (CAR FR-41 to FR-50, FR-62, FR-63).
- **FR-26** The existing webhooks dialog MUST become the channel's integrations panel: address rotation with overlap,
  last use and channel event subscriptions (CAR FR-54 to FR-61).
- **FR-27** Chat MUST show guest badges and the guests banner, keep guests to their channels, and show shared channels
  with the partner's badge and "partner unavailable" (CA FR-16 to FR-19).
- **FR-28** The composer MUST apply data-loss rules before sending: warn with "send anyway" and a reason, block naming
  the rule, or show the masked text (CA FR-26).
- **FR-29** A member can start a call or quick call: members ring on phones and desktops, a live call card shows who is in,
  joining opens the platform room, and the call's links and action items with "create task" land in its thread (CA
  FR-29 to FR-32).
- **FR-30** Phones MUST offer swipe to reply and mark read, long-press menus, haptics on send and reaction, pull to
  refresh, back gestures and a keyboard-aware composer with camera and voice; the desktop native notifications, spell
  check and links in the default browser.
- **FR-31** The app MUST sync chat from its cursor (CA FR-37), keep the newest messages readable and searchable offline,
  resynchronise when told, and send offline messages through the app's one offline queue with client time and key,
  showing "sent while offline" and refusals with their reason in the same conflict review (CA FR-38).
- **FR-32** The app MUST stream media by byte ranges, resume downloads and cache files within the person's budget (CA
  FR-40), and follow the person's chat appearance and shortcuts (CM FR-61, FR-62).

### 3.3 Meetings

- **FR-33** With the platform's meetings on, the meet pages MUST take rooms and tokens from the platform, old links
  reaching the same room, and keep today's token routes when it is off (MEE FR-2, FR-3, FR-7, FR-9).
- **FR-34** The existing meet page MUST list upcoming meetings, team rooms, instant rooms and sessions (MEE FR-10,
  FR-22).
- **FR-35** Joining MUST keep the device check and add the lobby with admit and reject, guest join by link, "move the
  call here", room full and duration warnings (MEE FR-16 to FR-21).
- **FR-36** The room MUST offer push-to-talk, network quality, layouts, hands, reactions, polls, background blur or
  image, noise suppression, statistics with a problem report, sounds, host controls, the person-hours meter and room
  chat kept in the meeting's conversation (MEE FR-23 to FR-33).
- **FR-37** Hosts can record with the preflight and see the queue position; everyone sees the notices and indicator
  (MEE FR-42 to FR-48); participants can switch on captions, translated if they choose (MEE FR-52, FR-53).
- **FR-38** The app MUST show the agenda, open the shared notes page, and let hosts edit and approve the summary,
  decisions and action items (MEE FR-57 to FR-62).
- **FR-39** The app MUST offer the recording library, transcripts with search, jump and corrections, and clips (MEE
  FR-56, FR-63, FR-64).
- **FR-40** A person can start or schedule a meeting from the app's task, project and team pages, see their sessions
  there and log attended minutes to the task (MEE FR-34, FR-38, FR-39, FR-66).
- **FR-41** The app MUST keep a call in a floating window (picture-in-picture on web and phones, always on top on the
  desktop) with mute, camera, hand, leave and a line of live captions, while the person works on a task, chat or a
  page. *(advanced)*

### 3.4 Calendar

- **FR-42** With the platform's calendar on, the existing Calendar page (the member time calendar) MUST gain an events
  layer by day, work week, week, month and agenda, shown beside the time entries with a layer switch, its time-log
  view, moving and splitting kept as they are (CAL FR-50 to FR-56); the layer list is shared with the attendance, shift,
  time-off and holiday layers of `people-self-service`.
- **FR-43** A person can show, hide, colour, order, create and share calendars (CAL FR-6 to FR-16).
- **FR-44** A person can create events by range, quick add or full form (time zones, all-day, private, draft, room,
  Docs attachments), move and resize them, and edit repeats for this, following or all (CAL FR-17 to FR-31).
- **FR-45** A person can invite colleagues, teams and contacts, send, answer with a comment from the event, the
  notification, mail or chat, and propose a time (CAL FR-32 to FR-43).
- **FR-46** A person can override working hours, set a work location, read free/busy and set reminders (CAL FR-44 to
  FR-49, FR-57 to FR-60), and book rooms with filters, approval state, capacity warnings and check-in (CAL FR-61 to
  FR-67).
- **FR-47** A person can manage booking links and bookings, connect outside calendars, feeds and imports, and name their
  addresses (CAL FR-69, FR-81, FR-88 to FR-98); task and project pages show their events; search finds events (CAL
  FR-83, FR-84, FR-99).
- **FR-48** The app MUST offer the scheduling assistant, focus time, meeting load and the discussion check (CAL FR-100 to
  FR-108); the existing meeting scheduler creates calendar events when the calendar is on.

### 3.5 Mail

- **FR-49** The existing Inbox MUST offer a Mail view: all mailboxes, conversations, messages in the Inbox's existing
  isolated e-mail view, delivery states and record links (MAIL FR-6 to FR-19).
- **FR-50** A person can use folders, labels, stars, snooze, mute and junk, and in shared mailboxes assign, set state,
  comment internally and see who else replies (MAIL FR-20 to FR-29, FR-53 to FR-55, FR-68 to FR-73).
- **FR-51** A person can compose with suggested recipients, Docs and record attachments, identities, signatures,
  drafts, scheduling, undo and pre-send warnings (MAIL FR-30 to FR-42).
- **FR-52** A person can search mail, keep rules and automatic replies, preview and save attachments to Docs, allow
  remote content, save senders as contacts and answer invitations (MAIL FR-46 to FR-52, FR-59 to FR-67).
- **FR-53** The app MUST offer triage, summaries, suggested replies, nudges, "turn into a task" and mail shortcuts
  (MAIL FR-86 to FR-91, FR-96).

### 3.6 Files in Docs

- **FR-54** The existing Docs area MUST show files next to pages in its one tree and gain the drive views: Home
  (Recent from the server merged with the recent pages the device keeps today, Favourites, Shared with me, team
  spaces) and folders as list or grid, with view settings
  kept on the server and live updates (DRV FR-19, FR-50 to FR-52, FR-62, FR-81).
- **FR-55** A person can upload resumably with progress, upload folders and camera photos, resolve name clashes, save
  links and create items of every registered kind (DRV FR-5 to FR-10, FR-76).
- **FR-56** A person can move, copy, rename, transfer ownership, act in bulk with per-item results and zip (DRV FR-8,
  FR-11, FR-12, FR-70, FR-71).
- **FR-57** The share dialog MUST offer the five levels, inheritance, restriction, outside recipients with expiry and the
  access panel; links and file requests carry password, expiry, limits and receipts (DRV FR-13 to FR-31).
- **FR-58** A person can preview files, see thumbnails and manage versions in the existing versions panel; the existing
  Docs trash (archived items) MUST gain restore, delete forever, empty and retention labels and holds (DRV FR-32 to
  FR-48).
- **FR-59** A person can search with filters, ask a folder with citations through the platform's assistant, see
  duplicates and their quota (DRV FR-53 to FR-59).
- **FR-60** The existing files panels on the app's task and project pages MUST show Docs files with "attached to
  records" and "create from this file" (DRV FR-64 to FR-69); settings show the network-drive address (DRV FR-72).

### 3.7 Documents and wiki

- **FR-61** The docs editor MUST add four heading levels with a contents block, font, colour and spacing, image captions
  and alternative text, allowed embeds, diagrams, tabs and print settings (DOC FR-5 to FR-12).
- **FR-62** Docs MUST open pages live where the space says so and keep unsaved edits 7 days (DOC FR-13, FR-14).
- **FR-63** Docs MUST offer comment filters, team mentions, suggestion mode with accept and reject and the suggestions
  panel (DOC FR-15 to FR-20), and named versions, compare, block restore, origins and space history (DOC FR-21 to FR-25).
- **FR-64** Docs MUST offer the platform's templates on the existing Docs home, tasks from task items, meeting notes,
  DOCX, HTML and ODT export and DOCX import (DOC FR-26 to FR-34).
- **FR-65** Docs MUST offer wiki spaces with switcher and pins, sidebar sections and links, page addresses, double-bracket links
  and backlinks with broken links (DOC FR-35 to FR-43, FR-80).
- **FR-66** Docs MUST offer proposals (propose, submit, review, merge) and one review queue (DOC FR-44 to FR-50).
- **FR-67** Docs MUST offer page settings, owners, review dates, verification, properties with sub-page views, the
  publish switch, feedback for owners, writing help in the existing editor assist, questions with citations, digests
  and print (DOC FR-51 to FR-56, FR-66, FR-67, FR-72 to FR-77, FR-81).

### 3.8 Discussions, workbooks and decks

- **FR-68** Ever Teams shows a link to the Gauzy web app for discussions.
- **FR-69** Ever Teams shows a link to the Gauzy web app for discussion digests, decisions and summaries.
- **FR-70** Ever Teams shows a link to the Gauzy web app for workbook editing (workbooks are listed in Docs and open
  there).
- **FR-71** Ever Teams shows a link to the Gauzy web app for deck editing and viewing (decks are listed in Docs and open
  there).
- **FR-72** Ever Teams shows a link to the Gauzy web app for presenting decks with a phone as remote.
- **FR-73** Ever Teams shows a link to the Gauzy web app for deck audience sessions.

### 3.9 One composer and summary view *(advanced)*

- **FR-74** The app MUST use one composer for chat messages, task and page comments and mail replies, with the same
  formatting, mentions, emoji, device or Docs files, record cards, voice clips, server drafts per place and send keys;
  what a target cannot take (a card in mail) becomes a link, with a notice. *(advanced)*
- **FR-75** The existing Inbox MUST offer a Summary view: chat mentions and direct messages, thread replies, inbox
  entries, mail needing a reply, page comments and suggestions and meeting summaries to approve, by relevance or time,
  each answered or closed in place in its source's own state, with no second page or count. *(advanced)*
- **FR-76** The Summary view MUST show on request the platform's summaries of the period side by side (CM FR-120, MAIL FR-87)
  with links, sending nothing. *(advanced)*
- **FR-77** A person can reply to a chat message or a mail and mark it read from the notification, queued offline.

### 3.10 Capture, sharing and offline *(advanced)*

- **FR-78** The app MUST be a share target on phones and desktops for text, links, photos and files, picking a
  conversation, a task (attachment or comment), a new task, a page or a Docs folder with a caption, sent through the
  share route (CA FR-34) or an upload, queued offline. *(advanced)*
- **FR-79** The desktop app MUST offer a global capture hotkey for text, a region screenshot or the clipboard, sent to a
  task (the running timer's preselected), a conversation, a page or a Docs folder. *(advanced)*
- **FR-80** A person can hand a message's text, link and files, or a Docs link, to the share sheet (CA FR-35).
- **FR-81** A person can keep pages and files offline on a device with version and age: readable, pages editable (live
  pages merge, others use the conflict notice), synced in the background (DOC FR-14). *(advanced)*
- **FR-82** The app MUST show space used by offline items and media, warn at 80 % of the person's budget, keep unsent
  items, and remove the account's offline data at sign-out after the unsent prompt of `people-self-service`.

### 3.11 Notifications, live updates and other clients

- **FR-83** The app MUST push per kind (message, mention, reply, call, invitation, reminder, mail, share, review,
  proposal) with a grouping key and a silent clear when read elsewhere (CA FR-36): on the web through the existing push
  devices, on phones and desktops through the device registration answer of `people-self-service`.
- **FR-84** Every area MUST refresh through the shared real-time client; without it each keeps its documented polling,
  never while hidden.
- **FR-85** Notifications, links and search hits MUST open their exact target in any area even when the app was closed.
- **FR-86** The mobile app MUST ship chat, the inbox with its Summary view, calendar agenda with answers, meeting join
  and Docs with files offline and page reading with basic editing natively, the Mail view as web screens inside the
  app, signing in through the platform's native client sign-in (CA FR-27, FR-39, FR-44).
- **FR-87** The desktop app MUST add a tray badge, native notifications with reply, call ringing, the always-on-top call
  window and the capture hotkey to the web screens.
- **FR-88** The browser extension MUST show the unread count and share the current page to a conversation, task or page.
- **FR-89** Every string MUST be in every web locale and mobile table, with right-to-left layouts and system events in
  the reader's language (CA FR-46).
- **FR-90** Every gesture MUST have a button equivalent, every area be keyboard operable with screen-reader labels,
  calls captioned on request, and motion reduced when the person asks.

## 4. Non-Functional Requirements

- **Performance**: a conversation opens with 50 messages under 1 s warm, 300 ms from the device cache; the Summary view
  under 1.5 s with 200 items; the Calendar events layer under 1 s for a month; a day of chat changes over 300
  conversations synced under 3 s on 4G; a 50-page space kept offline under 30 s on broadband.
- **Reliability**: no message, comment, reply or share lost across restarts or reconnects; each sent once by its key;
  downloads resume; live updates resume after a reconnect; one failing area never blanks another.
- **Security & privacy**: web tokens server-side, the secure store on mobile and desktop; offline data encrypted on
  phones and removed at sign-out; mail bodies only in the isolated frame; no media, captions or text leave for a
  service the platform did not choose; share targets accept only what the person handed over.
- **Accessibility**: keyboard operation, screen-reader labels, captions and transcripts, contrast, reduced motion.
- **Compatibility**: every web locale and mobile language; current browsers, the desktop app and the mobile app's
  supported versions; areas whose platform feature is absent are hidden.

## 5. Key Entities & Domain Concepts

| Entity / concept | Description |
| ---------------- | ----------- |
| `WorkspaceArea` | One area or depth (chat, meetings, calendar events, mail, files, wiki) and its availability |
| `ClientState`, `RightsAnswer` | The shared state banner; the platform's allowed actions on one conversation or item |
| `InboxView` | A view of the existing Inbox: Mail, Summary (and Decisions of `people-self-service`) |
| `CalendarLayer` | The events layer of the existing Calendar page, beside time entries and the layers of `people-self-service` |
| `ChatCache`, `OfflineSend` | Synced conversations with cursor and local index; a message written offline, a kind of the app's offline queue |
| `ComposerDraft` | The one composer's unsent text and files for one place |
| `SummaryItem` | One thing waiting for the person, with its source, state and in-place action |
| `CallWindow` | The floating window of a running call with its captions line |
| `ShareIntent` | Content handed over by another app or the capture hotkey, with its destination |
| `OfflineItem` | A page or file kept on the device, with version, age and sync state |

## 6. Out of Scope

- Records, rules, endpoints and delivery: the platform specs in the header. Organization administration of chat,
  meetings, calendar, mail, drive and wiki stays on the platform's settings pages (`chat-administration-and-clients`,
  `meetings`, `calendar-and-scheduling`, `mail`, `drive`, `documents-and-wiki`); public pages (guest joins, booking,
  public links) are the platform's.
- Discussions, workbook and deck editing, presenting and audience sessions: the Gauzy web app.
- Anything commerce-, CRM- or helpdesk-specific: the Gauzy web app.
- The whiteboard and the Assistant page stay as they are; the Assistant page is the person's private conversation with
  the assistant, while agent conversations in chat are shared with the channel's members, so both stay and use the
  platform's same agents. Time, attendance and leave are `people-self-service`.

## 7. Acceptance Criteria

- [ ] **AC-1** Flag off: chat, docs, inbox, meetings, whiteboard and calendar unchanged; on: areas follow FR-2.
- [ ] **AC-2** Chat depth (sections, modes, people, composer, Saved, Scheduled, polls, search, Activity, status, agents
      with plan and undo, cards, actions) works between two users on web and phone (FR-8, FR-16, FR-18, FR-23).
- [ ] **AC-3** A day offline syncs from the cursor with deletions; local search works; offline sends show their time (FR-31).
- [ ] **AC-4** A call from a conversation rings a phone, joins the platform room and posts its card and thread links (FR-29, FR-33).
- [ ] **AC-5** Lobby, guest join, host controls, recording notice, captions, summary approval and old links work (FR-33, FR-35, FR-38).
- [ ] **AC-6** Calendar events show as a layer of the existing time-log calendar with time entries unchanged; an
      invitation is answered from its notification; a room is booked (FR-42).
- [ ] **AC-7** Mail opens as a view of the Inbox with the person's rights; discussions, workbooks and decks open in the
      Gauzy web app, else show where to open them (FR-6, FR-70).
- [ ] **AC-8** Files in Docs: resumable upload, inherited sharing, versions, the one trash and record panels on task
      pages; no second documents area exists (FR-55, FR-58, FR-60).
- [ ] **AC-9** Docs: suggestions, compare, templates, wiki double-bracket links and a proposal merged after review (FR-63, FR-65, FR-66).
- [ ] **AC-10** One composer posts in chat, on a task, a page and a mail reply (advanced: composer; FR-74, FR-77).
- [ ] **AC-11** The Inbox Summary view lists every source; answering one updates that source (advanced: summary view; FR-75, FR-76).
- [ ] **AC-12** A call stays in the floating window with captions while a task is edited (advanced: picture-in-picture; FR-41).
- [ ] **AC-13** A gallery photo lands on a task; the hotkey sends a screenshot to the timer's task (advanced: capture; FR-78, FR-79).
- [ ] **AC-14** A space and a file kept offline open without a connection and sync after (advanced: offline documents; FR-81, FR-82).
- [ ] **AC-15** Maintenance, outdated client, data-loss rules, guests and blocked notifications degrade as specified (FR-4, FR-27, FR-28).
- [ ] **AC-16** The mobile app passes AC-2 to AC-4, AC-6, AC-8 and AC-11 for its native screens (plan §8) (FR-86).
- [ ] **AC-17** With the feature off, and with the feature on and default settings, every existing page, route, field, permission and report behaves as today (FR-1, FR-2).
- [ ] Every new string present in every locale file
- [ ] Behind the runtime flag; nothing changes while it is off
- [ ] All functional requirements have a passing test

## 8. Open Questions

- Phone and desktop push reuse the answer of `people-self-service` (a device kind on the inbox push devices), while
  `chat-administration-and-clients` FR-36 names the device registry of `email-and-communications`; applied default:
  one registration per device on whichever the platform exposes first.
- The Gauzy web app address for discussions, workbooks and decks comes from the runtime config of
  `people-self-service`; applied default: without it those items show without an open action.
- Meetings keep this app's room screens over platform tokens (applied).
- Mobile native scope as FR-86 (applied); offline chat keeps the platform's 200 newest messages per conversation.

## 9. Constitution Gates

- [x] I Platform API is the backend — platform records and endpoints; proxies; no platform UI package is consumed.
- [x] II Layered web app — services, hooks, stores, components, pages per area.
- [x] III Every string translated — web locales and mobile tables, right-to-left.
- [x] IV Runtime config; default-off flag; nothing removed — one new flag; existing flags, pages and token routes kept
      and extended in place.
- [x] V One design system — common wrappers, tokens, central icons.
- [x] VI Security and privacy — server-side tokens, encrypted offline data, isolated mail frame, no unlisted outbound call.
- [x] VII Real-time through the platform channel — one shared client for every area.
- [x] VIII Multi-client parity stated — web, desktop, mobile and extension in §1, FR-86 to FR-88 and the plan.
- [x] IX Tests and gates — hooks, sync, composer, Summary view, share target, pages.
- [x] X Behaviour-first (this document).
- [x] XI Documentation describes our product only.

## 10. References

- Platform specs (Ever Gauzy repository, `docs/specs/features/`): [`chat-messaging`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/chat-messaging/spec.md), [`chat-agents-and-record-actions`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/chat-agents-and-record-actions/spec.md),
  [`chat-administration-and-clients`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/chat-administration-and-clients/spec.md), [`meetings`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/meetings/spec.md), [`calendar-and-scheduling`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/calendar-and-scheduling/spec.md), [`mail`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/mail/spec.md), [`drive`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/drive/spec.md), [`documents-and-wiki`](https://github.com/ever-co/ever-gauzy/blob/develop/docs/specs/features/documents-and-wiki/spec.md)
- Related features: [`chat`](../chat/spec.md), [`docs`](../docs/spec.md), [`inbox`](../inbox/spec.md), [`realtime-client`](../realtime-client/spec.md), [`comments-and-trash`](../comments-and-trash/spec.md), [`people-self-service`](../people-self-service/spec.md)
- Existing code: `apps/web/app/[locale]/(main)/{chat,docs,inbox,meet,calendar}/`, `apps/web/core/components/pages/{chat,docs,inbox,meet}/`,
  `apps/web/core/components/calendar/calendar-page.tsx`, `apps/web/core/components/common/entity-files/`,
  `apps/web/core/lib/realtime/`, `apps/server-web/`, `apps/mobile/app/navigators/`
