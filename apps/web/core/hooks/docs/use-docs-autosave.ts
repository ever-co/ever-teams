'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

/**
 * Drafts the person has not decided on (a conflict, a lock) when they leave the page inside the app, and drafts whose
 * departure save has not landed yet: kept for when they come back, so leaving never throws their text away. `base` is
 * the clock the draft was written against: a draft taken back states it again, so an update someone else made in the
 * meantime meets it as a conflict instead of being overwritten.
 */
const retainedDrafts = new Map<string, { draft: Draft; state: DocsSaveState; base: string | null }>();

/** How a save of a page's content ended: the clock it stated, the one it got (a success) or why it was refused. */
interface SaveOutcome {
	draft: Draft;
	from: string;
	to: string | null;
	failure: DocsSaveState | null;
}

/**
 * Pages whose content is being saved in this tab, by any editor (one left behind while its departure save runs
 * included): another save of the same page waits for it, so the same text is never sent twice and no save meets this
 * tab's own write as a conflict.
 */
const savingPages = new Set<string>();
/** The editors of each page in this tab: every save outcome of the page reaches them all. */
const saveListeners = new Map<string, Set<(outcome: SaveOutcome) => void>>();

/**
 * A save of a page settled: the kept copy of its draft goes once saved, or carries the refusal (the person sees why
 * when they come back); a newer kept draft follows this tab's own write; and every editor of the page hears it.
 */
function settleSave(pageId: string, outcome: SaveOutcome): void {
	const kept = retainedDrafts.get(pageId);
	if (kept?.draft === outcome.draft) {
		if (outcome.failure) retainedDrafts.set(pageId, { ...kept, state: outcome.failure });
		else retainedDrafts.delete(pageId);
	} else if (kept && outcome.to && kept.base === outcome.from) {
		retainedDrafts.set(pageId, { ...kept, base: outcome.to });
	}
	for (const listener of [...(saveListeners.get(pageId) ?? [])]) listener(outcome);
}

/** What the editor is given of a page: its text and its JSON (checked for what the editor cannot carry). */
export interface EditorPageContent {
	html: string;
	json: IDocumentNode | null;
}

/**
 * The page content the editor is given. The editor replaces its text whenever this changes, and a JSON it cannot carry
 * turns the page read-only (dropping the draft), so a refreshed page (another person's save, a live event) reaches it
 * only while nothing typed here is unsaved: with a draft open the person's text stays on screen, and the draft's save
 * then meets the other version as a conflict. Another page is never held.
 */
export function useEditorPageContent(pageId: string | null, html: string, json: IDocumentNode | null, hasDraft: boolean): EditorPageContent {
	const [held, setHeld] = useState({ pageId, html, json });
	const holding = hasDraft && held.pageId === pageId;
	if (!holding && (held.pageId !== pageId || held.html !== html || held.json !== json)) setHeld({ pageId, html, json });
	return holding ? { html: held.html, json: held.json } : { html, json };
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
 * or the page is reloaded on purpose.
 */
export function useDocsAutosave(page: IDocumentPage | null) {
	const queryClient = useQueryClient();
	const scope = useDocsScope();
	const pageId = page?.id ?? null;
	const [state, setState] = useState<DocsSaveState>('idle');
	const expectedRef = useRef<string | null>(page?.updatedAt ?? null);
	const draftRef = useRef<Draft | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const inFlightRef = useRef(false);
	const pendingRef = useRef(false);
	const stateRef = useRef<DocsSaveState>('idle');
	stateRef.current = state;
	/** The page this editor shows now (an outcome of a page it left only moves on what it still has to save). */
	const pageIdRef = useRef(pageId);
	pageIdRef.current = pageId;
	const flushRef = useRef<(options?: { force?: boolean }) => Promise<boolean>>(async () => true);
	/** A draft kept from an earlier visit: the editor opens with it rather than the platform's text. */
	const [restoredHtml, setRestoredHtml] = useState<string | null>(null);

	const clearTimer = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = null;
	}, []);

	// Another page: forget the previous one's draft and clock — unless this page has an undecided draft kept from an
	// earlier visit, which comes back with its state.
	useEffect(() => {
		expectedRef.current = page?.updatedAt ?? null;
		pendingRef.current = false;
		const retained = pageId ? retainedDrafts.get(pageId) : undefined;
		if (pageId && retained) {
			retainedDrafts.delete(pageId);
			draftRef.current = retained.draft;
			if (retained.base) expectedRef.current = retained.base;
			setRestoredHtml(retained.draft.html);
			// Its departure save may still be running: this editor hears how it ends (and saves nothing meanwhile). The state
			// is read at once by the clock effect below, which must not replace the kept clock with the page's.
			const restored = retained.state === 'dirty' && savingPages.has(pageId) ? 'saving' : retained.state;
			stateRef.current = restored;
			setState(restored);
		} else {
			draftRef.current = null;
			setRestoredHtml(null);
			stateRef.current = 'idle';
			setState('idle');
		}
		return clearTimer;
	}, [clearTimer, pageId]);

	// The platform's clock moved while nothing was pending (a reload, a restore), or by the page's own metadata write
	// (a title): follow it.
	useEffect(() => {
		if (!page?.updatedAt) return;
		const own = pageId ? localWrites.get(pageId) : undefined;
		if (pageId && own && own.to === page.updatedAt) {
			localWrites.delete(pageId);
			if (expectedRef.current === own.from) {
				expectedRef.current = own.to;
				return;
			}
		}
		if (stateRef.current === 'idle' || stateRef.current === 'saved') expectedRef.current = page.updatedAt;
	}, [page?.updatedAt, pageId]);

	const applySaved = useCallback(
		(saved: IDocumentPage, draft: Draft) => {
			expectedRef.current = saved.updatedAt;
			// The saved text goes into the cache only while it is still the latest: an older draft fed back into the page
			// would replace what the person typed since.
			const latest = draftRef.current === draft;
			const patch = latest
				? { updatedAt: saved.updatedAt, version: saved.version, contentHtml: draft.html, contentJson: draft.json ?? EMPTY_DOC }
				: { updatedAt: saved.updatedAt, version: saved.version };
			queryClient.setQueryData<IDocumentPage>(queryKeys.docs.page(scope?.tenantId, saved.id), (current) =>
				current ? { ...current, ...patch } : current
			);
			queryClient.setQueryData<IDocumentPage[]>(queryKeys.docs.tree(scope?.tenantId, scope?.organizationId), (current) =>
				current ? current.map((item) => (item.id === saved.id ? { ...item, updatedAt: saved.updatedAt, version: saved.version } : item)) : current
			);
		},
		[queryClient, scope?.organizationId, scope?.tenantId]
	);

	const flush = useCallback(
		async (options: { force?: boolean } = {}): Promise<boolean> => {
			clearTimer();
			const draft = draftRef.current;
			if (!draft || !pageId || !expectedRef.current) return true;
			// One save of a page at a time in this tab (an editor left behind may still be saving it): this one waits.
			if (inFlightRef.current || savingPages.has(pageId)) {
				pendingRef.current = true;
				return false;
			}
			const from = expectedRef.current;
			if (byteLengthOf(draft.html) > DOCS_CONTENT_MAX_BYTES) {
				setState('too-large');
				settleSave(pageId, { draft, from, to: null, failure: 'too-large' });
				return false;
			}
			inFlightRef.current = true;
			savingPages.add(pageId);
			setState('saving');
			let outcome: SaveOutcome;
			try {
				const saved = await docsService.updateContent(pageId, {
					contentJson: draft.json ?? EMPTY_DOC,
					contentHtml: draft.html,
					expectedUpdatedAt: from,
					forceSnapshot: options.force,
					mentionEmployeeIds: draft.mentionEmployeeIds
				});
				applySaved(saved, draft);
				if (draftRef.current === draft) {
					draftRef.current = null;
					setRestoredHtml(null);
					setState('saved');
				}
				outcome = { draft, from, to: saved.updatedAt, failure: null };
			} catch (error) {
				const failure = saveStateFromError(error);
				setState(failure);
				outcome = { draft, from, to: null, failure };
			}
			inFlightRef.current = false;
			savingPages.delete(pageId);
			settleSave(pageId, outcome);
			if (pendingRef.current) {
				pendingRef.current = false;
				timerRef.current = setTimeout(() => void flushRef.current(), 0);
			}
			return outcome.failure === null;
		},
		[applySaved, clearTimer, pageId]
	);
	flushRef.current = flush;

	/** The editor changed: keep the draft and save it after the delay. */
	const change = useCallback(
		(html: string, json: IDocumentNode | null, mentionEmployeeIds: string[] = []) => {
			draftRef.current = { html, json, mentionEmployeeIds };
			const current = stateRef.current;
			// A conflict or a lock waits for the person's decision; a new keystroke must not retry on its own.
			if (current === 'conflict' || current === 'locked') return;
			setState('dirty');
			clearTimer();
			timerRef.current = setTimeout(() => void flush(), DOCS_AUTOSAVE_DELAY_MS);
		},
		[clearTimer, flush]
	);

	/** Drops the draft and shows the platform's text. */
	const reload = useCallback(async () => {
		clearTimer();
		draftRef.current = null;
		pendingRef.current = false;
		if (!pageId) return;
		const fresh = await queryClient.fetchQuery({
			queryKey: queryKeys.docs.page(scope?.tenantId, pageId),
			queryFn: ({ signal }) => docsService.getPage(pageId, signal),
			staleTime: 0
		});
		expectedRef.current = fresh.updatedAt;
		setRestoredHtml(null);
		setState('idle');
	}, [clearTimer, pageId, queryClient, scope?.tenantId]);

	/** Keeps the draft on top of the other version, which the platform captures first. */
	const keepMine = useCallback(async () => {
		if (!pageId || !draftRef.current) return;
		const fresh = await docsService.getPage(pageId);
		expectedRef.current = fresh.updatedAt;
		await flush({ force: true });
	}, [flush, pageId]);

	/** Saves now (a Cmd+S, leaving the page). */
	const flushNow = useCallback(() => flush(), [flush]);

	/**
	 * Drops the pending draft and its timer without saving (a version is being restored, or the page turned out to
	 * be read-only): the next platform clock is followed again.
	 */
	const discard = useCallback(() => {
		clearTimer();
		draftRef.current = null;
		pendingRef.current = false;
		setRestoredHtml(null);
		setState('idle');
	}, [clearTimer]);

	// Leaving with unsaved text warns, like any editor.
	useEffect(() => {
		const warn = (event: BeforeUnloadEvent) => {
			if (!draftRef.current && !inFlightRef.current) return;
			event.preventDefault();
		};
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	}, []);

	// A page left in the app (another page, the tree) still saves what was typed; a draft waiting for the person's
	// decision (a conflict, a lock) is kept for when they come back. The draft being saved is kept too, before its save
	// starts, until that save lands: a save that fails, or one queued behind a save already running, never loses it.
	useEffect(
		() => () => {
			const draft = draftRef.current;
			if (!draft || !pageId) return;
			const current = stateRef.current;
			const base = expectedRef.current;
			if (current === 'conflict' || current === 'locked') {
				retainedDrafts.set(pageId, { draft, state: current, base });
				return;
			}
			retainedDrafts.set(pageId, { draft, state: current === 'error' || current === 'too-large' ? current : 'dirty', base });
			void flush();
		},
		[flush, pageId]
	);

	// Every save outcome of this page in this tab, this editor's own and one left behind (a departure save that runs on
	// after the person came back): this tab's write moves the clock this editor states, the draft it holds is settled
	// when that is the draft saved or refused, and a save that waited its turn goes now. Declared after the departure
	// save, so an editor that leaves with a save to make keeps listening until that work is done.
	useEffect(() => {
		if (!pageId) return;
		let left = false;
		const listeners = saveListeners.get(pageId) ?? new Set<(outcome: SaveOutcome) => void>();
		saveListeners.set(pageId, listeners);
		const stop = () => {
			listeners.delete(listener);
			if (!listeners.size) saveListeners.delete(pageId);
		};
		function listener(outcome: SaveOutcome) {
			const current = pageIdRef.current === pageId;
			if (current && outcome.to && expectedRef.current === outcome.from) expectedRef.current = outcome.to;
			if (current && draftRef.current === outcome.draft) {
				if (outcome.failure) {
					setState(outcome.failure);
				} else {
					draftRef.current = null;
					setRestoredHtml(null);
					setState('saved');
				}
			}
			if (pendingRef.current && !inFlightRef.current && !savingPages.has(pageId as string)) {
				pendingRef.current = false;
				timerRef.current = setTimeout(() => void flushRef.current(), 0);
			} else if (left && !pendingRef.current && !inFlightRef.current) {
				stop();
			}
		}
		listeners.add(listener);
		return () => {
			left = true;
			if (!pendingRef.current && !inFlightRef.current) stop();
		};
	}, [pageId]);

	return { state, change, flushNow, reload, keepMine, discard, restoredHtml, hasDraft: () => draftRef.current !== null };
}
