'use client';

import { useEffect, type RefObject } from 'react';

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

/** "/" pressed outside a field jumps into the search field held by the given box, as on the team's tasks. */
export function useClientsSearchKey(boxRef: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const isSlash = event.key === '/';
			if (!isSlash) {
				return;
			}
			if (hasModifier(event)) {
				return;
			}
			if (isTypingTarget(event.target)) {
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
