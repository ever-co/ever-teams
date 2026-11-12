/** @jest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VideoAudioDialog } from './video-audio-dialog';

const mockPlayTone = jest.fn();
const mockStopTone = jest.fn();
let mockIsPlaying = false;
let mockHasFailed = false;

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// The meter's reading, from any stream with a microphone in it; nothing without one
jest.mock('@/core/hooks/meetings/use-audio-level', () => ({
	useAudioLevel: (stream: MediaStream | null) => (stream ? 0.6 : 0)
}));
jest.mock('@/core/hooks/meetings/use-speaker-test', () => ({
	useSpeakerTest: () => ({
		isPlaying: mockIsPlaying,
		toneStream: null,
		hasFailed: mockHasFailed,
		play: mockPlayTone,
		stop: mockStopTone
	})
}));

interface FakeTrack {
	kind: 'audio' | 'video';
	stop: jest.Mock;
}

const STORAGE_KEY = 'ever-teams:meeting-devices';
const DEVICES = [
	{ deviceId: 'cam-1', kind: 'videoinput', label: 'Built-in camera' },
	{ deviceId: 'mic-1', kind: 'audioinput', label: 'Built-in microphone' },
	{ deviceId: 'mic-2', kind: 'audioinput', label: 'USB microphone' }
];
const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
let streams: Array<{ tracks: FakeTrack[] }> = [];

function installDevices() {
	const media = {
		getUserMedia: jest.fn((constraints: MediaStreamConstraints) => {
			const tracks: FakeTrack[] = [];
			if (constraints.audio) tracks.push({ kind: 'audio', stop: jest.fn() });
			if (constraints.video) tracks.push({ kind: 'video', stop: jest.fn() });
			const stream = {
				tracks,
				getTracks: () => tracks,
				getAudioTracks: () => tracks.filter((track) => track.kind === 'audio'),
				getVideoTracks: () => tracks.filter((track) => track.kind === 'video')
			};
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

async function pickMicrophone(name: string) {
	fireEvent.click(await screen.findByRole('combobox', { name: 'meetings.MICROPHONE' }));
	const option = await screen.findByRole('option', { name });
	// Base UI picks an option where the pointer is released, as a click in a browser does
	fireEvent.pointerDown(option);
	fireEvent.pointerUp(option);
	fireEvent.click(option);
	await waitFor(() =>
		expect(screen.getByRole('combobox', { name: 'meetings.MICROPHONE' }).textContent).toContain(name)
	);
}

describe('VideoAudioDialog', () => {
	beforeEach(() => {
		streams = [];
		mockIsPlaying = false;
		mockHasFailed = false;
		mockPlayTone.mockReset();
		mockStopTone.mockReset();
		window.localStorage.clear();
		// The notices' orb asks whether motion is reduced; jsdom has no matchMedia
		window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
	});

	afterEach(() => {
		cleanup();
		if (originalMediaDevices) Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
		else delete (navigator as { mediaDevices?: unknown }).mediaDevices;
	});

	it('opens the camera and the microphone while open, and stops them once closed', async () => {
		const media = installDevices();
		const view = render(<VideoAudioDialog open onClose={jest.fn()} />);

		await waitFor(() => expect(media.getUserMedia).toHaveBeenCalledWith({ audio: true, video: true }));
		expect(screen.getByRole('dialog', { name: 'meetings.AUDIO_AND_VIDEO' })).toBeTruthy();

		view.rerender(<VideoAudioDialog open={false} onClose={jest.fn()} />);

		await waitFor(() => expect(streams[0].tracks.every((track) => track.stop.mock.calls.length > 0)).toBe(true));
	});

	it('saves the devices picked where the pre-join check reads them, and Cancel keeps the saved ones', async () => {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ videoEnabled: false }));
		installDevices();
		const onClose = jest.fn();
		const view = render(<VideoAudioDialog open onClose={onClose} />);

		await pickMicrophone('USB microphone');
		fireEvent.click(screen.getByRole('button', { name: 'common.CANCEL' }));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({ videoEnabled: false });

		view.unmount();
		render(<VideoAudioDialog open onClose={onClose} />);
		await pickMicrophone('USB microphone');
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'common.SAVE_CHANGES' }));
		});

		// The switches the pre-join check keeps stay as they were
		expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
			videoEnabled: false,
			audioInputId: 'mic-2',
			videoInputId: ''
		});
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	it('plays a tone through the speaker to test it, and stops it on a second press', async () => {
		const media = installDevices();
		const view = render(<VideoAudioDialog open onClose={jest.fn()} />);
		// The devices open and get their names first
		await waitFor(() => expect(media.enumerateDevices).toHaveBeenCalledTimes(2));
		await act(async () => {
			await Promise.resolve();
		});

		fireEvent.click(screen.getByRole('button', { name: 'meetings.TEST_SPEAKER' }));
		// jsdom picks no output (no setSinkId): the tone plays on the default speaker
		expect(mockPlayTone).toHaveBeenCalledWith('');
		expect(screen.getByRole('meter', { name: 'meetings.SPEAKER_LEVEL' })).toBeTruthy();

		mockIsPlaying = true;
		view.rerender(<VideoAudioDialog open onClose={jest.fn()} />);
		fireEvent.click(screen.getByRole('button', { name: 'meetings.TEST_SPEAKER' }));

		expect(mockStopTone).toHaveBeenCalledTimes(1);
	});

	it('shows the microphone level live while the microphone is tested', async () => {
		const media = installDevices();
		render(<VideoAudioDialog open onClose={jest.fn()} />);
		await waitFor(() => expect(media.enumerateDevices).toHaveBeenCalledTimes(2));
		const testButton = await screen.findByRole('button', { name: 'meetings.TEST_MICROPHONE' });
		const meter = () => screen.getByRole('meter', { name: 'meetings.MIC_LEVEL' });
		expect(meter().getAttribute('aria-valuenow')).toBe('0');

		fireEvent.click(testButton);

		expect(testButton.getAttribute('aria-pressed')).toBe('true');
		expect(meter().getAttribute('aria-valuenow')).toBe('60');
		fireEvent.click(testButton);
		expect(meter().getAttribute('aria-valuenow')).toBe('0');
	});

	it('keeps the background noise filter and HD video, on at first, with the devices', async () => {
		const media = installDevices();
		render(<VideoAudioDialog open onClose={jest.fn()} />);
		await waitFor(() => expect(media.enumerateDevices).toHaveBeenCalledTimes(2));
		const noiseFilter = screen.getByRole('switch', { name: 'meetings.NOISE_FILTER' });
		const hdVideo = screen.getByRole('switch', { name: 'meetings.HD_VIDEO' });
		expect(noiseFilter.getAttribute('aria-checked')).toBe('true');
		expect(hdVideo.getAttribute('aria-checked')).toBe('true');

		fireEvent.click(noiseFilter);
		fireEvent.click(hdVideo);
		fireEvent.click(screen.getByRole('button', { name: 'common.SAVE_CHANGES' }));

		expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({
			noiseFilter: false,
			hdVideo: false
		});
	});

	it('says when the test sound could not play on the speaker', async () => {
		const media = installDevices();
		mockHasFailed = true;
		render(<VideoAudioDialog open onClose={jest.fn()} />);
		await waitFor(() => expect(media.enumerateDevices).toHaveBeenCalledTimes(2));

		expect(screen.getByRole('alert').textContent).toBe('meetings.SPEAKER_TEST_FAILED');
	});
});
