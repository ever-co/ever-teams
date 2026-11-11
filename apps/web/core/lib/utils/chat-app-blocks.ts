import type { IChatAppBlock, IChatAppButton, IChatMessage, TChatInteractionStatus } from '@/core/types/interfaces/common/chat';

/**
 * App messages (posted by the platform's incoming webhooks): their blocks as the chat renders them, and the state
 * of a click on one of their buttons. Pure, so the rules are tested without a component.
 */

const KNOWN_TYPES = new Set(['header', 'section', 'divider', 'context', 'actions', 'text']);

/** The blocks of an app message the chat knows how to render (anything else is skipped); none for other messages. */
export function appBlocksOf(message: Pick<IChatMessage, 'kind' | 'blocks'> | null | undefined): IChatAppBlock[] {
	if (!message || message.kind !== 'app' || !Array.isArray(message.blocks)) return [];
	return message.blocks.filter((block): block is IChatAppBlock => !!block && typeof block === 'object' && KNOWN_TYPES.has(String((block as { type?: unknown }).type)));
}

/** The text the platform derives a body from when a post has no `text` (its `blocksText`). */
export function blocksText(blocks: readonly IChatAppBlock[]): string {
	const lines: string[] = [];
	for (const block of blocks) {
		if (block.type === 'header' || block.type === 'text') lines.push(block.text);
		else if (block.type === 'section') {
			if (block.text) lines.push(block.text);
			if (block.fields?.length) lines.push(block.fields.join('\n'));
		} else if (block.type === 'context') lines.push(block.elements.join(' · '));
	}
	return lines.join('\n').trim();
}

/** Whether an app message's body only repeats its blocks (then the blocks show alone, not the same words twice). */
export function bodyRepeatsBlocks(body: string | null | undefined, blocks: readonly IChatAppBlock[]): boolean {
	return blocks.length > 0 && (body ?? '').trim() === blocksText(blocks);
}

/** An https address, or null: what a link button opens and an app icon shows (the platform refuses anything else). */
export function httpsUrlOf(url: string | null | undefined): string | null {
	const value = typeof url === 'string' ? url.trim() : '';
	if (!value) return null;
	try {
		return new URL(value).protocol === 'https:' ? value : null;
	} catch {
		return null;
	}
}

/** A link button's page, or null for a button that calls the app back. */
export function buttonLinkOf(button: Pick<IChatAppButton, 'url'>): string | null {
	return httpsUrlOf(button.url);
}

/** The key of one button within one message: its actions block and its action id. */
export function appButtonKey(blockId: string | null | undefined, actionId: string): string {
	return `${blockId ?? ''}::${actionId}`;
}

/** What a button shows while and after it is clicked. */
export type TAppButtonState = 'pending' | 'done' | 'failed';

/** The button state an interaction status means: retrying stays pending until it is delivered or failed. */
export function appButtonStateOf(status: TChatInteractionStatus | string | null | undefined): TAppButtonState {
	if (status === 'delivered') return 'done';
	if (status === 'failed') return 'failed';
	return 'pending';
}

/** How often, and how many times, the chat asks again about a click whose callback is being retried (~45 s). */
export const APP_INTERACTION_POLL_MS = 3000;
export const APP_INTERACTION_POLL_MAX = 15;

/** Why a click failed, as the translation key the message shows (by the platform's answer). */
export function appClickFailureOf(status: number | null | undefined): 'APP_NO_INTERACTIONS' | 'APP_GONE' | 'APP_CLICK_FAILED' {
	if (status === 409) return 'APP_NO_INTERACTIONS';
	if (status === 404) return 'APP_GONE';
	return 'APP_CLICK_FAILED';
}
