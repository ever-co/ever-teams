/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';

let mockPending = false;
jest.mock('@/core/hooks/keyboard/use-shortcuts', () => ({ isShortcutSequencePending: () => mockPending }));

import { HostKeys, HostKeysMapping, useBoundHotkeys, useHotkeys } from './use-hotkeys';

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

/** Lets the readers of the bound hotkeys hear of what the effects above bound or unbound. */
async function settle() {
	await act(async () => {
		await Promise.resolve();
	});
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
		mockPending = false;
	});
});

describe('the bound hotkeys', () => {
	it('name a declaration while a component has it bound, and no longer once it leaves the page', async () => {
		const assign = jest.fn();
		const reader = renderHook(() => useBoundHotkeys());
		expect(reader.result.current.has(HostKeys.ASSIGN_TASK)).toBe(false);

		const binder = renderHook(() => useHotkeys(HostKeys.ASSIGN_TASK, assign));
		await settle();
		expect(reader.result.current.has(HostKeys.ASSIGN_TASK)).toBe(true);

		binder.unmount();
		await settle();
		expect(reader.result.current.has(HostKeys.ASSIGN_TASK)).toBe(false);
	});

	it('keep the same answer while a component binds again on a new callback', async () => {
		const reader = renderHook(() => useBoundHotkeys());
		const firstCallback: () => void = jest.fn();
		const secondCallback: () => void = jest.fn();
		const binder = renderHook((callback: () => void) => useHotkeys(HostKeys.CREATE_TASK, callback), {
			initialProps: firstCallback
		});
		await settle();
		const before = reader.result.current;
		expect(before.has(HostKeys.CREATE_TASK)).toBe(true);

		binder.rerender(secondCallback);
		await settle();

		expect(reader.result.current).toBe(before);
		binder.unmount();
		await settle();
	});
});

describe('the declarations of the hotkeys', () => {
	it('bind for the timer exactly its start keys and its stop keys', () => {
		expect(HostKeys.START_STOP_TIMER).toBe('ctrl+option+],ctrl+alt+],ctrl+option+[,ctrl+alt+[');
		expect(HostKeys.START_STOP_TIMER).toBe(`${HostKeys.START_TIMER},${HostKeys.STOP_TIMER}`);
	});

	it('give every line of the sheet a declaration that a component binds', () => {
		const declared = new Set(Object.values(HostKeys));
		for (const group of HostKeysMapping) {
			for (const line of group.keySequence) {
				expect(declared.has(line.keys)).toBe(true);
				expect(declared.has(line.boundAs ?? line.keys)).toBe(true);
			}
		}
	});
});
