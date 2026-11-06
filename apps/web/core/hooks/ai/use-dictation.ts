'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { useSyncRef } from '@/core/hooks/common/use-sync-ref';
import {
	fetchDictationAvailability,
	requestDictation,
	type TDictationFailure
} from '@/core/services/client/api/ai/dictation.service';
import { useVoiceRecorder, type RecorderError, type RecorderPhase } from './use-voice-recorder';

export const MAX_DICTATION_SECONDS = 120;

export type DictationPhase = 'idle' | 'starting' | 'recording' | 'transcribing';

export type DictationError = TDictationFailure | RecorderError;

/** Dictated text joins what was already typed, separated by one space. */
export function appendDictatedText(current: string, dictated: string) {
	const trimmedCurrent = current.trimEnd();
	if (!trimmedCurrent) {
		return dictated;
	}
	return `${trimmedCurrent} ${dictated}`;
}

/** The button knows no pause: a paused recording still reads as recording. */
function dictationPhaseOf(recorderPhase: RecorderPhase, isTranscribing: boolean): DictationPhase {
	if (isTranscribing) {
		return 'transcribing';
	}
	if (recorderPhase === 'paused') {
		return 'recording';
	}
	return recorderPhase;
}

/**
 * Speech to text for one field: record from the microphone, send the recording to the app's own route, hand the
 * text back. Leaving the field cancels everything.
 */
export function useDictation({
	onText,
	onError
}: Readonly<{ onText: (text: string) => void; onError: (error: DictationError) => void }>) {
	const availability = useQuery({
		queryKey: queryKeys.dictation.availability,
		queryFn: fetchDictationAvailability,
		staleTime: Infinity
	});
	const [isTranscribing, setIsTranscribing] = useState(false);
	const requestRef = useRef<AbortController | null>(null);
	const callbacksRef = useSyncRef({ onText, onError });

	const send = useCallback(
		async (audio: Blob) => {
			setIsTranscribing(true);
			const controller = new AbortController();
			requestRef.current = controller;
			const result = await requestDictation(audio, controller.signal);
			requestRef.current = null;
			if (controller.signal.aborted) {
				return;
			}
			setIsTranscribing(false);
			if (result.ok) {
				callbacksRef.current.onText(result.text);
				return;
			}
			callbacksRef.current.onError(result.reason);
		},
		[callbacksRef]
	);

	const recorder = useVoiceRecorder({
		maxSeconds: MAX_DICTATION_SECONDS,
		onRecorded: (audio) => void send(audio),
		onError: (error) => callbacksRef.current.onError(error)
	});

	const isAvailable = availability.data === true;
	const canDictate = isAvailable && recorder.isSupported;

	const cancel = useCallback(() => {
		requestRef.current?.abort();
		requestRef.current = null;
		setIsTranscribing(false);
		recorder.cancel();
	}, [recorder]);

	useEffect(() => {
		return () => requestRef.current?.abort();
	}, []);

	const phase = dictationPhaseOf(recorder.phase, isTranscribing);

	return {
		canDictate,
		phase,
		elapsedSeconds: recorder.elapsedSeconds,
		start: recorder.start,
		stop: recorder.finish,
		cancel
	};
}
