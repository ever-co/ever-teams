import type { MouseEvent } from 'react';

/** A modified click asks for a new tab, as it would on any link. */
export function asksForNewTab(event: MouseEvent) {
	const hasModifier = [event.metaKey, event.ctrlKey, event.shiftKey].some(Boolean);
	return hasModifier;
}

/**
 * A plain click on a client's name opens the client over the list; a modified or middle click keeps the link's own
 * behaviour, its page in a new tab. Enter on the focused name is a plain click.
 */
export function openClientOnPlainClick(event: MouseEvent<HTMLAnchorElement>, openOverList: (() => void) | undefined) {
	if (!openOverList) {
		return;
	}
	if (asksForNewTab(event)) {
		return;
	}
	event.preventDefault();
	openOverList();
}
