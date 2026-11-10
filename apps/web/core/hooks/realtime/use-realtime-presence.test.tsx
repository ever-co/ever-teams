/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';

const mockPresence = jest.fn(async () => ({}));
const mockPresenceOnUnload = jest.fn();
let mockStatus = 'connected';

jest.mock('jotai', () => ({ useAtomValue: () => mockStatus }));
jest.mock('@/core/stores/common/realtime', () => ({ realtimeStatusAtom: 'realtime-status' }));
jest.mock('@/core/services/client/api/realtime', () => ({
	realtimeService: {
		presence: (...args: unknown[]) => mockPresence(...(args as [])),
		presenceOnUnload: (...args: unknown[]) => mockPresenceOnUnload(...(args as []))
	}
}));
jest.mock('@/core/services/client/api-error.service', () => ({ ApiErrorService: { isApiError: () => false } }));

import { REALTIME_PRESENCE_HEARTBEAT_MS } from '@/core/lib/realtime/config';
import { realtimeConnectionId, useRealtimePresence } from './use-realtime-presence';

describe('useRealtimePresence', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mockPresence.mockClear();
		mockPresenceOnUnload.mockClear();
		mockStatus = 'connected';
		jest.spyOn(document, 'hasFocus').mockReturnValue(true);
		Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
	});

	afterEach(() => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	});

	it('names one connection per tab: the same id for every report of this page', () => {
		const id = realtimeConnectionId();
		expect(id).toMatch(/^[\w-]{1,64}$/);
		expect(realtimeConnectionId()).toBe(id);
	});

	it('reports active under the tab connection on connect, and again every minute unchanged (the heartbeat)', () => {
		renderHook(() => useRealtimePresence());
		const id = realtimeConnectionId();
		expect(mockPresence).toHaveBeenCalledWith('active', id);
		expect(mockPresence).toHaveBeenCalledTimes(1);
		act(() => void jest.advanceTimersByTime(REALTIME_PRESENCE_HEARTBEAT_MS));
		expect(mockPresence).toHaveBeenCalledTimes(2);
		expect(mockPresence).toHaveBeenLastCalledWith('active', id);
		act(() => void jest.advanceTimersByTime(REALTIME_PRESENCE_HEARTBEAT_MS));
		expect(mockPresence).toHaveBeenCalledTimes(3);
	});

	it('sends a transition at once, but not the same state twice between heartbeats', () => {
		renderHook(() => useRealtimePresence());
		const id = realtimeConnectionId();
		(document.hasFocus as jest.Mock).mockReturnValue(false);
		act(() => void window.dispatchEvent(new Event('blur')));
		expect(mockPresence).toHaveBeenLastCalledWith('away', id);
		act(() => void window.dispatchEvent(new Event('blur')));
		act(() => void document.dispatchEvent(new Event('visibilitychange')));
		expect(mockPresence).toHaveBeenCalledTimes(2);
	});

	it('reports offline for this tab connection when the page goes away', () => {
		renderHook(() => useRealtimePresence());
		act(() => void window.dispatchEvent(new Event('pagehide')));
		expect(mockPresenceOnUnload).toHaveBeenCalledWith('offline', realtimeConnectionId());
	});

	it('reports nothing while the live connection is down', () => {
		mockStatus = 'reconnecting';
		renderHook(() => useRealtimePresence());
		act(() => void jest.advanceTimersByTime(REALTIME_PRESENCE_HEARTBEAT_MS * 3));
		expect(mockPresence).not.toHaveBeenCalled();
	});
});
