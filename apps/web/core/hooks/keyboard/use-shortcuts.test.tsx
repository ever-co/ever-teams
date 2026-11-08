/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { effectiveBindings, SHORTCUT_COMMANDS } from '@/core/lib/keyboard/shortcuts';

let mockBindings: ReturnType<typeof effectiveBindings> | null = null;

jest.mock('./use-keyboard-preferences', () => ({
	useKeyboardPreferences: () => {
		mockBindings ??= effectiveBindings(SHORTCUT_COMMANDS, null);
		return { bindings: mockBindings, overrides: {}, setOverrides: jest.fn(), canRebind: true };
	}
}));

import { isShortcutSequencePending, useShortcutHandlers, useShortcutListener } from './use-shortcuts';

function Registry({ handlers }: Readonly<{ handlers: Record<string, () => void> }>) {
	useShortcutHandlers(handlers);
	useShortcutListener();
	return null;
}

describe('the shortcut listener', () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});
	afterEach(() => {
		jest.useRealTimers();
	});

	it('says a sequence is under way between its two keys, so the list leaves the second one to it', () => {
		const goOverdue = jest.fn();
		const { unmount } = render(<Registry handlers={{ goOverdue }} />);
		expect(isShortcutSequencePending()).toBe(false);
		fireEvent.keyDown(window, { code: 'KeyG', key: 'g' });
		expect(isShortcutSequencePending()).toBe(true);
		fireEvent.keyDown(window, { code: 'KeyO', key: 'o' });
		expect(goOverdue).toHaveBeenCalledTimes(1);
		expect(isShortcutSequencePending()).toBe(false);

		// The first key alone lapses after a second.
		fireEvent.keyDown(window, { code: 'KeyG', key: 'g' });
		expect(isShortcutSequencePending()).toBe(true);
		act(() => {
			jest.advanceTimersByTime(1000);
		});
		expect(isShortcutSequencePending()).toBe(false);

		fireEvent.keyDown(window, { code: 'KeyG', key: 'g' });
		unmount();
		expect(isShortcutSequencePending()).toBe(false);
	});
});
