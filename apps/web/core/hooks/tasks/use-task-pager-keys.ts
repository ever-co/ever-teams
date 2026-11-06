'use client';

import { useEffect, useEffectEvent, type RefObject } from 'react';

const PREVIOUS_KEY = 'k';

const NEXT_KEY = 'j';

const INTERACTIVE_SELECTOR = 'input, textarea, select, [contenteditable="true"], [role="menu"], [role="listbox"]';

const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"]';

function isTypingTarget(target: EventTarget | null) {
	if (!(target instanceof Element)) {
		return false;
	}
	return Boolean(target.closest(INTERACTIVE_SELECTOR));
}

/** A key pressed in a dialog opened over the pager's surface belongs to that dialog (the drawer is a dialog too). */
function isInsideAnotherDialog(target: EventTarget | null, host: Element | null) {
	if (!(target instanceof Element)) {
		return false;
	}
	const targetDialog = target.closest(DIALOG_SELECTOR);
	if (!targetDialog) {
		return false;
	}
	const hostDialog = host?.closest(DIALOG_SELECTOR) ?? null;
	return targetDialog !== hostDialog;
}

function hasModifier(event: KeyboardEvent) {
	return [event.metaKey, event.ctrlKey, event.altKey, event.shiftKey].some(Boolean);
}

export function useTaskPagerKeys({
	previousId,
	nextId,
	onNavigate,
	enabled = true,
	hostRef
}: {
	previousId: string | null;
	nextId: string | null;
	onNavigate: (taskId: string) => void;
	hostRef?: RefObject<Element | null>;
	/** The drawer keeps its content mounted while closed, so its keys must be switched off. */
	enabled?: boolean;
}) {
	const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
		const isHandled = event.defaultPrevented;
		const isShortcut = hasModifier(event);
		const isTyping = isTypingTarget(event.target);
		const isHeldDown = event.repeat;
		const isInDialog = isInsideAnotherDialog(event.target, hostRef?.current ?? null);
		const isIgnored = isHandled || isShortcut || isTyping || isHeldDown || isInDialog;
		if (isIgnored) {
			return;
		}
		const key = event.key.toLowerCase();
		if (key === PREVIOUS_KEY && previousId) {
			event.preventDefault();
			onNavigate(previousId);
			return;
		}
		if (key === NEXT_KEY && nextId) {
			event.preventDefault();
			onNavigate(nextId);
		}
	});

	useEffect(() => {
		if (!enabled) {
			return;
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [enabled]);
}
