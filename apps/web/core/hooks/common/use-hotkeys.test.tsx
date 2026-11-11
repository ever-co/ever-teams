/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';

let mockPending = false;
jest.mock('@/core/hooks/keyboard/use-shortcuts', () => ({ isShortcutSequencePending: () => mockPending }));

import { useHotkeys } from './use-hotkeys';

function pressH() {
	const event = new KeyboardEvent('keydown', {
		key: 'h',
		code: 'KeyH',
		keyCode: 72,
		bubbles: true,
		cancelable: true
	});
	document.body.dispatchEvent(event);
	return event;
}

describe('the legacy hotkeys', () => {
	it('run their key, and leave the second key of a registry sequence to the registry (`G`, then `H`)', () => {
		const help = jest.fn();
		const { unmount } = renderHook(() => useHotkeys('shift+h,h', help));

		const plain = pressH();
		expect(help).toHaveBeenCalledTimes(1);
		expect(plain.defaultPrevented).toBe(true);

		mockPending = true;
		const second = pressH();
		expect(help).toHaveBeenCalledTimes(1);
		// Not prevented: the registry's listener (on the window) still sees it and runs `G H`.
		expect(second.defaultPrevented).toBe(false);
		unmount();
	});
});
