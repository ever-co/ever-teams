'use client';

import { useTranslations } from 'next-intl';
import { ArrowUpRight, Check, CircleAlert, Loader } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { useChatAppInteractions } from '@/core/hooks/chat/use-chat-app-interactions';
import { appBlocksOf, buttonLinkOf, TAppClickFailure } from '@/core/lib/utils/chat-app-blocks';
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

/** The message of each reason a click did not go through (static keys, so the translation checks find them). */
const FAILURE_KEYS = {
	APP_NO_INTERACTIONS: 'teamChat.APP_NO_INTERACTIONS',
	APP_GONE: 'teamChat.APP_GONE',
	APP_CLICK_FAILED: 'teamChat.APP_CLICK_FAILED',
	APP_CALLBACK_FAILED: 'teamChat.APP_CALLBACK_FAILED',
	APP_NO_ANSWER_YET: 'teamChat.APP_NO_ANSWER_YET'
} as const satisfies Record<TAppClickFailure, string>;

function blockIdOf(block: IChatAppBlock): string | null {
	return block.type === 'actions' ? (block.blockId ?? null) : null;
}

/**
 * The layout of an app message (an incoming webhook's post): a title, paragraphs, fields side by side, dividers,
 * small context text and buttons — all plain text (React text nodes, never HTML). A link button opens its https page;
 * any other button calls the platform, which posts a signed callback to the app. The clicks, their states and the
 * app's replies are `useChatAppInteractions`'; this component only lays the blocks out and wires the buttons.
 */
export function ChatAppBlocks({ message, readOnly = false, onReplaced }: Readonly<ChatAppBlocksProps>) {
	const t = useTranslations();
	const blocks = appBlocksOf(message);
	const { click, stateOf, failureOf } = useChatAppInteractions(message, { readOnly, onReplaced });

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
						const failure = failureOf(blockId);
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
										const state = stateOf(blockId, button.actionId);
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
										{t(FAILURE_KEYS[failure])}
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
