'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, Check, CircleAlert, Loader } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import {
	APP_INTERACTION_POLL_MAX,
	APP_INTERACTION_POLL_MS,
	appBlocksOf,
	appButtonKey,
	appButtonStateOf,
	appClickFailureOf,
	buttonLinkOf,
	TAppButtonState
} from '@/core/lib/utils/chat-app-blocks';
import { chatService } from '@/core/services/client/api/chat/chat.service';
import type { IChatAppBlock, IChatAppButton, IChatMessage } from '@/core/types/interfaces/common/chat';

export interface ChatAppBlocksProps {
	message: IChatMessage;
	/** An archived conversation, or a reader who may not write: the buttons show but do not click. */
	readOnly?: boolean;
	/** The message as the app's reply left it. */
	onReplaced?: (message: IChatMessage, replaced: IChatMessage) => void;
}

const BUTTON =
	'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] font-medium outline-none hairline-ring transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-default disabled:opacity-70 [@media(pointer:coarse)]:h-9 [&_svg]:size-3.5';

function buttonTone(button: IChatAppButton): string {
	if (button.style === 'primary') return 'bg-primary/10 text-primary ring-primary/40 hover:bg-primary/15';
	if (button.style === 'danger') return 'bg-destructive/10 text-destructive ring-destructive/40 hover:bg-destructive/15';
	return 'bg-foreground/[0.03] text-foreground ring-border hover:bg-foreground/[0.07]';
}

function blockIdOf(block: IChatAppBlock): string | null {
	return block.type === 'actions' ? (block.blockId ?? null) : null;
}

/**
 * The layout of an app message (an incoming webhook's post): a title, paragraphs, fields side by side, dividers,
 * small context text and buttons — all plain text (React text nodes, never HTML). A link button opens its https page;
 * any other button calls the platform, which posts a signed callback to the app; the button shows pending until the
 * callback is delivered (asking again while it is retried) or failed, and the app's reply replaces the message.
 */
export function ChatAppBlocks({ message, readOnly = false, onReplaced }: Readonly<ChatAppBlocksProps>) {
	const t = useTranslations();
	const blocks = appBlocksOf(message);
	const [states, setStates] = useState<Record<string, TAppButtonState>>({});
	const [failures, setFailures] = useState<Record<string, string>>({});
	const alive = useRef(true);
	const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

	useEffect(() => {
		alive.current = true;
		const pending = timers.current;
		return () => {
			alive.current = false;
			for (const timer of pending) clearTimeout(timer);
			pending.clear();
		};
	}, []);

	const setState = useCallback((key: string, state: TAppButtonState) => {
		if (alive.current) setStates((current) => ({ ...current, [key]: state }));
	}, []);
	const setFailure = useCallback((blockId: string | null, failure: string | null) => {
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
					if (state === 'failed') setFailure(blockId, 'APP_CALLBACK_FAILED');
					if (state !== 'pending') return;
				} catch {
					setState(key, 'failed');
					return;
				}
			}
		},
		[pause, setFailure, setState]
	);

	const click = useCallback(
		async (blockId: string | null, button: IChatAppButton) => {
			const key = appButtonKey(blockId, button.actionId);
			if (readOnly || states[key] === 'pending') return;
			setState(key, 'pending');
			setFailure(blockId, null);
			try {
				const result = await chatService.interact(message.id, button.actionId, blockId);
				if (result.message) onReplaced?.(message, result.message);
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
		[follow, message, onReplaced, readOnly, setFailure, setState, states]
	);

	if (!blocks.length) return null;

	return (
		<div className="mt-1 flex max-w-2xl flex-col gap-1.5 border-s-[3px] border-primary/30 ps-2.5" data-app-blocks="">
			{blocks.map((block, index) => {
				switch (block.type) {
					case 'header':
						return (
							<p key={index} className="text-[14px] font-semibold text-foreground [overflow-wrap:anywhere]">
								{block.text}
							</p>
						);
					case 'section':
						return (
							<div key={index} className="flex flex-col gap-1">
								{block.text && <p className="whitespace-pre-line text-[13px] text-foreground [overflow-wrap:anywhere]">{block.text}</p>}
								{!!block.fields?.length && (
									<div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-x-4 gap-y-1" data-app-fields="">
										{block.fields.map((field, fieldIndex) => (
											<div key={fieldIndex} className="whitespace-pre-line text-[13px] text-foreground [overflow-wrap:anywhere]">
												{field}
											</div>
										))}
									</div>
								)}
							</div>
						);
					case 'divider':
						return <hr key={index} className="my-0.5 border-border" />;
					case 'context':
						return (
							<p key={index} className="text-[11px] text-muted-foreground [overflow-wrap:anywhere]">
								{block.elements.join(' · ')}
							</p>
						);
					case 'text':
						return (
							<p key={index} className="whitespace-pre-line text-[13px] text-foreground [overflow-wrap:anywhere]">
								{block.text}
							</p>
						);
					case 'actions': {
						const blockId = blockIdOf(block);
						const failure = failures[blockId ?? ''];
						return (
							<div key={index} className="flex flex-col gap-1">
								<div className="flex flex-wrap gap-1.5" role="group">
									{block.elements.map((button) => {
										const link = buttonLinkOf(button);
										if (link) {
											return (
												<a key={button.actionId} href={link} target="_blank" rel="noopener noreferrer nofollow" className={cn(BUTTON, buttonTone(button))}>
													{button.text}
													<ArrowUpRight aria-hidden="true" />
												</a>
											);
										}
										const state = states[appButtonKey(blockId, button.actionId)];
										return (
											<button
												key={button.actionId}
												type="button"
												data-action-id={button.actionId}
												className={cn(BUTTON, buttonTone(button))}
												aria-busy={state === 'pending'}
												disabled={readOnly || state === 'pending'}
												onClick={() => void click(blockId, button)}
											>
												{button.text}
												{state === 'pending' && <Loader className="animate-spin motion-reduce:animate-none" aria-label={t('teamChat.APP_PENDING')} />}
												{state === 'done' && <Check aria-label={t('teamChat.APP_DONE')} />}
												{state === 'failed' && <CircleAlert className="text-destructive" aria-label={t('teamChat.APP_FAILED')} />}
											</button>
										);
									})}
								</div>
								{failure && (
									<p role="alert" className="text-[11px] text-destructive">
										{failure === 'APP_NO_INTERACTIONS'
											? t('teamChat.APP_NO_INTERACTIONS')
											: failure === 'APP_GONE'
												? t('teamChat.APP_GONE')
												: failure === 'APP_CALLBACK_FAILED'
													? t('teamChat.APP_CALLBACK_FAILED')
													: t('teamChat.APP_CLICK_FAILED')}
									</p>
								)}
							</div>
						);
					}
					default:
						return null;
				}
			})}
		</div>
	);
}
