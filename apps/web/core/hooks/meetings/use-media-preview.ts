'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useCallbackRef } from '@/core/hooks/common/use-callback-ref';

export type MeetingDeviceKind = 'audioinput' | 'videoinput' | 'audiooutput';

/**
 * Where the preview stands: still asking, working, refused by the person or the browser, held by another app, no
 * device at all, or a browser that cannot reach devices here (no `mediaDevices` outside https).
 */
export type MediaAccess = 'pending' | 'granted' | 'denied' | 'busy' | 'missing' | 'unavailable';

/** What the person joins with. An empty device id is the system's default device. */
export interface MeetingDeviceChoices {
	audioEnabled: boolean;
	videoEnabled: boolean;
	audioInputId: string;
	videoInputId: string;
	audioOutputId: string;
}

/** What the room opens with: the person's devices and switches, and the name others see. */
export interface MeetingJoinChoices extends MeetingDeviceChoices {
	displayName: string;
	/** Device names, for Jitsi, which picks devices by name. Empty for the default device. */
	audioInputLabel: string;
	videoInputLabel: string;
	audioOutputLabel: string;
}

type DeviceLists = Record<MeetingDeviceKind, MediaDeviceInfo[]>;

const STORAGE_KEY = 'ever-teams:meeting-devices';
const DEFAULT_CHOICES: MeetingDeviceChoices = {
	audioEnabled: true,
	videoEnabled: true,
	audioInputId: '',
	videoInputId: '',
	audioOutputId: ''
};
const NO_DEVICES: DeviceLists = { audioinput: [], videoinput: [], audiooutput: [] };
/** The choice that holds the device of each kind. */
export const DEVICE_FIELD = {
	audioinput: 'audioInputId',
	videoinput: 'videoInputId',
	audiooutput: 'audioOutputId'
} as const;

/*
 * The choices live on the device (they are the person's devices), as a small store over `localStorage`: the page
 * reads them on its first render, so a camera turned off last time never lights up for a moment.
 */
const choiceListeners = new Set<() => void>();
let choicesInMemory: string | null = null;

function readStoredChoices(): string | null {
	try {
		return window.localStorage.getItem(STORAGE_KEY);
	} catch {
		return choicesInMemory;
	}
}

function writeStoredChoices(value: string) {
	choicesInMemory = value;
	try {
		window.localStorage.setItem(STORAGE_KEY, value);
	} catch {
		// A browser without storage keeps the choices for this page only
	}
	for (const listener of choiceListeners) {
		listener();
	}
}

function subscribeToChoices(listener: () => void) {
	choiceListeners.add(listener);
	window.addEventListener('storage', listener);
	return () => {
		choiceListeners.delete(listener);
		window.removeEventListener('storage', listener);
	};
}

function choicesOf(stored: string | null): MeetingDeviceChoices {
	if (!stored) {
		return DEFAULT_CHOICES;
	}
	try {
		return { ...DEFAULT_CHOICES, ...(JSON.parse(stored) as Partial<MeetingDeviceChoices>) };
	} catch {
		return DEFAULT_CHOICES;
	}
}

function updateChoices(update: (current: MeetingDeviceChoices) => MeetingDeviceChoices) {
	writeStoredChoices(JSON.stringify(update(choicesOf(readStoredChoices()))));
}

/** A device remembered from last time is gone: the stored choices fall back to the defaults. */
function forgetStoredDevices() {
	updateChoices((current) => ({ ...current, audioInputId: '', videoInputId: '' }));
}

function stopTracks(stream: MediaStream | null) {
	for (const track of stream?.getTracks() ?? []) {
		track.stop();
	}
}

function accessOfError(error: unknown): MediaAccess {
	const name = error instanceof Error || error instanceof DOMException ? error.name : '';
	if (name === 'NotAllowedError' || name === 'SecurityError') {
		return 'denied';
	}
	if (name === 'NotFoundError') {
		return 'missing';
	}
	return 'busy';
}

function deviceConstraint(enabled: boolean, deviceId: string): MediaTrackConstraints | boolean {
	if (!enabled) {
		return false;
	}
	return deviceId ? { deviceId: { exact: deviceId } } : true;
}

function canReachDevices(): boolean {
	return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';
}

/** A device the person asked for that the computer does not have, while the other one works. */
interface MissingDevices {
	audio: boolean;
	video: boolean;
}

const NONE_MISSING: MissingDevices = { audio: false, video: false };

/**
 * Opens the camera and the microphone together. The browser refuses both when one of them is missing, so a computer
 * with a microphone and no camera (or the reverse) then opens the device it has, alone, and says which one is missing.
 */
async function openDevices(
	audio: MediaTrackConstraints | boolean,
	video: MediaTrackConstraints | boolean
): Promise<{ media: MediaStream; missing: MissingDevices }> {
	const mediaDevices = navigator.mediaDevices;
	try {
		return { media: await mediaDevices.getUserMedia({ audio, video }), missing: NONE_MISSING };
	} catch (error) {
		const isOneMissing = audio !== false && video !== false && accessOfError(error) === 'missing';
		if (!isOneMissing) {
			throw error;
		}
		const [audioOnly, videoOnly] = await Promise.allSettled([
			mediaDevices.getUserMedia({ audio, video: false }),
			mediaDevices.getUserMedia({ audio: false, video })
		]);
		const media = [audioOnly, videoOnly].flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
		const [first, second] = media;
		if (!first) {
			throw error;
		}
		for (const track of second?.getTracks() ?? []) {
			first.addTrack(track);
		}
		return {
			media: first,
			missing: { audio: audioOnly.status === 'rejected', video: videoOnly.status === 'rejected' }
		};
	}
}

/** Whether the browser plays audio on a chosen output (Chrome, Edge and recent Firefox). */
function canPickSpeaker(): boolean {
	return typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
}

/** The choices kept on this device, and the ways to change them. */
export function useStoredMeetingChoices() {
	const storedChoices = useSyncExternalStore(subscribeToChoices, readStoredChoices, () => null);
	const choices = useMemo(() => choicesOf(storedChoices), [storedChoices]);

	const toggleAudio = useCallback(
		() => updateChoices((current) => ({ ...current, audioEnabled: !current.audioEnabled })),
		[]
	);
	const toggleVideo = useCallback(
		() => updateChoices((current) => ({ ...current, videoEnabled: !current.videoEnabled })),
		[]
	);
	const selectDevice = useCallback(
		(kind: MeetingDeviceKind, deviceId: string) =>
			updateChoices((current) => ({ ...current, [DEVICE_FIELD[kind]]: deviceId })),
		[]
	);

	const saveChoices = useCallback(
		(saved: Partial<MeetingDeviceChoices>) => updateChoices((current) => ({ ...current, ...saved })),
		[]
	);

	return { choices, toggleAudio, toggleVideo, selectDevice, saveChoices };
}

/** The devices a stream asks for: whether each is on, and which one (empty for the system's default). */
type MeetingDeviceRequest = Pick<
	MeetingDeviceChoices,
	'audioEnabled' | 'videoEnabled' | 'audioInputId' | 'videoInputId'
>;

/**
 * The camera and microphone of a request, live: it opens the devices asked for while mounted, lists the devices once
 * the browser names them, and stops every track when unmounted, so the camera never stays on behind it. A device
 * asked for that is gone calls `onStaleDevice`, for the request to fall back to the defaults.
 */
export function useDeviceStream(request: MeetingDeviceRequest, onStaleDevice: () => void) {
	const [devices, setDevices] = useState<DeviceLists>(NO_DEVICES);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [requestedAccess, setRequestedAccess] = useState<MediaAccess>('pending');
	const [missingDevices, setMissingDevices] = useState<MissingDevices>(NONE_MISSING);
	const [attempt, setAttempt] = useState(0);
	const isSupported = canReachDevices();
	const onStaleDeviceRef = useCallbackRef(onStaleDevice);

	const { audioEnabled, videoEnabled, audioInputId, videoInputId } = request;
	const isAskingForDevices = audioEnabled || videoEnabled;

	useEffect(() => {
		// Read when the effect runs: the browser may have taken the devices away since the render
		if (!isAskingForDevices || !canReachDevices()) {
			return;
		}
		let isCurrent = true;
		let opened: MediaStream | null = null;
		const audio = deviceConstraint(audioEnabled, audioInputId);
		const video = deviceConstraint(videoEnabled, videoInputId);
		openDevices(audio, video)
			.then(({ media, missing }) => {
				if (!isCurrent) {
					stopTracks(media);
					return;
				}
				opened = media;
				setStream(media);
				setMissingDevices(missing);
				setRequestedAccess('granted');
			})
			.catch((error: unknown) => {
				if (!isCurrent) {
					return;
				}
				setStream(null);
				// A device remembered from last time is gone: fall back to the defaults
				const isStaleDevice = error instanceof Error && error.name === 'OverconstrainedError';
				if (isStaleDevice) {
					onStaleDeviceRef.current();
					return;
				}
				setRequestedAccess(accessOfError(error));
			});
		return () => {
			isCurrent = false;
			stopTracks(opened);
		};
	}, [audioEnabled, videoEnabled, audioInputId, videoInputId, isAskingForDevices, attempt, onStaleDeviceRef]);

	// The browser names its devices only once a stream was allowed; a device plugged in or out updates the lists
	useEffect(() => {
		const mediaDevices = canReachDevices() ? navigator.mediaDevices : undefined;
		if (!mediaDevices?.enumerateDevices) {
			return;
		}
		const refresh = () => {
			mediaDevices
				.enumerateDevices()
				.then((list) => {
					const named = list.filter((device) => device.deviceId && device.deviceId !== 'default');
					setDevices({
						audioinput: named.filter((device) => device.kind === 'audioinput'),
						videoinput: named.filter((device) => device.kind === 'videoinput'),
						audiooutput: named.filter((device) => device.kind === 'audiooutput')
					});
				})
				.catch(() => undefined);
		};
		refresh();
		mediaDevices.addEventListener?.('devicechange', refresh);
		return () => mediaDevices.removeEventListener?.('devicechange', refresh);
	}, [requestedAccess]);

	const retry = useCallback(() => {
		setRequestedAccess('pending');
		setAttempt((count) => count + 1);
	}, []);

	const labelOf = useCallback(
		(kind: MeetingDeviceKind, deviceId: string) =>
			devices[kind].find((device) => device.deviceId === deviceId)?.label ?? '',
		[devices]
	);

	// Nothing asked for: no stream to show, and nothing left to wait for
	let access = requestedAccess;
	if (!isSupported) {
		access = 'unavailable';
	} else if (!isAskingForDevices && requestedAccess === 'pending') {
		access = 'granted';
	}

	return {
		devices,
		stream: isAskingForDevices ? stream : null,
		access,
		missing: isAskingForDevices ? missingDevices : NONE_MISSING,
		isSupported,
		canPickSpeaker: canPickSpeaker(),
		retry,
		labelOf
	};
}

/**
 * The camera and microphone preview of the pre-join screen: the devices of the choices kept on this device, live while
 * the screen shows, so the room opens the devices on its own and the camera never stays on behind it.
 */
export function useMediaPreview() {
	const { choices, toggleAudio, toggleVideo, selectDevice } = useStoredMeetingChoices();
	const media = useDeviceStream(choices, forgetStoredDevices);
	return { choices, ...media, toggleAudio, toggleVideo, selectDevice };
}
