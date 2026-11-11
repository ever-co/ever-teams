'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { onSignOut } from '@/core/lib/auth/sign-out-cleanups';
import { getAccessTokenCookie } from '@/core/lib/helpers/cookies';
import {
	colorForUser,
	createDocsLiveMemory,
	DocsLiveBinding,
	type DocsLiveSnapshot,
	type DocsLiveState,
	type DocsLiveUser
} from '@/core/lib/docs-live/binding';
import { isDocsLiveEnabled, newConnectionId } from '@/core/lib/docs-live/config';
import type { DocsLiveStatus } from '@/core/lib/docs-live/protocol';
import { createDocsLiveTransport } from '@/core/lib/docs-live/transport';
import { realtimeSocketUrl } from '@/core/lib/realtime/config';
import { queryKeys } from '@/core/query/keys';
import { docsService } from '@/core/services/client/api/docs';
import { userState } from '@/core/stores/user/user';
import { useDocsScope } from './use-docs-scope';

/** The pages' live documents kept in this tab (edits not sent yet go on the next visit); a sign-out drops them. */
const memory = createDocsLiveMemory();
onSignOut(() => memory.clear());

/** The sessions of the page views open in this tab. */
const openBindings = new Set<DocsLiveBinding>();
let unloadGuard: ((event: BeforeUnloadEvent) => void) | null = null;

/**
 * Leaving the tab with live edits the platform never confirmed warns, as the autosave does for its drafts: edits of an
 * open page (the batch window, a session that is down) and of a page left before they were confirmed.
 */
function syncLiveUnloadGuard(): void {
	if (typeof window === 'undefined') return;
	if (openBindings.size && !unloadGuard) {
		unloadGuard = (event) => {
			const unsent =
				memory.hasUnsent() ||
				Array.from(openBindings).some(
					(binding) => binding.getSnapshot().unsentEdits || binding.hasUnconfirmedEdits()
				);
			if (unsent) event.preventDefault();
		};
		window.addEventListener('beforeunload', unloadGuard);
	}
}

/** A successful status answer is asked again after this long; a 404 holds for the page load. */
const STATUS_FRESH_MS = 60_000;
let statusAnswer: { at: number; promise: Promise<DocsLiveStatus> } | null = null;

/** The platform's live status, asked once for all the pages opened in a while (a 404 is kept for the page load). */
function liveStatusOnce(now = Date.now()): Promise<DocsLiveStatus> {
	if (statusAnswer && now - statusAnswer.at < STATUS_FRESH_MS) return statusAnswer.promise;
	const promise = docsService.liveStatus();
	const answer = { at: now, promise };
	statusAnswer = answer;
	promise.catch((error: unknown) => {
		const status = (error as { statusCode?: number } | null)?.statusCode;
		// Only a 404 says the platform has no live sessions; any other failure is asked again next time.
		if (status === 404) answer.at = Number.POSITIVE_INFINITY;
		else if (statusAnswer === answer) statusAnswer = null;
	});
	return promise;
}

/** What the page view renders from a page's live session. */
interface DocsLiveView {
	/** `off`: no live editing here (the flag, no socket, a folder, the trash); the autosave edits the page. */
	mode: 'off' | DocsLiveState;
	snapshot: DocsLiveSnapshot | null;
	binding: DocsLiveBinding | null;
	/** Live editing stopped and the page is being read again: the autosave editor waits for it. */
	rereading: boolean;
}

interface LiveStoreView {
	binding: DocsLiveBinding;
	snapshot: DocsLiveSnapshot;
}

/**
 * The binding of one page view, made when the view subscribes and destroyed when it stops: React's subscription is
 * the lifetime of the session (a re-subscription, as in development's double effects, opens a new one).
 */
function createLiveStore(make: () => DocsLiveBinding) {
	let binding: DocsLiveBinding | null = null;
	let view: LiveStoreView | null = null;
	let subscribers = 0;
	return {
		subscribe(listener: () => void): () => void {
			if (!binding) {
				binding = make();
				openBindings.add(binding);
				syncLiveUnloadGuard();
				binding.start();
			}
			const current = binding;
			subscribers += 1;
			const off = current.subscribe(listener);
			return () => {
				off();
				subscribers -= 1;
				if (subscribers === 0 && binding === current) {
					binding = null;
					view = null;
					openBindings.delete(current);
					current.destroy();
				}
			};
		},
		getSnapshot(): LiveStoreView | null {
			if (!binding) return null;
			const snapshot = binding.getSnapshot();
			if (!view || view.binding !== binding || view.snapshot !== snapshot) view = { binding, snapshot };
			return view;
		}
	};
}

const NO_SUBSCRIPTION = () => () => undefined;
const NO_SNAPSHOT = (): LiveStoreView | null => null;

/**
 * The live session of the open page, when the deployment edits pages live (`NEXT_PUBLIC_DOCS_LIVE_ENABLED`) and the
 * platform serves them: a binding of the page's shared document, on its own socket to the platform's GraphQL endpoint
 * with the session's credential. When live editing stops (`closed`, the platform without live sessions, content the
 * editor cannot carry), the page is read again and the view goes back to the autosave; the session is not opened again
 * until the page is opened again.
 *
 * @param pageId The open page.
 * @param eligible Whether the page may be edited live at all (a page, not a folder; not in the trash).
 */
export function useDocsLive(pageId: string | null, eligible: boolean): DocsLiveView {
	const scope = useDocsScope();
	const account = useAtomValue(userState);
	const queryClient = useQueryClient();
	const socketUrl = useMemo(() => (isDocsLiveEnabled() ? realtimeSocketUrl() : null), []);

	const userId = scope?.userId ?? null;
	const tenantId = scope?.tenantId ?? null;
	const organizationId = scope?.organizationId ?? null;
	const name =
		account?.name || [account?.firstName, account?.lastName].filter(Boolean).join(' ') || account?.email || '';
	const imageUrl = account?.imageUrl ?? null;
	// Who this tab is to its co-editors. The session is made for the account and the page only: a changed name or
	// picture reaches the running session (below) instead of opening another one, which would start live editing again
	// over whatever the view shows by then.
	const user = useMemo<DocsLiveUser | null>(
		() => (userId ? { id: userId, name, color: colorForUser(userId), imageUrl } : null),
		[imageUrl, name, userId]
	);
	const sessionUser = useMemo<DocsLiveUser | null>(
		() => (userId ? { id: userId, name: '', color: colorForUser(userId) } : null),
		[userId]
	);
	const enabled = Boolean(eligible && pageId && socketUrl && sessionUser && tenantId);

	const store = useMemo(() => {
		if (!enabled || !pageId || !socketUrl || !sessionUser || !tenantId) return null;
		return createLiveStore(
			() =>
				new DocsLiveBinding({
					documentId: pageId,
					connectionId: newConnectionId(),
					user: sessionUser,
					transport: createDocsLiveTransport({
						socketUrl,
						credentials: () => {
							const token = getAccessTokenCookie();
							return token ? { accessToken: token, tenantId, organizationId } : null;
						},
						http: {
							status: () => liveStatusOnce(),
							sendUpdate: (id, input) => docsService.liveUpdate(id, input),
							sendAwareness: (id, input) => docsService.liveAwareness(id, input)
						}
					}),
					memory,
					memoryKey: `${sessionUser.id}:${pageId}`
				})
		);
	}, [enabled, organizationId, pageId, sessionUser, socketUrl, tenantId]);

	const view = useSyncExternalStore(
		store?.subscribe ?? NO_SUBSCRIPTION,
		store?.getSnapshot ?? NO_SNAPSHOT,
		NO_SNAPSHOT
	);
	const snapshot = view?.snapshot ?? null;

	const binding = view?.binding ?? null;
	useEffect(() => {
		if (binding && user) binding.updateUser(user);
	}, [binding, user]);

	// Live editing stopped: the page is read again, so the autosave starts from what the platform holds now (and the
	// view waits for it: a draft typed over the text read before would only meet a conflict).
	const fellBack = snapshot?.state === 'fallback';
	const [reread, setReread] = useState<string | null>(null);
	useEffect(() => {
		if (!fellBack || !pageId) return;
		let current = true;
		void queryClient
			.refetchQueries({ queryKey: queryKeys.docs.page(tenantId, pageId), exact: true })
			.catch(() => undefined)
			.finally(() => {
				if (current) setReread(pageId);
			});
		return () => {
			current = false;
		};
	}, [fellBack, pageId, queryClient, tenantId]);

	if (!store) return { mode: 'off', snapshot: null, binding: null, rereading: false };
	// Before the binding is up the page is about to connect: the autosave editor is not shown in the meantime.
	return {
		mode: snapshot?.state ?? 'connecting',
		snapshot,
		binding,
		rereading: fellBack && reread !== pageId
	};
}
