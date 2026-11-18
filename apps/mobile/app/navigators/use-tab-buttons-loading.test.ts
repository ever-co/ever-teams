import { act, renderHook } from '@testing-library/react-native';
import { useTabButtonsLoading } from './use-tab-buttons-loading';

describe('the tab buttons', () => {
	it('wait for the first screens once, and not when the navigator mounts again for a new language', async () => {
		const first = await renderHook(() => useTabButtonsLoading());
		expect(first.result.current).toBe(true);

		await act(async () => {
			jest.advanceTimersByTime(3000);
		});
		expect(first.result.current).toBe(false);
		await first.unmount();

		const again = await renderHook(() => useTabButtonsLoading());
		expect(again.result.current).toBe(false);
	});
});
