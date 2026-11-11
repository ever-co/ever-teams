/** @jest-environment jsdom */
import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockDisconnect = jest.fn();
const mockRoomProps: Array<Record<string, unknown>> = [];
const mockBarProps: Array<{ leave: () => void; participantCount: number | null; joinedAt: number | null }> = [];

jest.mock('@livekit/components-react', () => ({
	LiveKitRoom: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => {
		mockRoomProps.push(props);
		return <div data-testid="livekit-room">{children}</div>;
	},
	VideoConference: () => <div data-testid="video-conference" />,
	formatChatMessageLinks: jest.fn(),
	useRoomContext: () => ({ disconnect: mockDisconnect }),
	useParticipants: () => [{}, {}]
}));
jest.mock('@livekit/components-styles', () => ({}));
jest.mock('livekit-client', () => ({}));
jest.mock('./settings-livekit', () => ({ SettingsMenu: () => null }));
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
});
