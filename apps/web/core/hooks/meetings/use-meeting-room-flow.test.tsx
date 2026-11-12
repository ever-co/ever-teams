/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react';

let mockSearch = '';

jest.mock('next/navigation', () => ({
	useRouter: () => ({ push: jest.fn() }),
	useSearchParams: () => new URLSearchParams(mockSearch)
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), info: jest.fn() } }));

import { useMeetingRoomFlow } from './use-meeting-room-flow';

function openPage(address: string) {
	window.history.replaceState(null, '', address);
	mockSearch = window.location.search;
}

describe('useMeetingRoomFlow', () => {
	it('keeps the request to share the screen, and takes it out of the address people copy', () => {
		const room = 'room+one/two=';
		openPage(`/meet/jitsi?room=${room}&title=Demo%20day&share=screen`);

		const { result } = renderHook(() => useMeetingRoomFlow('Ever-Demo'));

		expect(result.current.shareScreenOnJoin).toBe(true);
		// The rest of the address stays as written: the room keeps its "+" and "/", the title its "%20"
		expect(`${window.location.pathname}${window.location.search}`).toBe(
			`/meet/jitsi?room=${room}&title=Demo%20day`
		);
	});

	it('asks nothing of the screen in a meeting opened from its link', () => {
		openPage('/meet/livekit?roomName=abc');

		const { result } = renderHook(() => useMeetingRoomFlow('abc'));

		expect(result.current.shareScreenOnJoin).toBe(false);
		expect(window.location.search).toBe('?roomName=abc');
	});
});
