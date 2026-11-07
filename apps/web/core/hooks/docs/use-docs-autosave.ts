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
	const flushRef = useRef<(options?: { force?: boolean }) => Promise<boolean>>(async () => true);

	const clearTimer = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = null;
	}, []);

	// Another page: forget the previous one's draft and clock.
	useEffect(() => {
		expectedRef.current = page?.updatedAt ?? null;
		draftRef.current = null;
		pendingRef.current = false;
		setState('idle');
		return clearTimer;
	}, [clearTimer, pageId]);

	// The platform's clock moved while nothing was pending (a reload, a restore): follow it.
	useEffect(() => {
		if (!page?.updatedAt) return;
		if (stateRef.current === 'idle' || stateRef.current === 'saved') expectedRef.current = page.updatedAt;
	}, [page?.updatedAt]);

	const applySaved = useCallback(
		(saved: IDocumentPage, draft: Draft) => {
			expectedRef.current = saved.updatedAt;
			const patch = { updatedAt: saved.updatedAt, version: saved.version, contentHtml: draft.html, contentJson: draft.json ?? EMPTY_DOC };
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
			if (inFlightRef.current) {
				pendingRef.current = true;
				return false;
			}
			if (byteLengthOf(draft.html) > DOCS_CONTENT_MAX_BYTES) {
				setState('too-large');
				return false;
			}
			inFlightRef.current = true;
			setState('saving');
			try {
				const saved = await docsService.updateContent(pageId, {
					contentJson: draft.json ?? EMPTY_DOC,
					contentHtml: draft.html,
					expectedUpdatedAt: expectedRef.current,
					forceSnapshot: options.force,
					mentionEmployeeIds: draft.mentionEmployeeIds
				});
				applySaved(saved, draft);
				if (draftRef.current === draft) {
					draftRef.current = null;
					setState('saved');
				}
				return true;
			} catch (error) {
				setState(saveStateFromError(error));
				return false;
			} finally {
				inFlightRef.current = false;
				if (pendingRef.current) {
					pendingRef.current = false;
					timerRef.current = setTimeout(() => void flushRef.current(), 0);
				}
			}
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

	// Leaving with unsaved text warns, like any editor.
	useEffect(() => {
		const warn = (event: BeforeUnloadEvent) => {
			if (!draftRef.current && !inFlightRef.current) return;
			event.preventDefault();
		};
		window.addEventListener('beforeunload', warn);
		return () => window.removeEventListener('beforeunload', warn);
	}, []);

	// A page left in the app (another page, the tree) still saves what was typed.
	useEffect(
		() => () => {
			if (draftRef.current && stateRef.current !== 'conflict' && stateRef.current !== 'locked') void flush();
		},
		[flush]
	);

	return { state, change, flushNow, reload, keepMine, hasDraft: () => draftRef.current !== null };
}
