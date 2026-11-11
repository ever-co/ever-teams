/** @jest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MeetPreJoin } from './meet-pre-join';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: { name?: string }) => (values?.name ? `${key}:${values.name}` : key)
}));

interface FakeTrack {
	kind: 'audio' | 'video';
	stop: jest.Mock;
}

function fakeStream(constraints: MediaStreamConstraints) {
	const tracks: FakeTrack[] = [];
	if (constraints.audio) tracks.push({ kind: 'audio', stop: jest.fn() });
	if (constraints.video) tracks.push({ kind: 'video', stop: jest.fn() });
	return {
		tracks,
		getTracks: () => tracks,
		getAudioTracks: () => tracks.filter((track) => track.kind === 'audio'),
		getVideoTracks: () => tracks.filter((track) => track.kind === 'video')
	};
}

const DEVICES = [
	{ deviceId: 'cam-1', kind: 'videoinput', label: 'Built-in camera' },
	{ deviceId: 'mic-1', kind: 'audioinput', label: 'Built-in microphone' },
	{ deviceId: 'mic-2', kind: 'audioinput', label: 'USB microphone' }
];

const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
let streams: ReturnType<typeof fakeStream>[] = [];

function installDevices(getUserMedia?: jest.Mock) {
	const media = {
		getUserMedia:
			getUserMedia ??
			jest.fn((constraints: MediaStreamConstraints) => {
				const stream = fakeStream(constraints);
				streams.push(stream);
				return Promise.resolve(stream);
			}),
		enumerateDevices: jest.fn(() => Promise.resolve(DEVICES)),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn()
	};
	Object.defineProperty(navigator, 'mediaDevices', { value: media, configurable: true });
	return media;
}

function renderPreJoin(onJoin = jest.fn()) {
	const view = render(
		<MeetPreJoin
			title="Sprint review"
			displayName="Ruslan Konviser"
			onJoin={onJoin}
			onBack={jest.fn()}
			onCopyLink={jest.fn()}
		/>
	);
	return { ...view, onJoin };
}

describe('MeetPreJoin', () => {
	beforeEach(() => {
		streams = [];
		window.localStorage.clear();
		// The notices' orb asks whether motion is reduced; jsdom has no matchMedia
		window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
	});

	afterEach(() => {
		// Unmount first: the screen stops its tracks with the devices it was given
		cleanup();
		if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
		else delete (navigator as { mediaDevices?: unknown }).mediaDevices;
	});

	it('previews the camera and microphone, then joins with them and their names', async () => {
		const media = installDevices();
		const { onJoin } = renderPreJoin();

		await waitFor(() => expect(media.getUserMedia).toHaveBeenCalledWith({ audio: true, video: true }));
		expect(screen.getByRole('heading', { name: 'Sprint review' })).toBeTruthy();
		expect(screen.getByText('meetings.JOINING_AS:Ruslan Konviser')).toBeTruthy();
		await waitFor(() => expect(media.enumerateDevices).toHaveBeenCalled());

		fireEvent.click(screen.getByTestId('meet-join-now'));

		expect(onJoin).toHaveBeenCalledWith(
			expect.objectContaining({
				audioEnabled: true,
				videoEnabled: true,
				audioInputId: '',
				videoInputId: '',
				displayName: 'Ruslan Konviser'
			})
		);
	});

	it('turns the camera off before joining: its track stops and the room opens without it', async () => {
		installDevices();
		const { onJoin } = renderPreJoin();
		await waitFor(() => expect(streams).toHaveLength(1));

		fireEvent.click(screen.getByRole('button', { name: 'meetings.TURN_CAMERA_OFF' }));

		await waitFor(() => expect(streams).toHaveLength(2));
		expect(streams[0].tracks.every((track) => track.stop.mock.calls.length > 0)).toBe(true);
		expect(streams[1].getVideoTracks()).toHaveLength(0);
		expect(screen.getByText('meetings.CAMERA_OFF')).toBeTruthy();

		fireEvent.click(screen.getByTestId('meet-join-now'));
		expect(onJoin).toHaveBeenCalledWith(expect.objectContaining({ videoEnabled: false, audioEnabled: true }));
	});

	it('remembers the choices on the device for the next meeting', async () => {
		installDevices();
		const first = renderPreJoin();
		await waitFor(() => expect(streams).toHaveLength(1));
		fireEvent.click(screen.getByRole('button', { name: 'meetings.TURN_MIC_OFF' }));
		await waitFor(() => expect(streams).toHaveLength(2));
		first.unmount();

		renderPreJoin();

		expect(await screen.findByRole('button', { name: 'meetings.TURN_MIC_ON' })).toBeTruthy();
	});

	it('stops every track when the screen goes away, so the camera never stays on behind the room', async () => {
		installDevices();
		const { unmount } = renderPreJoin();
		await waitFor(() => expect(streams).toHaveLength(1));

		unmount();

		expect(streams[0].tracks.every((track) => track.stop.mock.calls.length > 0)).toBe(true);
	});

	it('says the devices are blocked, offers to ask again, and still lets the person join', async () => {
		const denied = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
		const getUserMedia = jest.fn(() => Promise.reject(denied));
		installDevices(getUserMedia);
		const { onJoin } = renderPreJoin();

		expect(await screen.findByText('meetings.DEVICES_BLOCKED')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'collaborate.TRY_AGAIN' }));
		await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));

		fireEvent.click(screen.getByTestId('meet-join-now'));
		expect(onJoin).toHaveBeenCalled();
	});

	it('explains a browser that cannot reach devices here (no https), and still lets the person join', async () => {
		delete (navigator as { mediaDevices?: unknown }).mediaDevices;
		Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
		const { onJoin } = renderPreJoin();

		expect(await screen.findByText('meetings.DEVICES_UNAVAILABLE')).toBeTruthy();
		await act(async () => {
			fireEvent.click(screen.getByTestId('meet-join-now'));
		});
		expect(onJoin).toHaveBeenCalled();
	});
});
