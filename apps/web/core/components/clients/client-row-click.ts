import type { MouseEvent } from 'react';

const CONTROL_SELECTOR = 'a,button,input,textarea,select,label,[role="menu"],[role="menuitem"],[role="dialog"]';

const MIDDLE_BUTTON = 1;

/** A click that reached the row through one of its controls (a link, the "..." menu) belongs to that control. */
export function isControlClick(event: MouseEvent) {
	const target = event.target;
	if (!(target instanceof Element)) {
		return false;
	}
	const control = target.closest(CONTROL_SELECTOR);
	return control !== null;
}

/** Text being selected in a row is not a click on it. */
export function isSelectingText() {
	const selection = window.getSelection();
	const selectedText = selection?.toString() ?? '';
	return selectedText.length > 0;
}

/** A modified click, or the middle button, asks for a new tab, as it would on a link. */
export function asksForNewTab(event: MouseEvent) {
	const hasModifier = [event.metaKey, event.ctrlKey, event.shiftKey].some(Boolean);
	const isMiddleButton = event.button === MIDDLE_BUTTON;
	return hasModifier || isMiddleButton;
}

export function handleClientClick(event: MouseEvent, pagePath: string, openOverList: (() => void) | undefined) {
	if (!openOverList) {
		return;
	}
	if (isControlClick(event)) {
		return;
	}
	if (isSelectingText()) {
		return;
	}
	if (asksForNewTab(event)) {
		window.open(pagePath, '_blank', 'noopener');
		return;
	}
	openOverList();
}
