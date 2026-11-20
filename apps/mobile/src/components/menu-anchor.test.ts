import { act, renderHook } from '@testing-library/react-native';
import type { View } from 'react-native';
import { useMenuAnchor } from './menu-anchor';

function chipAt(x: number, y: number, width: number, height: number): View {
	const chip = {
		measureInWindow: (done: (x: number, y: number, width: number, height: number) => void) =>
			done(x, y, width, height)
	};
	return chip as unknown as View;
}

describe('the chip a menu opens under', () => {
	it('is measured on the screen before the menu opens', async () => {
		const { result } = await renderHook(() => useMenuAnchor());
		const chip = {
			measureInWindow: (done: (x: number, y: number, width: number, height: number) => void) =>
				done(16, 420, 120, 30)
		};
		result.current.anchorRef.current = chip as unknown as View;
		const open = jest.fn();

		await act(async () => result.current.openFromAnchor(open));

		expect(result.current.anchor).toEqual({ x: 16, y: 420, width: 120, height: 30 });
		expect(open).toHaveBeenCalledTimes(1);
	});

	it('opens without a place while the chip is not on screen', async () => {
		const { result } = await renderHook(() => useMenuAnchor());
		const open = jest.fn();

		await act(async () => result.current.openFromAnchor(open));

		expect(result.current.anchor).toBeNull();
		expect(open).toHaveBeenCalledTimes(1);
	});

	it('forgets the place it measured before when the chip has left the screen', async () => {
		const { result } = await renderHook(() => useMenuAnchor());
		result.current.anchorRef.current = chipAt(16, 420, 120, 30);
		await act(async () => result.current.openFromAnchor(jest.fn()));
		expect(result.current.anchor).not.toBeNull();

		result.current.anchorRef.current = null;
		await act(async () => result.current.openFromAnchor(jest.fn()));

		expect(result.current.anchor).toBeNull();
	});

	it('opens without a place while the chip is not laid out yet', async () => {
		const { result } = await renderHook(() => useMenuAnchor());
		result.current.anchorRef.current = chipAt(0, 0, 0, 0);
		const open = jest.fn();

		await act(async () => result.current.openFromAnchor(open));

		expect(result.current.anchor).toBeNull();
		expect(open).toHaveBeenCalledTimes(1);
	});
});
