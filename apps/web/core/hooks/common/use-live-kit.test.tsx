/** @jest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';

const mockTokenLiveKitRoom = jest.fn();

jest.mock('@/core/services/server/livekitroom', () => ({
	tokenLiveKitRoom: (...args: unknown[]) => mockTokenLiveKitRoom(...args)
}));

import { useTokenLiveKit } from './use-live-kit';

describe('useTokenLiveKit', () => {
	beforeEach(() => {
		mockTokenLiveKitRoom.mockReset();
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('reports a refused room token, then gets one on retry', async () => {
		mockTokenLiveKitRoom.mockRejectedValueOnce(Object.assign(new Error('refused'), { status: 500 }));

		const { result } = renderHook(() => useTokenLiveKit({ roomName: 'room-a' }));
		await waitFor(() => expect(result.current.error).toBeTruthy());
		expect(result.current.token).toBeNull();

		mockTokenLiveKitRoom.mockResolvedValueOnce({ token: 'livekit-token' });
		act(() => {
			result.current.retry();
		});

		await waitFor(() => expect(result.current.token).toBe('livekit-token'));
		expect(result.current.error).toBeNull();
	});

	it('treats an answer without a token as a failure', async () => {
		mockTokenLiveKitRoom.mockResolvedValueOnce({});

		const { result } = renderHook(() => useTokenLiveKit({ roomName: 'room-a' }));

		await waitFor(() => expect(result.current.error).toBeTruthy());
		expect(result.current.token).toBeNull();
	});

	it("does not report a failure of the room the user left as the new room's", async () => {
		mockTokenLiveKitRoom.mockRejectedValueOnce(new Error('refused'));
		const { result, rerender } = renderHook(({ roomName }) => useTokenLiveKit({ roomName }), {
			initialProps: { roomName: 'room-a' }
		});
		await waitFor(() => expect(result.current.error).toBeTruthy());

		mockTokenLiveKitRoom.mockResolvedValueOnce({ token: 'room-b-token' });
		rerender({ roomName: 'room-b' });

		expect(result.current.error).toBeNull();
		await waitFor(() => expect(result.current.token).toBe('room-b-token'));
	});
});
