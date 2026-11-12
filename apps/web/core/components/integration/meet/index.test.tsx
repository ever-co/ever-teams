/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { JitsiApiLoadError } from '@/core/lib/utils/jitsi-external-api';

const mockLoadJitsiExternalApi = jest.fn();
const mockPush = jest.fn();
const mockLeft = jest.fn();
const mockRoomRenders: Array<{
	domain: string;
	roomName: string;
	onApiReady: (api: unknown) => void;
	configOverwrite: Record<string, unknown>;
	devices: Record<string, string>;
	userInfo: { displayName: string };
}> = [];

jest.mock('@/core/lib/utils/jitsi-external-api', () => ({
	...jest.requireActual('@/core/lib/utils/jitsi-external-api'),
	loadJitsiExternalApi: (...args: unknown[]) => mockLoadJitsiExternalApi(...args)
}));

jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	MEET_DOMAIN: { value: 'https://meet.example.com/' }
}));

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: { domain?: string; count?: number }) => {
		if (values?.domain) return `${key}:${values.domain}`;
		return values?.count === undefined ? key : `${key}:${values.count}`;
	}
}));

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

jest.mock('@jitsi/react-sdk', () => ({
	JitsiMeeting: (props: (typeof mockRoomRenders)[number]): ReactNode => {
		mockRoomRenders.push(props);
		return <div data-testid="jitsi-room">{`${props.domain}|${props.roomName}`}</div>;
	}
}));

import MeetPage from './index';
import type { MeetingJoinChoices } from '@/core/hooks/meetings/use-media-preview';

function fakeRoomApi() {
	const listeners: Record<string, (...args: unknown[]) => void> = {};
	return {
		listeners,
		addListener: jest.fn((event: string, listener: (...args: unknown[]) => void) => {
			listeners[event] = listener;
		}),
		executeCommand: jest.fn(),
		getNumberOfParticipants: jest.fn(() => 3),
		dispose: jest.fn()
	};
}

async function renderRoom(choices?: MeetingJoinChoices, shareScreenOnJoin = false) {
	render(
		<MeetPage
			jwt="jwt"
			roomName="team-room_tenant"
			title="Sprint review"
			choices={choices}
			shareScreenOnJoin={shareScreenOnJoin}
			onLeft={mockLeft}
			onCopyLink={jest.fn()}
		/>
	);
	// The load answer lands in a promise callback
	await act(async () => {
		await Promise.resolve();
	});
}

describe('Jitsi meeting room', () => {
	beforeEach(() => {
		mockLoadJitsiExternalApi.mockReset();
		mockPush.mockReset();
		mockLeft.mockReset();
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

	it('asks the page to renew the token when the person tries again after a lost connection', async () => {
		mockLoadJitsiExternalApi.mockResolvedValue(function JitsiMeetExternalAPI() {
			return undefined;
		});
		const onReconnect = jest.fn();
		render(
			<MeetPage
				jwt="jwt"
				roomName="team-room_tenant"
				title="Sprint review"
				onLeft={mockLeft}
				onCopyLink={jest.fn()}
				onReconnect={onReconnect}
			/>
		);
		await act(async () => {
			await Promise.resolve();
		});
		const lostRoom = fakeRoomApi();
		act(() => {
			mockRoomRenders[0].onApiReady(lostRoom);
		});
		act(() => {
			lostRoom.listeners.connectionFailed();
		});
		expect(onReconnect).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: 'collaborate.TRY_AGAIN' }));

		expect(onReconnect).toHaveBeenCalledTimes(1);
	});

	it("tells the page the person left, from Jitsi's hang-up or from the room bar", async () => {
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
		expect(mockLeft).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByRole('button', { name: 'meetings.LEAVE' }));

		expect(room.executeCommand).toHaveBeenCalledWith('hangup');
		expect(mockLeft).toHaveBeenCalledTimes(2);
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('shows the meeting in its bar: connecting, then who is there once joined', async () => {
		mockLoadJitsiExternalApi.mockResolvedValue(function JitsiMeetExternalAPI() {
			return undefined;
		});
		await renderRoom();
		const room = fakeRoomApi();
		act(() => {
			mockRoomRenders[0].onApiReady(room);
		});
		expect(screen.getByRole('heading', { name: 'Sprint review' })).toBeTruthy();
		expect(screen.getByText('meetings.CONNECTING')).toBeTruthy();

		act(() => {
			room.listeners.videoConferenceJoined();
		});

		expect(screen.queryByText('meetings.CONNECTING')).toBeNull();
		expect(screen.getByText('meetings.PARTICIPANTS:3')).toBeTruthy();
	});

	it("opens the room with the devices and switches picked before joining, past Jitsi's own pre-join page", async () => {
		mockLoadJitsiExternalApi.mockResolvedValue(function JitsiMeetExternalAPI() {
			return undefined;
		});
		await renderRoom({
			audioEnabled: true,
			videoEnabled: false,
			audioInputId: 'mic-2',
			videoInputId: '',
			audioOutputId: '',
			audioInputLabel: 'USB microphone',
			videoInputLabel: '',
			audioOutputLabel: '',
			displayName: 'Ruslan Konviser'
		});

		const { configOverwrite, devices, userInfo } = mockRoomRenders[0];
		expect(configOverwrite).toMatchObject({
			startWithAudioMuted: false,
			startWithVideoMuted: true,
			prejoinConfig: { enabled: false },
			prejoinPageEnabled: false
		});
		expect(devices).toEqual({ audioInput: 'USB microphone' });
		expect(userInfo.displayName).toBe('Ruslan Konviser');
	});

	it('shares the screen once joined, when the meeting was started to show it, and says where to share it otherwise', async () => {
		mockLoadJitsiExternalApi.mockResolvedValue(function JitsiMeetExternalAPI() {
			return undefined;
		});
		await renderRoom(undefined, true);
		const room = fakeRoomApi();
		act(() => {
			mockRoomRenders[0].onApiReady(room);
		});
		expect(room.executeCommand).not.toHaveBeenCalledWith('toggleShareScreen');

		act(() => {
			room.listeners.videoConferenceJoined();
		});
		expect(room.executeCommand).toHaveBeenCalledWith('toggleShareScreen');
		// Until the browser shares, which a refusal never does, the room says how to share by hand
		expect(screen.getByTestId('share-screen-pending').textContent).toContain('meetings.SHARE_SCREEN_JITSI_HINT');

		act(() => {
			room.listeners.screenSharingStatusChanged({ on: true });
		});
		expect(screen.queryByTestId('share-screen-pending')).toBeNull();
	});

	it('leaves the screen alone in a meeting not started to show it', async () => {
		mockLoadJitsiExternalApi.mockResolvedValue(function JitsiMeetExternalAPI() {
			return undefined;
		});
		await renderRoom();
		const room = fakeRoomApi();
		act(() => {
			mockRoomRenders[0].onApiReady(room);
			room.listeners.videoConferenceJoined();
		});

		expect(room.executeCommand).not.toHaveBeenCalledWith('toggleShareScreen');
		expect(screen.queryByTestId('share-screen-pending')).toBeNull();
	});
});
