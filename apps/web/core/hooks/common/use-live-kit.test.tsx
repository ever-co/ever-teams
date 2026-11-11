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

	it('drops the token in hand on refresh and waits for a new one, for a rejoin after it expired', async () => {
		mockTokenLiveKitRoom.mockResolvedValueOnce({ token: 'first' });
		const { result } = renderHook(() => useTokenLiveKit({ roomName: 'room-a' }));
		await waitFor(() => expect(result.current.token).toBe('first'));

		let answer: (value: unknown) => void = () => undefined;
		mockTokenLiveKitRoom.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
		act(() => {
			result.current.refresh();
		});

		expect(result.current.token).toBeNull();
		await act(async () => {
			answer({ token: 'second' });
		});
		await waitFor(() => expect(result.current.token).toBe('second'));
		expect(mockTokenLiveKitRoom).toHaveBeenCalledTimes(2);
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

	it('does not bring back an old failure when the user returns to a room', async () => {
		mockTokenLiveKitRoom.mockRejectedValueOnce(new Error('refused'));
		const { result, rerender } = renderHook(({ roomName }) => useTokenLiveKit({ roomName }), {
			initialProps: { roomName: 'room-a' }
		});
		await waitFor(() => expect(result.current.error).toBeTruthy());

		mockTokenLiveKitRoom.mockResolvedValueOnce({ token: 'room-b-token' });
		rerender({ roomName: 'room-b' });
		await waitFor(() => expect(result.current.token).toBe('room-b-token'));

		let issueRoomA: (answer: { token: string }) => void = () => undefined;
		mockTokenLiveKitRoom.mockReturnValueOnce(new Promise((resolve) => (issueRoomA = resolve)));
		rerender({ roomName: 'room-a' });
		expect(result.current.error).toBeNull();

		await act(async () => {
			issueRoomA({ token: 'room-a-token' });
		});
		expect(result.current.token).toBe('room-a-token');
		expect(result.current.error).toBeNull();
	});
});
