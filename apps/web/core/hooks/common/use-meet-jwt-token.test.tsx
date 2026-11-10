/** @jest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';

const mockGetMeetJwtAuthToken = jest.fn();

jest.mock('@/core/services/client/api/auth/meet-auth', () => ({
	meetAuthService: { getMeetJwtAuthToken: (...args: unknown[]) => mockGetMeetJwtAuthToken(...args) }
}));

import { useMeetJwtToken } from './use-meet-jwt-token';

const serverError = () => Object.assign(new Error('Request failed with status code 500'), { statusCode: 500 });

describe('useMeetJwtToken', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mockGetMeetJwtAuthToken.mockReset();
		jest.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	async function passRetryDelays(count: number) {
		for (let index = 0; index < count; index += 1) {
			await act(async () => {
				await jest.advanceTimersByTimeAsync(1_000);
			});
		}
	}

	it('reports a failed access check after its automatic retries', async () => {
		mockGetMeetJwtAuthToken.mockRejectedValue(serverError());

		const { result } = renderHook(() => useMeetJwtToken('team-room'));
		await passRetryDelays(4);

		await waitFor(() => expect(result.current.error).toBeDefined());
		expect(mockGetMeetJwtAuthToken).toHaveBeenCalledTimes(4);
		expect(result.current.meeting).toBeUndefined();
	});

	it('checks again on retry and opens the room, without reloading the page', async () => {
		mockGetMeetJwtAuthToken.mockRejectedValue(serverError());
		const { result } = renderHook(() => useMeetJwtToken('team-room'));
		await passRetryDelays(4);
		await waitFor(() => expect(result.current.error).toBeDefined());

		mockGetMeetJwtAuthToken.mockResolvedValue({ data: { token: 'jwt', room: 'team-room_tenant' } });
		act(() => {
			result.current.retry();
		});

		await waitFor(() =>
			expect(result.current.meeting).toEqual({ requested: 'team-room', token: 'jwt', room: 'team-room_tenant' })
		);
		expect(result.current.error).toBeUndefined();
		expect(mockGetMeetJwtAuthToken).toHaveBeenCalledTimes(5);
	});

	it('gives another room its own automatic retries', async () => {
		mockGetMeetJwtAuthToken.mockRejectedValue(serverError());
		const { result, rerender } = renderHook(({ room }) => useMeetJwtToken(room), {
			initialProps: { room: 'first-room' }
		});
		await passRetryDelays(2);
		expect(result.current.retrying).toBe(true);

		mockGetMeetJwtAuthToken.mockResolvedValue({ data: { token: 'jwt', room: 'second-room_tenant' } });
		rerender({ room: 'second-room' });

		await waitFor(() => expect(result.current.meeting?.room).toBe('second-room_tenant'));
		expect(result.current.retrying).toBe(false);
		expect(result.current.error).toBeUndefined();
	});

	it('stops a pending automatic retry when the page leaves the room', async () => {
		mockGetMeetJwtAuthToken.mockRejectedValue(serverError());
		const { unmount } = renderHook(() => useMeetJwtToken('team-room'));
		await act(async () => {
			await Promise.resolve();
		});

		unmount();
		await passRetryDelays(4);

		expect(mockGetMeetJwtAuthToken).toHaveBeenCalledTimes(1);
	});
});
