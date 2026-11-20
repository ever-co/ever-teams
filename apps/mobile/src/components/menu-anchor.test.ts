import { act, renderHook } from '@testing-library/react-native';
import type { View } from 'react-native';
import { useMenuAnchor } from './menu-anchor';

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
});
