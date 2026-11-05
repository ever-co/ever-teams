'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useSyncRef } from '@/core/hooks/common/use-sync-ref';

const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];

export type RecorderPhase = 'idle' | 'starting' | 'recording' | 'paused';

export type RecorderError = 'permission_denied' | 'no_microphone' | 'not_supported';

export function canRecordInThisBrowser() {
	if (typeof window === 'undefined') {
		return false;
	}
	const hasRecorder = window.MediaRecorder !== undefined;
	const hasMicrophoneApi = Boolean(navigator.mediaDevices?.getUserMedia);
	return hasRecorder && hasMicrophoneApi;
}

function recorderMimeType() {
	return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

/** The type the browser really records in; Safari may ignore the requested one. */
function recordedTypeOf(recorder: MediaRecorder, requested: string | undefined) {
	if (recorder.mimeType) {
		return recorder.mimeType;
	}
	return requested ?? 'audio/webm';
}

function microphoneErrorOf(error: unknown): RecorderError {
	if (!(error instanceof DOMException)) {
		return 'not_supported';
	}
	const isRefused = error.name === 'NotAllowedError';
	const isBlockedBySecurity = error.name === 'SecurityError';
	if (isRefused || isBlockedBySecurity) {
		return 'permission_denied';
	}
	const isMissing = error.name === 'NotFoundError';
	const isUnreadable = error.name === 'NotReadableError';
	if (isMissing || isUnreadable) {
		return 'no_microphone';
	}
	return 'not_supported';
}

function isActiveRecorder(recorder: MediaRecorder | null): recorder is MediaRecorder {
	const isRecording = recorder?.state === 'recording';
	const isPaused = recorder?.state === 'paused';
	return isRecording || isPaused;
}

function stopTracks(stream: MediaStream | null) {
	stream?.getTracks().forEach((track) => track.stop());
}

/** An analyser on the microphone, read by the level meter; a browser without Web Audio simply shows no meter. */
function analyserOf(stream: MediaStream) {
	const AudioContextClass = window.AudioContext;
	if (!AudioContextClass) {
		return null;
	}
	const context = new AudioContextClass();
	const source = context.createMediaStreamSource(stream);
	const analyser = context.createAnalyser();
	analyser.fftSize = 256;
	analyser.smoothingTimeConstant = 0.7;
	source.connect(analyser);
	return { context, analyser };
}

export interface VoiceRecorder {
	isSupported: boolean;
	phase: RecorderPhase;
	elapsedSeconds: number;
	analyserRef: RefObject<AnalyserNode | null>;
	start: () => Promise<void>;
	pause: () => void;
	resume: () => void;
	/** Stops and hands the recording to `onRecorded`. */
	finish: () => void;
	/** Stops and throws the recording away. */
	cancel: () => void;
}

/**
 * The microphone for one feature: record, pause, resume, then hand the recording over or drop it. The microphone
 * and the audio analyser are released as soon as the recording stops, and when the component leaves.
 */
export function useVoiceRecorder({
	maxSeconds,
	onRecorded,
	onError
}: Readonly<{
	maxSeconds: number;
	onRecorded: (audio: Blob) => void;
	onError: (error: RecorderError) => void;
}>): VoiceRecorder {
	const [isSupported] = useState(canRecordInThisBrowser);
	const [phase, setPhase] = useState<RecorderPhase>('idle');
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const recorderRef = useRef<MediaRecorder | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const keepsRecordingRef = useRef(true);
	const callbacksRef = useSyncRef({ onRecorded, onError });

	const release = useCallback(() => {
		stopTracks(streamRef.current);
		streamRef.current = null;
		recorderRef.current = null;
		analyserRef.current = null;
		void audioContextRef.current?.close();
		audioContextRef.current = null;
	}, []);

	const handleStop = useCallback(
		(mimeType: string) => {
			const chunks = chunksRef.current;
			chunksRef.current = [];
			release();
			setPhase('idle');
			if (!keepsRecordingRef.current) {
				return;
			}
			const audio = new Blob(chunks, { type: mimeType });
			callbacksRef.current.onRecorded(audio);
		},
		[callbacksRef, release]
	);

	const start = useCallback(async () => {
		if (!isSupported) {
			callbacksRef.current.onError('not_supported');
			return;
		}
		setPhase('starting');
		let stream: MediaStream;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		} catch (error) {
			setPhase('idle');
			callbacksRef.current.onError(microphoneErrorOf(error));
			return;
		}
		const mimeType = recorderMimeType();
		const recorder = new MediaRecorder(stream, { mimeType });
		const recordedType = recordedTypeOf(recorder, mimeType);
		const audio = analyserOf(stream);
		streamRef.current = stream;
		recorderRef.current = recorder;
		audioContextRef.current = audio?.context ?? null;
		analyserRef.current = audio?.analyser ?? null;
		chunksRef.current = [];
		keepsRecordingRef.current = true;
		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				chunksRef.current.push(event.data);
			}
		};
		recorder.onstop = () => handleStop(recordedType);
		recorder.start();
		setElapsedSeconds(0);
		setPhase('recording');
	}, [callbacksRef, handleStop, isSupported]);

	const pause = useCallback(() => {
		const recorder = recorderRef.current;
		if (recorder?.state !== 'recording') {
			return;
		}
		recorder.pause();
		setPhase('paused');
	}, []);

	const resume = useCallback(() => {
		const recorder = recorderRef.current;
		if (recorder?.state !== 'paused') {
			return;
		}
		recorder.resume();
		setPhase('recording');
	}, []);

	const stopRecorder = useCallback(
		(keepsRecording: boolean) => {
			keepsRecordingRef.current = keepsRecording;
			const recorder = recorderRef.current;
			if (isActiveRecorder(recorder)) {
				recorder.stop();
				return;
			}
			release();
			setPhase('idle');
		},
		[release]
	);

	const finish = useCallback(() => stopRecorder(true), [stopRecorder]);
	const cancel = useCallback(() => stopRecorder(false), [stopRecorder]);

	const elapsedRef = useSyncRef(elapsedSeconds);
	useEffect(() => {
		if (phase !== 'recording') {
			return;
		}
		const interval = window.setInterval(() => {
			const nextSeconds = elapsedRef.current + 1;
			setElapsedSeconds(nextSeconds);
			if (nextSeconds >= maxSeconds) {
				finish();
			}
		}, 1000);
		return () => window.clearInterval(interval);
	}, [elapsedRef, finish, maxSeconds, phase]);

	useEffect(() => {
		return () => {
			keepsRecordingRef.current = false;
			const recorder = recorderRef.current;
			if (isActiveRecorder(recorder)) {
				recorder.stop();
			}
			release();
		};
	}, [release]);

	return { isSupported, phase, elapsedSeconds, analyserRef, start, pause, resume, finish, cancel };
}
