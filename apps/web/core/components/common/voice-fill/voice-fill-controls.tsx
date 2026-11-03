'use client';

import { useCallback, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { Button } from '@/core/components/duplicated-components/_button';
import { CheckCircle2, ChevronDown, Mic, Pause, Play, Spinner, X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { VoiceFill, VoiceFillError, VoiceFillPhase } from '@/core/hooks/ai/use-voice-fill';
import { VoiceLevelMeter } from './voice-level-meter';

/**
 * The tint a field takes for a moment once the voice filled it, so the person sees what changed. It fades through the
 * field's own transition; nothing moves.
 */
export const VOICE_FILLED_FIELD = 'rounded-md bg-primary/[0.06] ring-2 ring-primary/25';

export const VOICE_FILL_FIELD_TRANSITION = 'transition-[background-color,box-shadow] duration-500 ease-out';

const ERROR_MESSAGE_KEYS: Partial<Record<VoiceFillError, DottedLanguageObjectStringPaths>> = {
	permission_denied: 'dictation.errors.PERMISSION_DENIED',
	no_microphone: 'dictation.errors.NO_MICROPHONE',
	not_supported: 'dictation.errors.NOT_SUPPORTED',
	no_speech: 'dictation.errors.NO_SPEECH',
	too_short: 'dictation.errors.TOO_SHORT',
	too_large: 'dictation.errors.TOO_LARGE',
	rate_limited: 'dictation.errors.RATE_LIMITED',
	not_configured: 'dictation.errors.NOT_CONFIGURED',
	nothing_understood: 'voiceFill.errors.NOTHING_UNDERSTOOD'
};

const DEFAULT_ERROR_KEY: DottedLanguageObjectStringPaths = 'voiceFill.errors.UNAVAILABLE';

function errorMessageKeyOf(error: VoiceFillError) {
	return ERROR_MESSAGE_KEYS[error] ?? DEFAULT_ERROR_KEY;
}

/** The toast a failed voice fill shows: what went wrong and what to do; a cancellation says nothing. */
export function useVoiceFillErrorToast() {
	const t = useTranslations();
	return useCallback(
		(error: VoiceFillError) => {
			if (error === 'aborted') {
				return;
			}
			toast.error(t(errorMessageKeyOf(error)));
		},
		[t]
	);
}

function clockOf(seconds: number) {
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	const paddedRest = String(rest).padStart(2, '0');
	return `${minutes}:${paddedRest}`;
}

function isRecordingPhase(phase: VoiceFillPhase) {
	const isRecording = phase === 'recording';
	const isPaused = phase === 'paused';
	return isRecording || isPaused;
}

function isWorkingPhase(phase: VoiceFillPhase) {
	const isTranscribing = phase === 'transcribing';
	const isFilling = phase === 'filling';
	return isTranscribing || isFilling;
}

/**
 * The microphone of a creation form: it fills the whole form from one dictation. While the form listens it turns into
 * the stop control, so the place the person clicked is where they finish.
 */
export function VoiceFillTrigger({
	voice,
	disabled = false,
	className
}: Readonly<{ voice: VoiceFill; disabled?: boolean; className?: string }>) {
	const t = useTranslations();
	if (!voice.canFill) {
		return null;
	}
	const isRecording = isRecordingPhase(voice.phase);
	const isStarting = voice.phase === 'starting';
	const isBusy = isStarting || isWorkingPhase(voice.phase);
	const isDisabled = disabled || isBusy;
	if (isRecording) {
		const finishLabel = t('voiceFill.FILL_FIELDS');
		return (
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				onClick={voice.finish}
				aria-label={finishLabel}
				title={finishLabel}
				aria-pressed={true}
				className={cn('bg-destructive/10 text-destructive-ink hover:bg-destructive/15', className)}
			>
				<span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-destructive" />
			</Button>
		);
	}
	const label = t('voiceFill.FILL_BY_VOICE');
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			onClick={() => void voice.start()}
			disabled={isDisabled}
			aria-label={label}
			title={label}
			className={cn('text-muted-foreground', className)}
		>
			<Mic />
		</Button>
	);
}

function pauseControlOf(voice: VoiceFill, isPaused: boolean) {
	if (isPaused) {
		const labelKey: DottedLanguageObjectStringPaths = 'voiceFill.RESUME';
		return { labelKey, onPress: voice.resume };
	}
	const labelKey: DottedLanguageObjectStringPaths = 'voiceFill.PAUSE';
	return { labelKey, onPress: voice.pause };
}

const PANEL = 'flex flex-col gap-2 rounded-lg bg-foreground/[0.025] px-3 py-2.5 hairline-ring ring-border';

function RecordingRow({ voice, hint }: Readonly<{ voice: VoiceFill; hint: string }>) {
	const t = useTranslations();
	const isPaused = voice.phase === 'paused';
	const pauseControl = pauseControlOf(voice, isPaused);
	const pauseLabel = t(pauseControl.labelKey);
	return (
		<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
			<span className="flex items-center gap-2 text-destructive-ink">
				<span
					aria-hidden="true"
					className={cn('size-2 rounded-full bg-destructive', !isPaused && 'animate-pulse')}
				/>
				<VoiceLevelMeter analyserRef={voice.analyserRef} isActive={!isPaused} />
				<span className="text-xs font-medium tabular-nums">{clockOf(voice.elapsedSeconds)}</span>
			</span>
			<span className="min-w-0 flex-1 text-xs text-muted-foreground" aria-live="polite">
				{isPaused && t('voiceFill.PAUSED')}
				{!isPaused && hint}
			</span>
			<span className="flex items-center gap-1">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={pauseControl.onPress}
					aria-label={pauseLabel}
					title={pauseLabel}
					className="text-muted-foreground"
				>
					{isPaused && <Play />}
					{!isPaused && <Pause />}
				</Button>
				<Button type="button" variant="ghost" size="sm" onClick={voice.cancel}>
					{t('common.CANCEL')}
				</Button>
				<Button type="button" size="sm" onClick={voice.finish}>
					{t('voiceFill.FILL_FIELDS')}
				</Button>
			</span>
		</div>
	);
}

function WorkingRow({ voice }: Readonly<{ voice: VoiceFill }>) {
	const t = useTranslations();
	const isTranscribing = voice.phase === 'transcribing';
	return (
		<div className="flex items-center gap-2.5">
			<Spinner className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
			<output className="min-w-0 flex-1 text-[13px] text-foreground">
				{isTranscribing && t('voiceFill.TRANSCRIBING')}
				{!isTranscribing && t('voiceFill.FILLING')}
			</output>
			<Button type="button" variant="ghost" size="sm" onClick={voice.cancel}>
				{t('common.CANCEL')}
			</Button>
		</div>
	);
}

/** One chip per field the person sees: the start and the end of a date range read as one "Dates". */
function filledLabelsOf(filledKeys: string[], fieldLabels: Record<string, string>) {
	const labels = new Set<string>();
	for (const key of filledKeys) {
		const label = fieldLabels[key];
		if (label) {
			labels.add(label);
		}
	}
	return [...labels];
}

function DoneRow({ voice, fieldLabels }: Readonly<{ voice: VoiceFill; fieldLabels: Record<string, string> }>) {
	const t = useTranslations();
	const [showsTranscript, setShowsTranscript] = useState(false);
	const labels = filledLabelsOf(voice.filledKeys, fieldLabels);
	const hasTranscript = voice.transcript.length > 0;
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
				<CheckCircle2 className="size-4 shrink-0 text-success-foreground" aria-hidden="true" />
				<span className="text-[13px] font-medium text-foreground">{t('voiceFill.FILLED')}</span>
				<span className="flex min-w-0 flex-wrap items-center gap-1">
					{labels.map((label) => (
						<span
							key={label}
							className="inline-flex h-5 items-center rounded-md bg-foreground/[0.05] px-1.5 text-[11px] font-medium text-muted-foreground"
						>
							{label}
						</span>
					))}
				</span>
				<span className="ml-auto flex items-center gap-1">
					{voice.canUndo && (
						<Button type="button" variant="ghost" size="sm" onClick={voice.undo}>
							{t('voiceFill.UNDO')}
						</Button>
					)}
					<Button type="button" variant="ghost" size="sm" onClick={() => void voice.start()}>
						<Mic />
						{t('voiceFill.DICTATE_AGAIN')}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={voice.dismiss}
						aria-label={t('common.CLOSE')}
						className="text-muted-foreground"
					>
						<X />
					</Button>
				</span>
			</div>
			{hasTranscript && (
				<div className="flex flex-col gap-1.5">
					<button
						type="button"
						onClick={() => setShowsTranscript((shows) => !shows)}
						aria-expanded={showsTranscript}
						className="flex w-fit items-center gap-1 rounded-sm text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
					>
						<ChevronDown
							className={cn(
								'size-3.5 transition-transform duration-200',
								showsTranscript && 'rotate-180'
							)}
						/>
						{t('voiceFill.WHAT_YOU_SAID')}
					</button>
					<AnimatedHeight>
						{showsTranscript && (
							<p className="hairline-l border-dashed border-border pl-3 text-xs leading-relaxed whitespace-pre-line text-muted-foreground">
								{voice.transcript}
							</p>
						)}
					</AnimatedHeight>
				</div>
			)}
		</div>
	);
}

/**
 * What the form says while it listens and after: the live microphone with pause, cancel and fill; then the step it
 * is on; then which fields the voice filled, with undo, dictate again and the transcript. Nothing shows at rest.
 */
export function VoiceFillPanel({
	voice,
	hint,
	fieldLabels,
	className
}: Readonly<{ voice: VoiceFill; hint: string; fieldLabels: Record<string, string>; className?: string }>) {
	const isRecording = isRecordingPhase(voice.phase);
	const isWorking = isWorkingPhase(voice.phase);
	const isDone = voice.phase === 'done';
	const isVisible = isRecording || isWorking || isDone;
	return (
		<AnimatedHeight>
			{isVisible && (
				<div className={cn(PANEL, className)}>
					{isRecording && <RecordingRow voice={voice} hint={hint} />}
					{isWorking && <WorkingRow voice={voice} />}
					{isDone && <DoneRow voice={voice} fieldLabels={fieldLabels} />}
				</div>
			)}
		</AnimatedHeight>
	);
}
