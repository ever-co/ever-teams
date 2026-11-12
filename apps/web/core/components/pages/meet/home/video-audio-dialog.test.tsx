/** @jest-environment jsdom */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VideoAudioDialog } from './video-audio-dialog';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

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
});
