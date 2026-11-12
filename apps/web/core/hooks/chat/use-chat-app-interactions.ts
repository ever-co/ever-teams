'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
	APP_INTERACTION_POLL_MAX,
	APP_INTERACTION_POLL_MS,
	appButtonKey,
	appButtonStateOf,
	appClickFailureOf,
	TAppButtonState,
	TAppClickFailure
} from '@/core/lib/utils/chat-app-blocks';
import { nextMessageOrder, withMessageOrder } from '@/core/lib/utils/chat-format';
import { chatService } from '@/core/services/client/api/chat/chat.service';
import type { IChatAppButton, IChatInteraction, IChatMessage } from '@/core/types/interfaces/common/chat';

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
 */
export function useChatAppInteractions(message: IChatMessage, { readOnly = false, onReplaced }: UseChatAppInteractionsOptions = {}) {
	const [states, setStates] = useState<Record<string, TAppButtonState>>({});
	const [failures, setFailures] = useState<Record<string, TAppClickFailure>>({});
	const alive = useRef(true);
	const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
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

	/** Waits one poll interval (a timer the unmount clears). */
	const pause = useCallback(
		() =>
			new Promise<void>((resolve) => {
				const timer = setTimeout(() => {
					timers.current.delete(timer);
					resolve();
				}, APP_INTERACTION_POLL_MS);
				timers.current.add(timer);
			}),
		[]
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

	/** Asks again about a click whose callback is being retried, until it settles or the chat stops asking. */
	const follow = useCallback(
		async (key: string, blockId: string | null, interactionId: string) => {
			for (let round = 0; round < APP_INTERACTION_POLL_MAX; round += 1) {
				await pause();
				if (!alive.current) return;
				try {
					const interaction = await chatService.interaction(interactionId);
					const state = appButtonStateOf(interaction.status);
					setState(key, state);
					if (state === 'pending') continue;
					if (state === 'failed') setFailure(blockId, 'APP_CALLBACK_FAILED');
					if (interaction.replyApplied) await readReplaced(interaction);
					return;
				} catch {
					setState(key, 'failed');
					setFailure(blockId, 'APP_CLICK_FAILED');
					return;
				}
			}
			setState(key, null);
			setFailure(blockId, 'APP_NO_ANSWER_YET');
		},
		[pause, readReplaced, setFailure, setState]
	);

	const click = useCallback(
		async (blockId: string | null, button: IChatAppButton) => {
			const key = appButtonKey(blockId, button.actionId);
			if (readOnly || states[key] === 'pending') return;
			setState(key, 'pending');
			setFailure(blockId, null);
			try {
				// The reply that comes back is the message as of this request: stamped as it started (see `readReplaced`).
				const order = nextMessageOrder();
				const result = await chatService.interact(message.id, button.actionId, blockId);
				if (result.message) replaced.current?.(message, withMessageOrder([result.message], order)[0]);
				const state = appButtonStateOf(result.interaction.status);
				setState(key, state);
				if (state === 'failed') setFailure(blockId, 'APP_CALLBACK_FAILED');
				if (state === 'pending') void follow(key, blockId, result.interaction.interactionId);
			} catch (error) {
				const status = (error as { response?: { status?: number }; status?: number })?.response?.status ?? (error as { status?: number })?.status;
				setState(key, 'failed');
				setFailure(blockId, appClickFailureOf(status));
			}
		},
		[follow, message, readOnly, setFailure, setState, states]
	);

	const stateOf = useCallback((blockId: string | null, actionId: string): TAppButtonState | undefined => states[appButtonKey(blockId, actionId)], [states]);
	const failureOf = useCallback((blockId: string | null): TAppClickFailure | undefined => failures[blockId ?? ''], [failures]);

	return { click, stateOf, failureOf };
}
