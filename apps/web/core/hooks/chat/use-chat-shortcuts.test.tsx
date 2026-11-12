/**
 * @jest-environment jsdom
 */
import { fireEvent, renderHook } from '@testing-library/react';

let mockOverrides: Record<string, string> = {};
jest.mock('@/core/hooks/keyboard/use-keyboard-preferences', () => {
	const registry = jest.requireActual<typeof import('@/core/lib/keyboard/shortcuts')>(
		'@/core/lib/keyboard/shortcuts'
	);
	return {
		useKeyboardPreferences: () => ({
			bindings: registry.effectiveBindings(registry.SHORTCUT_COMMANDS, mockOverrides),
			overrides: mockOverrides,
			setOverrides: jest.fn(),
			canRebind: true
		})
	};
});

import { useChatShortcuts } from './use-chat-shortcuts';

function handlers() {
	return {
		chatPrevious: jest.fn(),
		chatNext: jest.fn(),
		chatPreviousUnread: jest.fn(),
		chatNextUnread: jest.fn(),
		chatUnreads: jest.fn(),
		chatMarkAllRead: jest.fn()
	};
}

afterEach(() => {
	mockOverrides = {};
	document.body.innerHTML = '';
});

describe('useChatShortcuts', () => {
	it('runs the command of each key of the chat page', () => {
		const run = handlers();
		renderHook(() => useChatShortcuts(run));
		fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown', altKey: true });
		fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp', altKey: true });
		fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown', altKey: true, shiftKey: true });
		fireEvent.keyDown(window, { key: 'ArrowUp', code: 'ArrowUp', altKey: true, shiftKey: true });
		fireEvent.keyDown(window, { key: 'A', code: 'KeyA', ctrlKey: true, shiftKey: true });
		fireEvent.keyDown(window, { key: 'Escape', code: 'Escape', shiftKey: true });
		for (const handler of Object.values(run)) expect(handler).toHaveBeenCalledTimes(1);
	});

	it('works from the composer for a chord with Alt, but leaves a plain key to the text', () => {
		mockOverrides = { chatNext: 'b' };
		const run = handlers();
		renderHook(() => useChatShortcuts(run));
		const field = document.createElement('textarea');
		document.body.appendChild(field);
		fireEvent.keyDown(field, { key: 'b', code: 'KeyB' });
		expect(run.chatNext).not.toHaveBeenCalled();
		fireEvent.keyDown(field, { key: 'ArrowUp', code: 'ArrowUp', altKey: true });
		expect(run.chatPrevious).toHaveBeenCalledTimes(1);
		fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });
		expect(run.chatNext).toHaveBeenCalledTimes(1);
	});

	it('does nothing under an open dialog, for a handled key, or when off', () => {
		const run = handlers();
		const { rerender } = renderHook(({ enabled }) => useChatShortcuts(run, enabled), {
			initialProps: { enabled: true }
		});
		const dialog = document.createElement('div');
		dialog.setAttribute('role', 'dialog');
		dialog.getClientRects = () => [{}] as unknown as DOMRectList;
		document.body.appendChild(dialog);
		fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown', altKey: true });
		expect(run.chatNext).not.toHaveBeenCalled();
		dialog.remove();

		const handled = new KeyboardEvent('keydown', {
			key: 'Escape',
			code: 'Escape',
			shiftKey: true,
			cancelable: true
		});
		handled.preventDefault();
		window.dispatchEvent(handled);
		expect(run.chatMarkAllRead).not.toHaveBeenCalled();

		rerender({ enabled: false });
		fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown', altKey: true });
		expect(run.chatNext).not.toHaveBeenCalled();
	});
});
