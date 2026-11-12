/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';

type Toggle = { enabled: boolean; pending: boolean; toggle: jest.Mock };

const mockDisconnect = jest.fn();
const mockDispatch = jest.fn();
let mockToggles: Record<string, Toggle>;
let mockWidgetState: { showChat: boolean; showSettings: boolean; unreadMessages: number };
let mockPermissions: { canPublish: boolean; canPublishData: boolean; canPublishSources: number[] } | undefined;

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: { count?: number }) =>
		values?.count === undefined ? key : `${key}:${values.count}`
}));
jest.mock('livekit-client', () => ({
	Track: { Source: { Camera: 'camera', Microphone: 'microphone', ScreenShare: 'screen_share' } }
}));
jest.mock('@livekit/components-react', () => ({
	StartMediaButton: () => null,
	useLocalParticipantPermissions: () => mockPermissions,
	useMaybeLayoutContext: () => ({ widget: { state: mockWidgetState, dispatch: mockDispatch } }),
	useRoomContext: () => ({ disconnect: mockDisconnect }),
	useTrackToggle: ({ source }: { source: string }) => mockToggles[source]
}));

import { MeetControlBar } from './meet-control-bar';

const toggle = (enabled: boolean): Toggle => ({ enabled, pending: false, toggle: jest.fn(() => Promise.resolve()) });

describe('MeetControlBar', () => {
	beforeEach(() => {
		mockDisconnect.mockReset();
		mockDispatch.mockReset();
		mockToggles = { camera: toggle(true), microphone: toggle(false), screen_share: toggle(false) };
		mockWidgetState = { showChat: false, showSettings: false, unreadMessages: 0 };
		mockPermissions = { canPublish: true, canPublishData: true, canPublishSources: [] };
		Object.defineProperty(navigator, 'mediaDevices', {
			value: { getDisplayMedia: jest.fn() },
			configurable: true
		});
	});

	it("says what a press on one's camera and microphone does, and does it", () => {
		render(<MeetControlBar />);

		fireEvent.click(screen.getByRole('button', { name: 'meetings.STOP_VIDEO' }));
		expect(mockToggles.camera.toggle).toHaveBeenCalledTimes(1);
		// The microphone is off: its button unmutes, in red as in the inspiration
		const unmute = screen.getByRole('button', { name: 'meetings.UNMUTE' });
		expect(unmute.className).toContain('text-destructive-ink');
		fireEvent.click(unmute);
		expect(mockToggles.microphone.toggle).toHaveBeenCalledTimes(1);
	});

	it('opens the chat with its unread messages, shares the screen, opens the settings and leaves', () => {
		mockWidgetState.unreadMessages = 2;
		render(<MeetControlBar />);

		const chat = screen.getByRole('button', { name: /^meetings\.CHAT/ });
		expect(chat.textContent).toContain('meetings.UNREAD_MESSAGES:2');
		fireEvent.click(chat);
		expect(mockDispatch).toHaveBeenCalledWith({ msg: 'toggle_chat' });

		fireEvent.click(screen.getByRole('button', { name: 'meetings.SHARE' }));
		expect(mockToggles.screen_share.toggle).toHaveBeenCalledTimes(1);

		fireEvent.click(screen.getByRole('button', { name: 'meetings.SETTINGS' }));
		expect(mockDispatch).toHaveBeenCalledWith({ msg: 'toggle_settings' });

		fireEvent.click(screen.getByRole('button', { name: 'meetings.LEAVE' }));
		expect(mockDisconnect).toHaveBeenCalledTimes(1);
	});

	it('offers only what the room lets the person publish', () => {
		// Allowed the microphone only (source 2), and no data: no camera, no share, no chat
		mockPermissions = { canPublish: true, canPublishData: false, canPublishSources: [2] };
		render(<MeetControlBar />);

		expect(screen.queryByRole('button', { name: 'meetings.STOP_VIDEO' })).toBeNull();
		expect(screen.getByRole('button', { name: 'meetings.UNMUTE' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'meetings.SHARE' })).toBeNull();
		expect(screen.queryByRole('button', { name: /^meetings\.CHAT/ })).toBeNull();
		expect(screen.getByRole('button', { name: 'meetings.LEAVE' })).toBeTruthy();
	});
});
