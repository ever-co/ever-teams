import { renderHook } from '@testing-library/react-native';
import { useOnceReady } from './use-once-ready';

describe('useOnceReady', () => {
	it('waits until the screen is ready, then runs once', async () => {
		const action = jest.fn();
		const hook = await renderHook((props: { ready: boolean }) => useOnceReady(true, props.ready, action), {
			initialProps: { ready: false }
		});
		expect(action).not.toHaveBeenCalled();

		await hook.rerender({ ready: true });
		await hook.rerender({ ready: true });

		expect(action).toHaveBeenCalledTimes(1);
	});

	it('runs nothing when nothing is pending', async () => {
		const action = jest.fn();
		await renderHook(() => useOnceReady(false, true, action));
		expect(action).not.toHaveBeenCalled();
	});
});
