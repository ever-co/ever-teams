/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { JitsiApiLoadError } from '@/core/lib/utils/jitsi-external-api';

const mockLoadJitsiExternalApi = jest.fn();
const mockPush = jest.fn();
const mockRoomRenders: Array<{ domain: string; roomName: string; onApiReady: (api: unknown) => void }> = [];

jest.mock('@/core/lib/utils/jitsi-external-api', () => ({
	...jest.requireActual('@/core/lib/utils/jitsi-external-api'),
	loadJitsiExternalApi: (...args: unknown[]) => mockLoadJitsiExternalApi(...args)
}));

jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	MEET_DOMAIN: { value: 'https://meet.example.com/' }
}));

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: { domain?: string }) =>
		values?.domain ? `${key}:${values.domain}` : key
}));

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@jitsi/react-sdk', () => ({
	JitsiMeeting: (props: { domain: string; roomName: string; onApiReady: (api: unknown) => void }): ReactNode => {
		mockRoomRenders.push(props);
		return <div data-testid="jitsi-room">{`${props.domain}|${props.roomName}`}</div>;
	}
}));

import MeetPage from './index';

function fakeRoomApi() {
	const listeners: Record<string, () => void> = {};
	return {
		listeners,
		addListener: jest.fn((event: string, listener: () => void) => {
			listeners[event] = listener;
		}),
		dispose: jest.fn()
	};
}

async function renderRoom() {
	render(<MeetPage jwt="jwt" roomName="team-room_tenant" />);
	// The load answer lands in a promise callback
	await act(async () => {
		await Promise.resolve();
	});
}

describe('Jitsi meeting room', () => {
	beforeEach(() => {
		mockLoadJitsiExternalApi.mockReset();
		mockPush.mockReset();
		mockRoomRenders.length = 0;
		// The error notice's orb asks whether motion is reduced; jsdom has no matchMedia
		window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
	});

	it('connects to the meeting server before opening the room', async () => {
		mockLoadJitsiExternalApi.mockReturnValue(new Promise(() => undefined));

		await renderRoom();

		expect(screen.getByText('collaborate.CONNECTING_MEETING_SERVER')).toBeTruthy();
		expect(screen.queryByTestId('jitsi-room')).toBeNull();
	});

	it("opens the room on the server's bare host once its API is there", async () => {
		mockLoadJitsiExternalApi.mockResolvedValue(function JitsiMeetExternalAPI() {
			return undefined;
		});

		await renderRoom();

		expect(mockLoadJitsiExternalApi).toHaveBeenCalledWith('meet.example.com');
		expect(screen.getByTestId('jitsi-room').textContent).toBe('meet.example.com|team-room_tenant');
	});

	it('says why the meeting server failed and asks it again on retry', async () => {
		mockLoadJitsiExternalApi.mockRejectedValueOnce(new JitsiApiLoadError('unreachable', 'meet.example.com'));

		await renderRoom();

		expect(screen.getByText('collaborate.MEETING_UNAVAILABLE')).toBeTruthy();
		expect(screen.getByText('collaborate.MEETING_SERVER_UNREACHABLE:meet.example.com')).toBeTruthy();

		mockLoadJitsiExternalApi.mockResolvedValueOnce(function JitsiMeetExternalAPI() {
			return undefined;
		});
		fireEvent.click(screen.getByRole('button', { name: 'collaborate.TRY_AGAIN' }));
		await act(async () => {
			await Promise.resolve();
		});

		expect(mockLoadJitsiExternalApi).toHaveBeenCalledTimes(2);
		expect(screen.getByTestId('jitsi-room')).toBeTruthy();
	});

	it('offers no retry when no meeting server is set up, only the way home', async () => {
		mockLoadJitsiExternalApi.mockRejectedValueOnce(new JitsiApiLoadError('not-configured', ''));

		await renderRoom();

		expect(screen.getByText(/^collaborate\.MEETING_SERVER_NOT_CONFIGURED/)).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'collaborate.TRY_AGAIN' })).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'collaborate.BACK_HOME' }));
		expect(mockPush).toHaveBeenCalledWith('/');
	});

	it('rejoins after a lost connection and ends the room it lost', async () => {
		mockLoadJitsiExternalApi.mockResolvedValue(function JitsiMeetExternalAPI() {
			return undefined;
		});
		await renderRoom();
		const lostRoom = fakeRoomApi();
		act(() => {
			mockRoomRenders[0].onApiReady(lostRoom);
		});

		act(() => {
			lostRoom.listeners.connectionFailed();
		});
		expect(screen.getByText('collaborate.MEETING_DISCONNECTED')).toBeTruthy();
		expect(screen.queryByTestId('jitsi-room')).toBeNull();

		fireEvent.click(screen.getByRole('button', { name: 'collaborate.TRY_AGAIN' }));

		expect(lostRoom.dispose).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId('jitsi-room')).toBeTruthy();
	});

	it('goes home when the meeting is left or closed', async () => {
		mockLoadJitsiExternalApi.mockResolvedValue(function JitsiMeetExternalAPI() {
			return undefined;
		});
		await renderRoom();
		const room = fakeRoomApi();
		act(() => {
			mockRoomRenders[0].onApiReady(room);
		});

		act(() => {
			room.listeners.videoConferenceLeft();
		});

		expect(mockPush).toHaveBeenCalledWith('/');
	});
});
