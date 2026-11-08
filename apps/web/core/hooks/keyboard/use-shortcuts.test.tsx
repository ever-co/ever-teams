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

/** The bindings as a refreshed user gives them: equal, but a new map (the listener is set up again). */
function refreshBindings() {
	mockBindings = effectiveBindings(SHORTCUT_COMMANDS, null);
}

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

	it('keeps a sequence under way when the listener is set up again (the user refreshed between the keys)', () => {
		const goOverdue = jest.fn();
		const { rerender, unmount } = render(<Registry handlers={{ goOverdue }} />);
		fireEvent.keyDown(window, { code: 'KeyG', key: 'g' });
		refreshBindings();
		rerender(<Registry handlers={{ goOverdue }} />);
		expect(isShortcutSequencePending()).toBe(true);
		fireEvent.keyDown(window, { code: 'KeyO', key: 'o' });
		expect(goOverdue).toHaveBeenCalledTimes(1);
		unmount();
	});

	it('drops a sequence under way when the bindings in force change between the keys', () => {
		const goOverdue = jest.fn();
		const { rerender, unmount } = render(<Registry handlers={{ goOverdue }} />);
		// Disabled from another device between `G` and `O`: the list has `O` again at once.
		fireEvent.keyDown(window, { code: 'KeyG', key: 'g' });
		mockBindings = effectiveBindings(SHORTCUT_COMMANDS, { goOverdue: '' });
		rerender(<Registry handlers={{ goOverdue }} />);
		expect(isShortcutSequencePending()).toBe(false);
		fireEvent.keyDown(window, { code: 'KeyO', key: 'o' });
		expect(goOverdue).not.toHaveBeenCalled();
		// Rebound between the keys: the new binding works from its first key.
		mockBindings = effectiveBindings(SHORTCUT_COMMANDS, null);
		rerender(<Registry handlers={{ goOverdue }} />);
		fireEvent.keyDown(window, { code: 'KeyG', key: 'g' });
		mockBindings = effectiveBindings(SHORTCUT_COMMANDS, { goOverdue: 'g x' });
		rerender(<Registry handlers={{ goOverdue }} />);
		expect(isShortcutSequencePending()).toBe(false);
		fireEvent.keyDown(window, { code: 'KeyX', key: 'x' });
		expect(goOverdue).not.toHaveBeenCalled();
		fireEvent.keyDown(window, { code: 'KeyG', key: 'g' });
		fireEvent.keyDown(window, { code: 'KeyX', key: 'x' });
		expect(goOverdue).toHaveBeenCalledTimes(1);
		unmount();
	});
});
