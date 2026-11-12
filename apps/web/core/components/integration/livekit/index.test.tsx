/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockDisconnect = jest.fn();
const mockSetScreenShareEnabled = jest.fn();
let mockLocalPermissions: { canPublishSources: number[] } | undefined;
const mockRoomProps: Array<Record<string, unknown>> = [];
const mockBarProps: Array<{ leave: () => void; participantCount: number | null; joinedAt: number | null }> = [];

jest.mock('@livekit/components-react', () => ({
	LiveKitRoom: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => {
		mockRoomProps.push(props);
		return <div data-testid="livekit-room">{children}</div>;
	},
	useRoomContext: () => ({
		disconnect: mockDisconnect,
		localParticipant: { setScreenShareEnabled: mockSetScreenShareEnabled, permissions: mockLocalPermissions }
	}),
	useParticipants: () => [{}, {}]
}));
jest.mock('@livekit/components-styles', () => ({}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('livekit-client', () => ({
	VideoPresets: {
		h720: { resolution: { width: 1280, height: 720 } },
		h360: { resolution: { width: 640, height: 360 } }
	}
}));
jest.mock('./meet-conference', () => ({ MeetConference: () => <div data-testid="video-conference" /> }));
jest.mock('./settings-livekit', () => ({
	SettingsMenu: () => null,
	NoiseFilterChoiceContext: jest.requireActual('react').createContext(true)
}));
jest.mock('@/core/components/pages/meet/meet-room-skeleton', () => ({
	MeetRoomSkeleton: () => <div data-testid="meet-room-skeleton" />
}));
jest.mock('@/core/components/pages/meet/room/meet-room-bar', () => ({
	MeetRoomBar: (props: (typeof mockBarProps)[number]) => {
		mockBarProps.push(props);
		return null;
	}
}));

import LiveKitPage from './index';

const lastRoomProps = () => mockRoomProps[mockRoomProps.length - 1];
const lastBarProps = () => mockBarProps[mockBarProps.length - 1];

describe('LiveKitPage', () => {
	const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');

	beforeEach(() => {
		mockDisconnect.mockReset();
		mockSetScreenShareEnabled.mockReset().mockResolvedValue(undefined);
		mockLocalPermissions = undefined;
		mockRoomProps.length = 0;
		mockBarProps.length = 0;
	});

	afterEach(() => {
		if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
		else delete (navigator as { mediaDevices?: unknown }).mediaDevices;
	});

	it('does not ask for the camera and microphone again when the user leaves the room', () => {
		const getUserMedia = jest.fn(() => Promise.resolve({ getTracks: () => [] }));
		Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });

		const { unmount } = render(
			<LiveKitPage
				userChoices={{ audioEnabled: true, videoEnabled: true } as never}
				token="room-token"
				liveKitUrl="wss://livekit.example.test"
			/>
		);
		unmount();

		expect(getUserMedia).not.toHaveBeenCalled();
	});

	it('opens the room with the devices and switches picked before joining', () => {
		render(
			<LiveKitPage
				userChoices={{
					audioEnabled: false,
					videoEnabled: true,
					audioDeviceId: 'mic-2',
					videoDeviceId: 'camera-3',
					username: 'Ruslan'
				}}
				audioOutputDeviceId="speaker-1"
				token="room-token"
				liveKitUrl="wss://livekit.example.test"
			/>
		);

		expect(lastRoomProps()).toMatchObject({
			audio: false,
			video: true,
			options: {
				videoCaptureDefaults: { deviceId: 'camera-3' },
				audioCaptureDefaults: { deviceId: 'mic-2' },
				audioOutput: { deviceId: 'speaker-1' }
			}
		});
	});

	it('shows the room bar while connecting, then the conference, and leaves by disconnecting the room', () => {
		const { getByTestId, queryByTestId } = render(
			<LiveKitPage
				userChoices={{ audioEnabled: true, videoEnabled: true } as never}
				token="room-token"
				liveKitUrl="wss://livekit.example.test"
			/>
		);
		expect(lastBarProps()).toMatchObject({ joinedAt: null, participantCount: null });
		expect(queryByTestId('video-conference')).toBeNull();

		act(() => {
			(lastRoomProps().onConnected as () => void)();
		});

		expect(getByTestId('video-conference')).toBeTruthy();
		expect(lastBarProps().participantCount).toBe(2);
		expect(lastBarProps().joinedAt).toEqual(expect.any(Number));

		lastBarProps().leave();
		expect(mockDisconnect).toHaveBeenCalledTimes(1);
	});

	it('shares the screen once the room is joined, when the meeting was started to show it', async () => {
		render(
			<LiveKitPage
				userChoices={{ audioEnabled: true, videoEnabled: true } as never}
				token="room-token"
				liveKitUrl="wss://livekit.example.test"
				shareScreenOnJoin
			/>
		);
		expect(mockSetScreenShareEnabled).not.toHaveBeenCalled();

		await act(async () => {
			(lastRoomProps().onConnected as () => void)();
		});

		expect(mockSetScreenShareEnabled).toHaveBeenCalledTimes(1);
		expect(mockSetScreenShareEnabled).toHaveBeenCalledWith(true, expect.objectContaining({ audio: true }));
		expect(screen.queryByTestId('share-screen-refused')).toBeNull();
	});

	it('shares the screen without its sound where the room does not let the person publish it', async () => {
		// The camera, the microphone and the screen (sources 1 to 3), not the screen's sound (4)
		mockLocalPermissions = { canPublishSources: [1, 2, 3] };
		render(
			<LiveKitPage
				userChoices={{ audioEnabled: true, videoEnabled: true } as never}
				token="room-token"
				liveKitUrl="wss://livekit.example.test"
				shareScreenOnJoin
			/>
		);

		await act(async () => {
			(lastRoomProps().onConnected as () => void)();
		});

		expect(mockSetScreenShareEnabled).toHaveBeenCalledWith(true, expect.objectContaining({ audio: false }));
	});

	it('offers the click a browser wants when it refuses to share the screen without one', async () => {
		mockSetScreenShareEnabled.mockRejectedValueOnce(
			Object.assign(new Error('no gesture'), { name: 'InvalidStateError' })
		);
		render(
			<LiveKitPage
				userChoices={{ audioEnabled: true, videoEnabled: true } as never}
				token="room-token"
				liveKitUrl="wss://livekit.example.test"
				shareScreenOnJoin
			/>
		);
		await act(async () => {
			(lastRoomProps().onConnected as () => void)();
		});

		const refused = screen.getByTestId('share-screen-refused');
		expect(refused.textContent).toContain('meetings.SHARE_SCREEN_REFUSED');
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'meetings.SHARE_SCREEN' }));
		});

		expect(mockSetScreenShareEnabled).toHaveBeenCalledTimes(2);
		expect(screen.queryByTestId('share-screen-refused')).toBeNull();
	});

	it('leaves the screen alone in a meeting not started to show it', async () => {
		render(
			<LiveKitPage
				userChoices={{ audioEnabled: true, videoEnabled: true } as never}
				token="room-token"
				liveKitUrl="wss://livekit.example.test"
			/>
		);
		await act(async () => {
			(lastRoomProps().onConnected as () => void)();
		});

		expect(mockSetScreenShareEnabled).not.toHaveBeenCalled();
	});

	it('captures the camera in HD unless HD video was turned off in the settings', () => {
		const view = render(
			<LiveKitPage
				userChoices={{ audioEnabled: true, videoEnabled: true } as never}
				token="room-token"
				liveKitUrl="wss://livekit.example.test"
			/>
		);
		expect(lastRoomProps()).toMatchObject({
			options: { videoCaptureDefaults: { resolution: { width: 1280, height: 720 } } }
		});
		view.unmount();

		render(
			<LiveKitPage
				userChoices={{ audioEnabled: true, videoEnabled: true } as never}
				token="room-token"
				liveKitUrl="wss://livekit.example.test"
				hdVideo={false}
			/>
		);

		expect(lastRoomProps()).toMatchObject({
			options: { videoCaptureDefaults: { resolution: { width: 640, height: 360 } } }
		});
	});
});
