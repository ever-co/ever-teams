'use client';

import { useCallback, type KeyboardEvent } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/core/components/duplicated-components/_button';
import { Mic, Spinner, Stop } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { useDictation, type DictationError } from '@/core/hooks/ai/use-dictation';

const ERROR_MESSAGE_KEYS: Partial<Record<DictationError, DottedLanguageObjectStringPaths>> = {
	permission_denied: 'dictation.errors.PERMISSION_DENIED',
	no_microphone: 'dictation.errors.NO_MICROPHONE',
	not_supported: 'dictation.errors.NOT_SUPPORTED',
	no_speech: 'dictation.errors.NO_SPEECH',
	too_short: 'dictation.errors.TOO_SHORT',
	too_large: 'dictation.errors.TOO_LARGE',
	rate_limited: 'dictation.errors.RATE_LIMITED',
	not_configured: 'dictation.errors.NOT_CONFIGURED',
	unsupported_format: 'dictation.errors.NOT_SUPPORTED'
};

const DEFAULT_ERROR_KEY: DottedLanguageObjectStringPaths = 'dictation.errors.UNAVAILABLE';

function errorMessageKeyOf(error: DictationError) {
	return ERROR_MESSAGE_KEYS[error] ?? DEFAULT_ERROR_KEY;
}

function clockOf(seconds: number) {
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	const paddedRest = String(rest).padStart(2, '0');
	return `${minutes}:${paddedRest}`;
}

/**
 * A microphone beside a text field: one click records, a second sends the recording, and the text lands in the
 * field through `onText`. It renders nothing where dictation cannot work (no provider on the server, no
 * microphone API in the browser), so a field never offers a control that fails.
 */
export function DictationButton({
	onText,
	disabled = false,
	className
}: Readonly<{ onText: (text: string) => void; disabled?: boolean; className?: string }>) {
	const t = useTranslations();
	const showError = useCallback(
		(error: DictationError) => {
			const isAborted = error === 'aborted';
			if (isAborted) {
				return;
			}
			toast.error(t(errorMessageKeyOf(error)));
		},
		[t]
	);
	const { canDictate, phase, elapsedSeconds, start, stop, cancel } = useDictation({ onText, onError: showError });

	const focusWhenFocusWasDropped = useCallback((button: HTMLButtonElement | null) => {
		if (!button) {
			return;
		}
		const activeElement = document.activeElement;
		const focusWasDropped = activeElement === null || activeElement === document.body;
		if (focusWasDropped) {
			button.focus();
		}
	}, []);

	const cancelOnEscape = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		cancel();
	};

	if (!canDictate) {
		return null;
	}

	if (phase === 'recording') {
		const stopLabel = t('dictation.STOP_AND_TRANSCRIBE');
		return (
			<button
				ref={focusWhenFocusWasDropped}
				type="button"
				onClick={stop}
				onKeyDown={cancelOnEscape}
				aria-label={stopLabel}
				title={stopLabel}
				className={cn(
					'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-destructive/10 pr-2.5 pl-2 text-xs font-medium tabular-nums text-destructive-ink outline-none transition-colors hover:bg-destructive/15 focus-visible:ring-[3px] focus-visible:ring-destructive/25',
					className
				)}
			>
				<span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-destructive" />
				<span>{clockOf(elapsedSeconds)}</span>
				<Stop className="size-3.5" aria-hidden="true" />
				<span className="sr-only" aria-live="polite">
					{t('dictation.RECORDING')}
				</span>
			</button>
		);
	}

	if (phase === 'transcribing') {
		return (
			<span
				role="status"
				className={cn(
					'inline-flex size-7 shrink-0 items-center justify-center text-muted-foreground',
					className
				)}
			>
				<Spinner className="size-4 animate-spin" aria-hidden="true" />
				<span className="sr-only">{t('dictation.TRANSCRIBING')}</span>
			</span>
		);
	}

	const dictateLabel = t('dictation.DICTATE');
	const isStarting = phase === 'starting';
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			onClick={() => void start()}
			disabled={disabled || isStarting}
			aria-label={dictateLabel}
			title={dictateLabel}
			className={cn('text-muted-foreground', className)}
		>
			<Mic />
		</Button>
	);
}
