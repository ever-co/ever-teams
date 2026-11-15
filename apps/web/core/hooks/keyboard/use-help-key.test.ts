/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';
import { useHelpKey } from './use-help-key';

/** `?` as a keyboard sends it, from the given element: Shift and the key that prints it. */
function pressQuestionMark(target: HTMLElement = document.body): KeyboardEvent {
	const event = new KeyboardEvent('keydown', {
		key: '?',
		code: 'Slash',
		shiftKey: true,
		bubbles: true,
		cancelable: true
	});
	target.dispatchEvent(event);
	return event;
}

describe('useHelpKey', () => {
	it('opens on `?` pressed outside a field, and takes the key', () => {
		const onPress = jest.fn();
		const { unmount } = renderHook(() => useHelpKey(onPress, true));

		const press = pressQuestionMark();

		expect(onPress).toHaveBeenCalledTimes(1);
		expect(press.defaultPrevented).toBe(true);
		unmount();
	});

	it('leaves a question mark typed in a field to the field', () => {
		const onPress = jest.fn();
		const field = document.createElement('input');
		document.body.appendChild(field);
		const { unmount } = renderHook(() => useHelpKey(onPress, true));

		const press = pressQuestionMark(field);

		expect(onPress).not.toHaveBeenCalled();
		expect(press.defaultPrevented).toBe(false);
		unmount();
		field.remove();
	});

	it('listens to nothing while the registry has the key, nor once unmounted', () => {
		const onPress = jest.fn();
		const switchedOff = renderHook(() => useHelpKey(onPress, false));
		pressQuestionMark();
		switchedOff.unmount();

		const mounted = renderHook(() => useHelpKey(onPress, true));
		mounted.unmount();
		pressQuestionMark();

		expect(onPress).not.toHaveBeenCalled();
	});
});
