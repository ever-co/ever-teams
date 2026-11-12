'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { chatService } from '@/core/services/client/api/chat';
import { REALTIME_EVENT_NAMES, type RealtimeEnvelope } from '@/core/lib/realtime/events';
import { useRealtimeEvent } from '@/core/hooks/realtime/use-realtime-event';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { isMissingRouteError } from '@/core/lib/utils/chat-errors';
import {
	nextTypingExpiry,
	shouldSignalTyping,
	typingSignalOf,
	withoutAuthor,
	withoutExpired,
	withTypingSignal,
	type ChatTypist
} from '@/core/lib/utils/chat-typing';
import { useChatScope } from './use-chat-scope';

/** A platform without the typing route (older than it): nothing more is told for the page's life. */
let typingRouteMissing = false;

/** For the specs. */
export function resetChatTyping(): void {
	typingRouteMissing = false;
}

/**
 * Tells the others of a conversation (or of one of its threads) that I am typing: the returned function is called on
 * every keystroke and sends at most every 3 s. Best effort and quiet: a failure is ignored; a refusal (not a member
 * any more, no right to send) ends it for this place, a platform without the route for the page.
 */
export function useChatTypingSignal(conversationId: string | null, threadRootId: string | null = null): () => void {
	const lastSentAt = useRef<number | null>(null);
	const refused = useRef(false);
	const place = `${conversationId ?? ''}:${threadRootId ?? ''}`;
	const placeRef = useRef(place);

	// Another place starts afresh: its first keystroke is told at once.
	useEffect(() => {
		if (placeRef.current === place) return;
		placeRef.current = place;
		lastSentAt.current = null;
		refused.current = false;
	}, [place]);

	return useCallback(() => {
		if (!conversationId || typingRouteMissing || refused.current) return;
		const now = Date.now();
		if (!shouldSignalTyping(lastSentAt.current, now)) return;
		lastSentAt.current = now;
		chatService.typing(conversationId, threadRootId ? { threadRootId } : {}).catch((error: unknown) => {
			if (isMissingRouteError(error)) {
				typingRouteMissing = true;
				return;
			}
			const status = errorStatusOf(error);
			if (status === 403 || status === 404 || status === 400) refused.current = true;
		});
	}, [conversationId, threadRootId]);
}

const TYPING_EVENTS: readonly string[] = [REALTIME_EVENT_NAMES.TYPING_SIGNALLED, REALTIME_EVENT_NAMES.CHAT_MESSAGE_CREATED];

function stringOf(data: RealtimeEnvelope['data'], key: string): string | null {
	const value = (data as Record<string, unknown> | null | undefined)?.[key];
	return typeof value === 'string' && value ? value : null;
}

/**
 * Who is typing in a conversation (`threadRootId` null) or in one of its threads, as the live channel tells it: each
 * for the time their signal holds on this tab's clock, unless it comes again; gone as soon as a message of theirs
 * arrives in the conversation. Never myself. Without the live channel nobody is ever shown.
 */
export function useChatTypists(conversationId: string | null, threadRootId: string | null = null): ChatTypist[] {
	const scope = useChatScope();
	const meUserId = scope?.userId ?? null;
	const [typists, setTypists] = useState<ChatTypist[]>([]);
	const place = `${conversationId ?? ''}:${threadRootId ?? ''}`;
	const [shownFor, setShownFor] = useState(place);

	// Another place shows nobody until its own signals come.
	if (shownFor !== place) {
		setShownFor(place);
		setTypists([]);
	}

	useRealtimeEvent(TYPING_EVENTS, (envelope) => {
		if (!conversationId) return;
		if (envelope.eventName === REALTIME_EVENT_NAMES.CHAT_MESSAGE_CREATED) {
			const author = stringOf(envelope.data, 'authorUserId');
			if (author && stringOf(envelope.data, 'conversationId') === conversationId) {
				setTypists((current) => (current.some((typist) => typist.userId === author) ? withoutAuthor(current, conversationId, author) : current));
			}
			return;
		}
		const signal = typingSignalOf(envelope.data);
		if (!signal || String(signal.conversationId) !== conversationId || (signal.threadRootId ?? null) !== (threadRootId ?? null)) return;
		const now = Date.now();
		setTypists((current) => withTypingSignal(withoutExpired(current, now), signal, meUserId, now));
	});

	// Each typist goes when their time is up: one timer, for the first one due.
	useEffect(() => {
		const next = nextTypingExpiry(typists);
		if (next === null) return;
		const timer = window.setTimeout(() => setTypists((current) => withoutExpired(current, Date.now())), Math.max(0, next - Date.now()) + 20);
		return () => window.clearTimeout(timer);
	}, [typists]);

	return typists;
}
