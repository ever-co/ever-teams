/** @jest-environment jsdom */
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

jest.mock('@livekit/components-react', () => ({
	LiveKitRoom: ({ children }: { children: ReactNode }) => <div data-testid="livekit-room">{children}</div>,
	VideoConference: () => <div />,
	formatChatMessageLinks: jest.fn()
}));
jest.mock('@livekit/components-styles', () => ({}));
jest.mock('livekit-client', () => ({}));
jest.mock('./settings-livekit', () => ({ SettingsMenu: () => null }));
jest.mock('@/core/components/pages/meet/meet-room-skeleton', () => ({
	MeetRoomSkeleton: () => <div data-testid="meet-room-skeleton" />
}));

import LiveKitPage from './index';

describe('LiveKitPage', () => {
	const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');

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
});
