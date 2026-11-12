/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';

const mockPinDispatch = jest.fn();
let mockTracks: Array<Record<string, unknown>> = [];
let mockPinned: Array<Record<string, unknown>> = [];

jest.mock('livekit-client', () => ({
	RoomEvent: { ActiveSpeakersChanged: 'activeSpeakersChanged' },
	Track: { Source: { Camera: 'camera', ScreenShare: 'screen_share', Microphone: 'microphone' } }
}));
jest.mock('@livekit/components-react', () => {
	const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>;
	return {
		CarouselLayout: ({ children }: { children?: ReactNode }) => <div data-testid="carousel">{children}</div>,
		Chat: ({ style }: { style: { display: string } }) => <div data-testid="chat" style={style} />,
		ConnectionStateToast: () => null,
		ControlBar: () => <div data-testid="control-bar" />,
		FocusLayout: () => <div data-testid="focus" />,
		FocusLayoutContainer: Pass,
		GridLayout: ({ children }: { children?: ReactNode }) => <div data-testid="grid">{children}</div>,
		LayoutContextProvider: Pass,
		ParticipantTile: () => null,
		RoomAudioRenderer: () => <div data-testid="room-audio" />,
		formatChatMessageLinks: jest.fn(),
		isTrackReference: (track: { publication?: unknown }) => Boolean(track?.publication),
		useCreateLayoutContext: () => ({ pin: { dispatch: mockPinDispatch }, widget: {} }),
		usePinnedTracks: () => mockPinned,
		useTracks: () => mockTracks
	};
});
jest.mock('./settings-livekit', () => ({ SettingsMenu: () => <div data-testid="settings" /> }));

import { MeetConference } from './meet-conference';

const person = (identity: string) => ({ identity });

describe('MeetConference', () => {
	beforeEach(() => {
		mockPinDispatch.mockReset();
		mockPinned = [];
		mockTracks = [{ participant: person('ana'), source: 'camera' }];
	});

	it('shows everyone in a grid, with the controls, and the chat and the settings hidden until asked', () => {
		render(<MeetConference />);

		expect(screen.getByTestId('grid')).toBeTruthy();
		expect(screen.getByTestId('control-bar')).toBeTruthy();
		expect(screen.getByTestId('chat').style.display).toBe('none');
		expect((screen.getByTestId('settings').parentElement as HTMLElement).style.display).toBe('none');
		expect(screen.getByTestId('room-audio')).toBeTruthy();
	});

	it('brings a shared screen into focus by itself', () => {
		const screenShare = {
			participant: person('bob'),
			source: 'screen_share',
			publication: { source: 'screen_share', trackSid: 'TR_screen', isSubscribed: true }
		};
		mockTracks = [{ participant: person('ana'), source: 'camera' }, screenShare];

		render(<MeetConference />);

		expect(mockPinDispatch).toHaveBeenCalledWith({ msg: 'set_pin', trackReference: screenShare });
	});

	it('shows the pinned track in focus, the others beside it', () => {
		mockPinned = [{ participant: person('bob'), source: 'camera', publication: { trackSid: 'TR_bob' } }];

		render(<MeetConference />);

		expect(screen.getByTestId('focus')).toBeTruthy();
		expect(screen.getByTestId('carousel')).toBeTruthy();
		expect(screen.queryByTestId('grid')).toBeNull();
	});
});
