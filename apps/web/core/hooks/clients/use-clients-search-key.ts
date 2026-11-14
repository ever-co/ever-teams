'use client';

import { useEffect, type RefObject } from 'react';
import { TASK_SEARCH_FOCUS_ID } from '@/core/components/tasks/task-search-field';
import { useAnsweredKeys } from '@/core/hooks/keyboard/use-answered-keys';

/** The key the shortcuts sheet lists for "/" while this list answers it. */
const SEARCH_FOCUS_KEY_IDS: readonly string[] = [TASK_SEARCH_FOCUS_ID];

function isTypingTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) {
		return false;
	}
	const isField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
	return isField || target.isContentEditable;
}

function hasModifier(event: KeyboardEvent) {
	return [event.metaKey, event.ctrlKey, event.altKey].some(Boolean);
}

/** A dialog, or the sheet of a client, holds the keys pressed in it: the list's search behind it is not theirs. */
function isInDialog(target: EventTarget | null) {
	if (!(target instanceof Element)) {
		return false;
	}
	return target.closest('[role="dialog"],[role="alertdialog"]') !== null;
}

/**
 * "/" pressed outside a field jumps into the search field held by the given box, as on the team's tasks. A key
 * something else already answered, or pressed in a dialog, is left alone.
 */
export function useClientsSearchKey(boxRef: RefObject<HTMLElement | null>) {
	useAnsweredKeys(SEARCH_FOCUS_KEY_IDS);
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const isSlash = event.key === '/';
			if (!isSlash) {
				return;
			}
			if (event.defaultPrevented || hasModifier(event)) {
				return;
			}
			if (isTypingTarget(event.target) || isInDialog(event.target)) {
				return;
			}
			const field = boxRef.current?.querySelector('input');
			if (!field) {
				return;
			}
			event.preventDefault();
			field.focus();
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [boxRef]);
}
