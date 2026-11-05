'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { useSyncRef } from '@/core/hooks/common/use-sync-ref';
import { requestDictation, type TDictationFailure } from '@/core/services/client/api/ai/dictation.service';
import {
	fetchVoiceFillAvailability,
	requestVoiceFill,
	type TVoiceFillFailure
} from '@/core/services/client/api/ai/voice-fill.service';
import type {
	TVoiceFillChoice,
	TVoiceFillFields,
	TVoiceFillForm,
	TVoiceFillRequest
} from '@/core/types/schemas/ai/voice-fill.schema';
import { useVoiceRecorder, type RecorderError, type RecorderPhase } from './use-voice-recorder';

export const MAX_VOICE_FILL_SECONDS = 180;

/** How long the fields the voice just filled keep their highlight. */
const FILLED_HIGHLIGHT_MS = 1600;

export type VoiceFillPhase = 'idle' | 'starting' | 'recording' | 'paused' | 'transcribing' | 'filling' | 'done';

export type VoiceFillError = RecorderError | TDictationFailure | TVoiceFillFailure;

export interface VoiceFillSnapshot {
	current: TVoiceFillRequest['current'];
	choices: Record<string, TVoiceFillChoice[]>;
}

export interface VoiceFillApplied {
	/** The fields the form really took; a value it refused is neither listed nor highlighted. */
	filledKeys: string[];
	restore: () => void;
}

export interface VoiceFillAdapter {
	form: TVoiceFillForm;
	/** The form as it is when the recording ends: its values, and the choices the model may pick from. */
	snapshot: () => VoiceFillSnapshot;
	apply: (fields: TVoiceFillFields) => VoiceFillApplied;
}

type FillStage = 'idle' | 'transcribing' | 'filling' | 'done';

/** Where a stopped or failed dictation leaves the panel: the last result stays when there was one. */
function settledStageOf(stage: FillStage): 'idle' | 'done' {
	if (stage === 'done') {
		return 'done';
	}
	return 'idle';
}

function phaseOf(recorderPhase: RecorderPhase, stage: FillStage): VoiceFillPhase {
	if (recorderPhase !== 'idle') {
		return recorderPhase;
	}
	return stage;
}

function todayOf(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Fill a whole form by speaking: record, turn the speech into text, let the deployment's AI map it onto the form's
 * fields, apply them for the person to review. A second dictation sends what the form already holds, so it only
 * changes what the person talks about. Undo puts the previous values back.
 */
export function useVoiceFill({
	adapter,
	onError
}: Readonly<{ adapter: VoiceFillAdapter; onError: (error: VoiceFillError) => void }>) {
	const availability = useQuery({
		queryKey: queryKeys.voiceFill.availability,
		queryFn: fetchVoiceFillAvailability,
		staleTime: Infinity
	});
	const [stage, setStage] = useState<FillStage>('idle');
	const [transcript, setTranscript] = useState('');
	const [filledKeys, setFilledKeys] = useState<string[]>([]);
	const [highlightedKeys, setHighlightedKeys] = useState<string[]>([]);
	const [canUndo, setCanUndo] = useState(false);
	const restoreRef = useRef<(() => void) | null>(null);
	const requestRef = useRef<AbortController | null>(null);
	const highlightTimerRef = useRef<number | null>(null);
	const callbacksRef = useSyncRef({ adapter, onError });

	const fail = useCallback(
		(error: VoiceFillError, previousStage: 'idle' | 'done') => {
			setStage(previousStage);
			callbacksRef.current.onError(error);
		},
		[callbacksRef]
	);

	const highlight = useCallback((keys: string[]) => {
		setHighlightedKeys(keys);
		if (highlightTimerRef.current) {
			window.clearTimeout(highlightTimerRef.current);
		}
		highlightTimerRef.current = window.setTimeout(() => setHighlightedKeys([]), FILLED_HIGHLIGHT_MS);
	}, []);

	const process = useCallback(
		async (audio: Blob, previousStage: 'idle' | 'done') => {
			const controller = new AbortController();
			requestRef.current = controller;
			setStage('transcribing');
			const dictation = await requestDictation(audio, controller.signal);
			if (controller.signal.aborted) {
				return;
			}
			if (!dictation.ok) {
				fail(dictation.reason, previousStage);
				return;
			}
			setTranscript(dictation.text);
			setStage('filling');
			const { form, snapshot, apply } = callbacksRef.current.adapter;
			const { current, choices } = snapshot();
			const request: TVoiceFillRequest = {
				form,
				transcript: dictation.text,
				today: todayOf(new Date()),
				current,
				choices
			};
			const result = await requestVoiceFill(request, controller.signal);
			requestRef.current = null;
			if (controller.signal.aborted) {
				return;
			}
			if (!result.ok) {
				fail(result.reason, previousStage);
				return;
			}
			const applied = apply(result.fields);
			const hasFilled = applied.filledKeys.length > 0;
			if (!hasFilled) {
				fail('nothing_understood', previousStage);
				return;
			}
			restoreRef.current = applied.restore;
			setCanUndo(true);
			setFilledKeys(applied.filledKeys);
			highlight(applied.filledKeys);
			setStage('done');
		},
		[callbacksRef, fail, highlight]
	);

	const stageRef = useSyncRef(stage);
	const recorder = useVoiceRecorder({
		maxSeconds: MAX_VOICE_FILL_SECONDS,
		onRecorded: (audio) => {
			const previousStage = settledStageOf(stageRef.current);
			void process(audio, previousStage);
		},
		onError: (error) => callbacksRef.current.onError(error)
	});

	const undo = useCallback(() => {
		restoreRef.current?.();
		restoreRef.current = null;
		setCanUndo(false);
		setFilledKeys([]);
		setHighlightedKeys([]);
	}, []);

	const dismiss = useCallback(() => {
		setStage('idle');
		setTranscript('');
		setFilledKeys([]);
		setCanUndo(false);
		restoreRef.current = null;
	}, []);

	const cancelRecorder = recorder.cancel;
	const cancel = useCallback(() => {
		requestRef.current?.abort();
		requestRef.current = null;
		cancelRecorder();
		setStage(settledStageOf);
	}, [cancelRecorder]);

	useEffect(() => {
		return () => {
			requestRef.current?.abort();
			if (highlightTimerRef.current) {
				window.clearTimeout(highlightTimerRef.current);
			}
		};
	}, []);

	const isAvailable = availability.data === true;
	const canFill = isAvailable && recorder.isSupported;
	const phase = phaseOf(recorder.phase, stage);
	const isHighlighted = useCallback((key: string) => highlightedKeys.includes(key), [highlightedKeys]);

	return {
		canFill,
		phase,
		elapsedSeconds: recorder.elapsedSeconds,
		analyserRef: recorder.analyserRef,
		transcript,
		filledKeys,
		canUndo,
		isHighlighted,
		start: recorder.start,
		pause: recorder.pause,
		resume: recorder.resume,
		finish: recorder.finish,
		cancel,
		undo,
		dismiss
	};
}

export type VoiceFill = ReturnType<typeof useVoiceFill>;
