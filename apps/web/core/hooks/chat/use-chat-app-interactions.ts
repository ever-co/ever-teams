'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
	APP_INTERACTION_POLL_MAX,
	APP_INTERACTION_POLL_MS,
	APP_INTERACTION_RETRY_DELAYS_MS,
	APP_INTERACTION_TIMEOUT_MS,
	appButtonKey,
	appButtonStateOf,
	appClickFailureOf,
	isUnansweredClick,
	keepsClickKey,
	TAppButtonState,
	TAppClickFailure
} from '@/core/lib/utils/chat-app-blocks';
import { newNonce, nextMessageOrder, withMessageOrder } from '@/core/lib/utils/chat-format';
import { chatService } from '@/core/services/client/api/chat/chat.service';
import type { IChatAppButton, IChatInteraction, IChatInteractionResult, IChatMessage } from '@/core/types/interfaces/common/chat';

/**
 * The HTTP status the platform answered a failed call with, when it answered: the API service's `ApiErrorService`
 * keeps it as `httpResponseStatus` (none when no answer came); a plain Axios error as `response.status`.
 */
function statusOf(error: unknown): number | undefined {
	const failed = error as { httpResponseStatus?: number; response?: { status?: number }; status?: number } | null;
	return failed?.httpResponseStatus ?? failed?.response?.status ?? failed?.status;
}

export interface UseChatAppInteractionsOptions {
	/** An archived conversation, or a reader who may not write: no click is sent. */
	readOnly?: boolean;
	/** The message as the app's reply left it. */
	onReplaced?: (message: IChatMessage, replaced: IChatMessage) => void;
}

/**
 * The clicks on the buttons of an app message (an incoming webhook's post): each calls the platform, which posts a
 * signed callback to the app. A button shows pending until the callback is delivered or failed; while it is retried
 * the chat asks again every few seconds. A reply that replaced the message comes back with the click, or, when a
 * retry delivered it, is read again: either way it is handed to `onReplaced`. When the chat stops asking first, the
 * button clicks again and says the app has not answered yet.
 *
 * Each click carries an idempotency key of its own (a UUID where the browser has `crypto.randomUUID()`): a click whose
 * request got no answer is sent again with it, and so is the next click of a button whose click never got one, so the
 * platform takes a click it already had as that click and calls the app no second time.
 */
export function useChatAppInteractions(message: IChatMessage, { readOnly = false, onReplaced }: UseChatAppInteractionsOptions = {}) {
	const [states, setStates] = useState<Record<string, TAppButtonState>>({});
	const [failures, setFailures] = useState<Record<string, TAppClickFailure>>({});
	const alive = useRef(true);
	const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
	/** The latest click of each button (its interaction id): only it may write the button's state. */
	const latestClicks = useRef(new Map<string, string>());
	/** The buttons whose click is on its way (by button key), so a second click before the re-render sends nothing. */
	const sending = useRef(new Set<string>());
	/** The idempotency key of each button's click that got no answer yet (by button key): its next click sends it again. */
	const unanswered = useRef(new Map<string, string>());
	// The latest callback, so a poll that started before a re-render hands the reply to the current one.
	const replaced = useRef(onReplaced);
	useEffect(() => {
		replaced.current = onReplaced;
	}, [onReplaced]);

	useEffect(() => {
		alive.current = true;
		const pending = timers.current;
		return () => {
			alive.current = false;
			for (const timer of pending) clearTimeout(timer);
			pending.clear();
		};
	}, []);

	const setState = useCallback((key: string, state: TAppButtonState | null) => {
		if (!alive.current) return;
		setStates((current) => {
			const next = { ...current };
			if (state) next[key] = state;
			else delete next[key];
			return next;
		});
	}, []);
	const setFailure = useCallback((blockId: string | null, failure: TAppClickFailure | null) => {
		if (!alive.current) return;
		setFailures((current) => {
			const next = { ...current };
			if (failure) next[blockId ?? ''] = failure;
			else delete next[blockId ?? ''];
			return next;
		});
	}, []);

	/** Waits `ms` (one poll interval by default; a timer the unmount clears). */
	const pause = useCallback(
		(ms: number = APP_INTERACTION_POLL_MS) =>
			new Promise<void>((resolve) => {
				const timer = setTimeout(() => {
					timers.current.delete(timer);
					resolve();
				}, ms);
				timers.current.add(timer);
			}),
		[]
	);

	/**
	 * Sends a click, and sends it again (with the same key) while it gets no answer that settles it: twice, after 1 s and
	 * 3 s, each send with a 15 s deadline (a hung request counts as unanswered). Any answer, or the last unanswered
	 * failure, is the click's.
	 */
	const send = useCallback(
		(blockId: string | null, button: IChatAppButton, idempotencyKey: string): Promise<IChatInteractionResult> => {
			// Each send waits for the one before it (the next one depends on how that one failed), hence one after another.
			const attempt = async (sent: number): Promise<IChatInteractionResult> => {
				try {
					return await chatService.interact(message.id, button.actionId, blockId, idempotencyKey, APP_INTERACTION_TIMEOUT_MS);
				} catch (error) {
					if (!isUnansweredClick(statusOf(error)) || sent >= APP_INTERACTION_RETRY_DELAYS_MS.length || !alive.current) throw error;
					await pause(APP_INTERACTION_RETRY_DELAYS_MS[sent]);
					return attempt(sent + 1);
				}
			};
			return attempt(0);
		},
		[message, pause]
	);

	/**
	 * The message as a retried callback's reply left it: the timeline window around it, which always holds it. The copy
	 * is stamped with the order the read started at, so a change applied meanwhile (a reaction, a deletion) wins.
	 */
	const readReplaced = useCallback(async (interaction: IChatInteraction) => {
		try {
			const order = nextMessageOrder();
			const page = await chatService.messages(interaction.conversationId, { around: interaction.messageId, limit: 1 });
			const current = page.messages.find((item) => String(item.id) === String(interaction.messageId));
			if (current && alive.current) replaced.current?.(message, withMessageOrder([current], order)[0]);
		} catch {
			// The button already says the click was delivered; realtime or the next read shows the reply.
		}
	}, [message]);

	/**
	 * Asks again about a click whose callback is being retried, until it settles or the chat stops asking. The platform
	 * writes a retry's delivery just before it applies the app's reply: a delivery without its reply is asked about once
	 * more, and the button stays pending (so disabled) until that ask answers. Only the button's latest click writes its
	 * state: an answer about an older one is dropped. `delivered`: the click's own answer already said it was delivered
	 * (a repeat answered before its reply landed): only the one more ask is left, and the button ends done whatever it
	 * answers.
	 */
	const follow = useCallback(
		async (key: string, blockId: string | null, interactionId: string, delivered = false) => {
			const isLatest = () => latestClicks.current.get(key) === interactionId;
			let deliveredSeen = delivered;
			for (let round = 0; round < APP_INTERACTION_POLL_MAX; round += 1) {
				await pause();
				if (!alive.current || !isLatest()) return;
				try {
					const interaction = await chatService.interaction(interactionId);
					if (!isLatest()) return;
					const state = appButtonStateOf(interaction.status);
					if (state === 'pending') continue;
					if (state === 'done' && !interaction.replyApplied && !deliveredSeen && round + 1 < APP_INTERACTION_POLL_MAX) {
						deliveredSeen = true;
						continue;
					}
					setState(key, state);
					if (state === 'failed') setFailure(blockId, 'APP_CALLBACK_FAILED');
					if (interaction.replyApplied) await readReplaced(interaction);
					return;
				} catch (error) {
					if (!isLatest()) return;
					// A failed ask is asked again at the next round (the click may still be delivered): only a 404 (the
					// click or the webhooks are gone) ends the asking.
					if (statusOf(error) !== 404) continue;
					// Asked again after the delivery: the click went through; only the reply's read is missed.
					if (deliveredSeen) {
						setState(key, 'done');
						return;
					}
					setState(key, 'failed');
					setFailure(blockId, 'APP_GONE');
					return;
				}
			}
			if (!isLatest()) return;
			if (deliveredSeen) {
				setState(key, 'done');
				return;
			}
			setState(key, null);
			setFailure(blockId, 'APP_NO_ANSWER_YET');
		},
		[pause, readReplaced, setFailure, setState]
	);

	const click = useCallback(
		async (blockId: string | null, button: IChatAppButton) => {
			const key = appButtonKey(blockId, button.actionId);
			if (readOnly || states[key] === 'pending' || sending.current.has(key)) return;
			sending.current.add(key);
			setState(key, 'pending');
			setFailure(blockId, null);
			// One key per click, sent again on each retry of it, and on the next click of a button whose click got no
			// answer (the platform may have taken it).
			const idempotencyKey = unanswered.current.get(key) ?? newNonce();
			unanswered.current.set(key, idempotencyKey);
			try {
				// The reply that comes back is the message as of this request: stamped as it started (see `readReplaced`).
				const order = nextMessageOrder();
				const result = await send(blockId, button, idempotencyKey);
				unanswered.current.delete(key);
				latestClicks.current.set(key, result.interaction.interactionId);
				if (result.message) replaced.current?.(message, withMessageOrder([result.message], order)[0]);
				const state = appButtonStateOf(result.interaction.status);
				// A repeat answered as delivered without its reply: the first request may be applying the reply right now
				// (the platform writes the delivery just before), so it is asked about once more, as a retry's is, and the
				// button stays pending (so disabled) until that ask answers.
				const replyMayFollow = !!result.replayed && state === 'done' && !result.interaction.replyApplied;
				setState(key, replyMayFollow ? 'pending' : state);
				if (state === 'failed') setFailure(blockId, 'APP_CALLBACK_FAILED');
				if (state === 'pending' || replyMayFollow) void follow(key, blockId, result.interaction.interactionId, replyMayFollow);
			} catch (error) {
				// A refusal settles the click (the next one is a new click); a click with no answer, or a server error (the
				// app may have been called), keeps its key for the button's next click.
				if (!keepsClickKey(statusOf(error))) unanswered.current.delete(key);
				setState(key, 'failed');
				setFailure(blockId, appClickFailureOf(statusOf(error)));
			} finally {
				sending.current.delete(key);
			}
		},
		[follow, message, readOnly, send, setFailure, setState, states]
	);

	const stateOf = useCallback((blockId: string | null, actionId: string): TAppButtonState | undefined => states[appButtonKey(blockId, actionId)], [states]);
	const failureOf = useCallback((blockId: string | null): TAppClickFailure | undefined => failures[blockId ?? ''], [failures]);

	return { click, stateOf, failureOf };
}
