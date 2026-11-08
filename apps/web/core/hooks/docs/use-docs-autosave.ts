'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { docsService } from '@/core/services/client/api/docs';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { DOCS_CONTENT_MAX_BYTES, type IDocumentNode, type IDocumentPage } from '@/core/types/interfaces/common/docs';
import { useDocsScope } from './use-docs-scope';

/** The content saves this long after the last keystroke. */
export const DOCS_AUTOSAVE_DELAY_MS = 2_000;

/**
 * Where a page's text stands between the editor and the platform.
 * `dirty` → `saving` → `saved`; `conflict` when someone else saved first (409); `locked` when the page was locked
 * (423); `too-large` when the text passed the platform's limit; `error` for anything else, retried on the next
 * change or by `flush`.
 */
export type DocsSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'conflict' | 'locked' | 'too-large' | 'error';

interface Draft {
	html: string;
	json: IDocumentNode | null;
	mentionEmployeeIds: string[];
}

const EMPTY_DOC: IDocumentNode = { type: 'doc', content: [{ type: 'paragraph' }] };

/**
 * The page's own writes made elsewhere on this page (a title, an icon, a move): the clock they moved from and to.
 * Autosave follows such a move even with a draft pending — it is not someone else's change — so the next save
 * states the current clock instead of meeting a conflict with the person's own edit.
 */
const localWrites = new Map<string, { from: string; to: string }>();

export function noteLocalWrite(pageId: string, from: string | null | undefined, to: string | null | undefined): void {
	if (from && to && from !== to) localWrites.set(pageId, { from, to });
}

/** What the editors of a page render from its session. */
interface SessionView {
	state: DocsSaveState;
	/** A draft kept from an earlier visit: the editor opens with it rather than the platform's text. */
	restoredHtml: string | null;
}

/**
 * Everything this tab holds of one page's text, whichever editor typed it: the draft, the clock its next save states,
 * where it stands, and the one save that may run. The editors of the page are views onto it. An editor that leaves
 * hands nothing over and keeps nothing: the session saves on its own, and the editor that comes back (or another one)
 * sees the same draft, clock and state. So a page's text is saved one save at a time, always the latest draft at the
 * latest clock this tab wrote, and a draft whose save fails stays until it is saved, reloaded or dropped.
 */
interface PageSession {
	/** The account and the page (see `sessionKey`). */
	key: string;
	pageId: string;
	/** Dropped with every session of its account (another account signed in, or this one signed out): it does nothing more. */
	dropped: boolean;
	/** The text typed and not saved yet. */
	draft: Draft | null;
	/** The clock the next save states: the page version the draft builds on (moved by this tab's own writes only). */
	base: string | null;
	view: SessionView;
	/** A save of the page is running. */
	saving: boolean;
	/** A save asked while one ran: it goes when that one ends, forcing the snapshot when Keep Mine asked for it. */
	queued: { force: boolean } | null;
	/** The autosave delay after the last keystroke, or a queued save about to go. */
	timer: ReturnType<typeof setTimeout> | null;
	/** Writes a landed save into the query cache (the last editor's client and scope, for a save that lands after it left). */
	applySaved: ((saved: IDocumentPage, draft: Draft, latest: boolean) => void) | null;
	/** The editors showing the page. */
	views: Set<() => void>;
}

/** The page sessions of the signed-in account, by `sessionKey`. */
const sessions = new Map<string, PageSession>();
const IDLE_VIEW: SessionView = { state: 'idle', restoredHtml: null };
/** The account the sessions belong to: a draft is never shown to, nor saved for, another account. */
let sessionsAccount: string | null = null;

/** A session belongs to one account and one page: another account never finds it. */
function sessionKey(userId: string, pageId: string): string {
	return `${userId}:${pageId}`;
}

function sessionOf(userId: string, pageId: string, clock: string | null): PageSession {
	if (sessionsAccount !== userId) {
		// Another account in this tab: the previous account's drafts, timers and queued saves go before anything is shown.
		forgetDocsDrafts();
		sessionsAccount = userId;
	}
	const key = sessionKey(userId, pageId);
	let session = sessions.get(key);
	if (!session) {
		session = { key, pageId, dropped: false, draft: null, base: clock, view: IDLE_VIEW, saving: false, queued: null, timer: null, applySaved: null, views: new Set() };
		sessions.set(key, session);
		syncUnloadGuard();
	}
	return session;
}

/**
 * Drops every page session of this tab with its draft, timer and queued save (a save already sent settles nowhere):
 * when the person signs out, and before another account's first page. Unsaved Docs text is not carried across
 * accounts on a shared browser.
 */
export function forgetDocsDrafts(): void {
	for (const session of sessions.values()) {
		clearSessionTimer(session);
		session.dropped = true;
		session.draft = null;
		session.queued = null;
	}
	sessions.clear();
	sessionsAccount = null;
	syncUnloadGuard();
}

/** Whether clock `a` comes after clock `b` (ISO times; an unreadable one is not taken as later). */
function isLaterClock(a: string | null | undefined, b: string | null | undefined): boolean {
	if (!a || !b) return false;
	return Date.parse(a) > Date.parse(b);
}

/** Changes what the editors render, and tells them. */
function updateView(session: PageSession, patch: Partial<SessionView>): void {
	const next = { ...session.view, ...patch };
	if (next.state === session.view.state && next.restoredHtml === session.view.restoredHtml) return;
	session.view = next;
	for (const onChange of session.views) onChange();
}

function clearSessionTimer(session: PageSession): void {
	if (session.timer) clearTimeout(session.timer);
	session.timer = null;
}

/** A session with no editor, no text and no work left is forgotten (the next visit starts from the page). */
function releaseIfDone(session: PageSession): void {
	if (session.views.size || session.draft || session.saving || session.timer || session.queued) return;
	if (sessions.get(session.key) === session) sessions.delete(session.key);
	syncUnloadGuard();
}

/**
 * Saves the session's draft at its clock. While a save runs, another one is queued (keeping a forced snapshot) and goes
 * when it ends, with whatever the draft and the clock are then: the departed editor's text and the returning editor's
 * newer text are the same draft, so an older text never follows a newer one.
 */
async function saveSession(session: PageSession, options: { force?: boolean } = {}): Promise<boolean> {
	clearSessionTimer(session);
	if (session.dropped) return true;
	const draft = session.draft;
	if (!draft || !session.base) {
		releaseIfDone(session);
		return true;
	}
	if (session.saving) {
		session.queued = { force: Boolean(session.queued?.force || options.force) };
		return false;
	}
	if (byteLengthOf(draft.html) > DOCS_CONTENT_MAX_BYTES) {
		updateView(session, { state: 'too-large' });
		return false;
	}
	session.saving = true;
	updateView(session, { state: 'saving' });
	let outcome: { saved: IDocumentPage } | { failure: DocsSaveState };
	try {
		const saved = await docsService.updateContent(session.pageId, {
			contentJson: draft.json ?? EMPTY_DOC,
			contentHtml: draft.html,
			expectedUpdatedAt: session.base,
			forceSnapshot: options.force,
			mentionEmployeeIds: draft.mentionEmployeeIds
		});
		outcome = { saved };
	} catch (error) {
		outcome = { failure: saveStateFromError(error) };
	}
	session.saving = false;
	if (session.dropped) return false;
	if ('saved' in outcome) {
		const { saved } = outcome;
		// A later clock already followed (a version restored while this save ran) is kept: the page moved on since.
		if (!isLaterClock(session.base, saved.updatedAt)) session.base = saved.updatedAt;
		const latest = session.draft === draft;
		session.applySaved?.(saved, draft, latest);
		if (latest) {
			session.draft = null;
			// The restored text retires with the draft: the page (patched to the same text) reaches the editor again.
			updateView(session, { state: 'saved', restoredHtml: null });
		} else if (session.view.state === 'saving') {
			updateView(session, { state: 'dirty' });
		}
	} else {
		updateView(session, { state: outcome.failure });
		if (outcome.failure === 'conflict' || outcome.failure === 'locked') {
			// A refusal waits for the person's decision: an autosave asked meanwhile does not retry on its own, while a
			// Keep Mine asked meanwhile (a decision) still goes.
			clearSessionTimer(session);
			if (!session.queued?.force) session.queued = null;
		}
	}
	const queued = session.queued;
	session.queued = null;
	if (queued) session.timer = setTimeout(() => void saveSession(session, queued), 0);
	else releaseIfDone(session);
	return 'saved' in outcome;
}

/**
 * A reload's read of the page landed: the draft shown when it started (`shown`) is dropped now. Text typed meanwhile
 * builds on the version the person was shown: it saves on as usual when the page did not change, and waits as a
 * conflict when it did.
 */
function settleReload(session: PageSession, shown: Draft | null, clock: string): void {
	const typed = session.draft === shown ? null : session.draft;
	if (typed && clock !== session.base) {
		// Typed while the page was read again, and the page changed: that text builds on the version the person was
		// shown, so it keeps its clock and waits for the person's decision instead of saving over the update.
		clearSessionTimer(session);
		updateView(session, { state: 'conflict' });
		return;
	}
	session.base = clock;
	if (typed) {
		// The page did not change: the text typed meanwhile builds on it, and saves as any other.
		updateView(session, { state: 'dirty', restoredHtml: null });
		clearSessionTimer(session);
		session.timer = setTimeout(() => void saveSession(session), DOCS_AUTOSAVE_DELAY_MS);
		return;
	}
	session.draft = null;
	updateView(session, { state: 'idle', restoredHtml: null });
}

/**
 * The last editor of a page left. Text not saved stays in the session (the editor that comes back opens with it); it
 * is saved now unless it waits for the person's decision (a conflict, a lock). A save already running takes it next.
 */
function leaveSession(session: PageSession): void {
	if (session.views.size) return;
	if (!session.draft) {
		clearSessionTimer(session);
		releaseIfDone(session);
		return;
	}
	updateView(session, { restoredHtml: session.draft.html });
	if (session.view.state === 'conflict' || session.view.state === 'locked') {
		clearSessionTimer(session);
		return;
	}
	void saveSession(session);
}

let unloadListener: ((event: BeforeUnloadEvent) => void) | null = null;

/**
 * Leaving the tab with unsaved text warns, like any editor: for every page of this tab, not only the one on screen (a
 * page left with a departure save that failed, or still running, keeps its draft in its session). One listener for
 * the tab while any page session exists, removed with the last one: a session holding text or work is never released.
 */
function syncUnloadGuard(): void {
	if (typeof window === 'undefined') return;
	if (sessions.size && !unloadListener) {
		unloadListener = (event) => {
			for (const session of sessions.values()) {
				if (session.draft || session.saving) {
					event.preventDefault();
					return;
				}
			}
		};
		window.addEventListener('beforeunload', unloadListener);
	} else if (!sessions.size && unloadListener) {
		window.removeEventListener('beforeunload', unloadListener);
		unloadListener = null;
	}
}

/** What the editor is given of a page: its text and its JSON (checked for what the editor cannot carry). */
export interface EditorPageContent {
	html: string;
	json: IDocumentNode | null;
}

/**
 * The page content the editor is given. The editor replaces its text whenever this changes, and a JSON it cannot carry
 * turns the page read-only and drops the draft, so a refreshed page (another person's save, a live event) reaches it
 * only while nothing typed here is unsaved. With a draft open the editor keeps the person's text, and there is no page
 * JSON to check (the editor holds its own text): the draft's save meets the other version as a conflict, and the
 * page's JSON is checked once the draft is saved, reloaded or dropped. Another page is never held.
 */
export function useEditorPageContent(pageId: string | null, html: string, json: IDocumentNode | null, hasDraft: boolean): EditorPageContent {
	const [held, setHeld] = useState({ pageId, html });
	const holding = hasDraft && held.pageId === pageId;
	if (!holding && (held.pageId !== pageId || held.html !== html)) setHeld({ pageId, html });
	return holding ? { html: held.html, json: null } : { html, json };
}

function byteLengthOf(text: string): number {
	return typeof TextEncoder === 'undefined' ? text.length * 2 : new TextEncoder().encode(text).length;
}

/** What the platform's refusal of a save means for the page. */
export function saveStateFromError(error: unknown): DocsSaveState {
	if (ApiErrorService.isApiError(error)) {
		if (error.statusCode === 409) return 'conflict';
		if (error.statusCode === 423) return 'locked';
		if (error.statusCode === 413) return 'too-large';
	}
	return 'error';
}

/**
 * Autosave of one page's content with conflict detection: every save carries the page's last known `updatedAt`;
 * the platform refuses a stale one, and the person then reloads the page or keeps their text (saved on top, after
 * the platform captured the other version). A draft is never dropped on an error: it stays until a save succeeds
 * or the page is reloaded on purpose. The draft, the clock and the save live in the page's session (see
 * `PageSession`); this hook is one editor's view onto it.
 */
export function useDocsAutosave(page: IDocumentPage | null) {
	const queryClient = useQueryClient();
	const scope = useDocsScope();
	const pageId = page?.id ?? null;
	const userId = scope?.userId ?? null;
	const key = pageId && userId ? sessionKey(userId, pageId) : null;
	const clock = page?.updatedAt ?? null;
	const clockRef = useRef(clock);
	clockRef.current = clock;

	const subscribe = useCallback(
		(onChange: () => void) => {
			if (!pageId || !userId) return () => undefined;
			const session = sessionOf(userId, pageId, clockRef.current);
			// Nothing kept from an earlier visit: this visit starts from the page.
			if (!session.draft && !session.saving) {
				session.base = clockRef.current;
				updateView(session, IDLE_VIEW);
			}
			session.views.add(onChange);
			return () => {
				session.views.delete(onChange);
				leaveSession(session);
			};
		},
		[pageId, userId]
	);
	const view = useSyncExternalStore(
		subscribe,
		() => (key ? (sessions.get(key)?.view ?? IDLE_VIEW) : IDLE_VIEW),
		() => IDLE_VIEW
	);
	const current = useCallback(() => (key ? (sessions.get(key) ?? null) : null), [key]);

	// A landed save goes into the cache through the last editor's client and scope (also when it lands after it left).
	useEffect(() => {
		const session = current();
		if (!session) return;
		session.applySaved = (saved, draft, latest) => {
			// The saved text goes into the cache only while it is still the latest: an older draft fed back into the page
			// would replace what the person typed since.
			const patch = latest
				? { updatedAt: saved.updatedAt, version: saved.version, contentHtml: draft.html, contentJson: draft.json ?? EMPTY_DOC }
				: { updatedAt: saved.updatedAt, version: saved.version };
			// A page the cache already holds at a later clock (a version restored while this save ran) is not rolled back.
			queryClient.setQueryData<IDocumentPage>(queryKeys.docs.page(scope?.tenantId, saved.id), (cached) =>
				cached && !isLaterClock(cached.updatedAt, saved.updatedAt) ? { ...cached, ...patch } : cached
			);
			queryClient.setQueryData<IDocumentPage[]>(queryKeys.docs.tree(scope?.tenantId, scope?.organizationId), (cached) =>
				cached
					? cached.map((item) =>
							item.id === saved.id && !isLaterClock(item.updatedAt, saved.updatedAt) ? { ...item, updatedAt: saved.updatedAt, version: saved.version } : item
						)
					: cached
			);
		};
	}, [current, queryClient, scope?.organizationId, scope?.tenantId]);

	// The platform's clock moved while nothing was pending (a reload, a restore), or by the page's own metadata write
	// (a title): follow it. A kept draft keeps the clock it was written against, so an update someone else made since
	// meets it as a conflict.
	useEffect(() => {
		const session = current();
		if (!session || !clock) return;
		const own = localWrites.get(session.pageId);
		if (own?.to === clock) {
			localWrites.delete(session.pageId);
			if (session.base === own.from) {
				session.base = own.to;
				return;
			}
		}
		if (session.view.state === 'idle' || session.view.state === 'saved') session.base = clock;
	}, [clock, current]);

	/** The editor changed: keep the draft and save it after the delay. */
	const change = useCallback(
		(html: string, json: IDocumentNode | null, mentionEmployeeIds: string[] = []) => {
			const session = current();
			if (!session) return;
			session.draft = { html, json, mentionEmployeeIds };
			// A conflict or a lock waits for the person's decision; a new keystroke must not retry on its own.
			if (session.view.state === 'conflict' || session.view.state === 'locked') return;
			updateView(session, { state: 'dirty' });
			clearSessionTimer(session);
			session.timer = setTimeout(() => void saveSession(session), DOCS_AUTOSAVE_DELAY_MS);
		},
		[current]
	);

	/** Drops the draft and shows the platform's text. */
	const reload = useCallback(async () => {
		const session = current();
		if (!session || !pageId) return;
		clearSessionTimer(session);
		session.queued = null;
		// The draft shown is dropped once the page is read again, not before: a read that fails keeps it (and the tab's
		// unload warning), with anything typed meanwhile.
		const shown = session.draft;
		const base = session.base;
		const fresh = await queryClient.fetchQuery({
			queryKey: queryKeys.docs.page(scope?.tenantId, pageId),
			queryFn: ({ signal }) => docsService.getPage(pageId, signal),
			staleTime: 0
		});
		if (session.base !== base) {
			// A save of this tab landed during the read (a Keep Mine): its text and clock are newer than what was read.
			void queryClient.invalidateQueries({ queryKey: queryKeys.docs.page(scope?.tenantId, pageId) });
			return;
		}
		settleReload(session, shown, fresh.updatedAt);
	}, [current, pageId, queryClient, scope?.tenantId]);

	/** Keeps the draft on top of the other version, which the platform captures first. */
	const keepMine = useCallback(async () => {
		const session = current();
		if (!session || !pageId || !session.draft) return;
		const fresh = await docsService.getPage(pageId);
		session.base = fresh.updatedAt;
		await saveSession(session, { force: true });
	}, [current, pageId]);

	/** Saves now (a Cmd+S, leaving the page). */
	const flushNow = useCallback(async () => {
		const session = current();
		return session ? saveSession(session) : true;
	}, [current]);

	/**
	 * Drops the pending draft and its timer without saving (a version is being restored, or the page turned out to
	 * be read-only): the next platform clock is followed again.
	 */
	const discard = useCallback(() => {
		const session = current();
		if (!session) return;
		clearSessionTimer(session);
		session.draft = null;
		session.queued = null;
		updateView(session, { state: 'idle', restoredHtml: null });
	}, [current]);

	const hasDraft = useCallback(() => Boolean(current()?.draft), [current]);

	// Effects run in the browser only: the tab guard follows the page sessions (added with the first, removed with the last).
	useEffect(() => {
		syncUnloadGuard();
		return syncUnloadGuard;
	}, []);

	return { state: view.state, change, flushNow, reload, keepMine, discard, restoredHtml: view.restoredHtml, hasDraft };
}
