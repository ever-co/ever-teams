'use client';

import { type KeyboardEvent, useId, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { CircleAlert, Spinner } from '@/core/components/icons';
import type { DurationEntry } from '@/core/hooks/timesheet/use-duration-entry';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { DurationPhase } from '@/core/lib/utils/dashboards/manual-time-entry';

type NoticeTone = 'hint' | 'busy' | 'error';

interface DurationNotice {
	text: string;
	tone: NoticeTone;
}

const NOTICE_TONE_CLASS: Record<NoticeTone, string> = {
	hint: 'text-muted-foreground',
	busy: 'text-muted-foreground',
	error: 'text-destructive-ink'
};

function noticeOf(
	phase: DurationPhase,
	t: ReturnType<typeof useTranslations>,
	timeFormatter: Intl.DateTimeFormat
): DurationNotice {
	switch (phase.kind) {
		case 'invalid':
			return { text: t('dashboard.timesheets.SHEET.EDIT.INVALID'), tone: 'error' };
		case 'noMember':
			return { text: t('manualTime.DURATION.NO_MEMBER'), tone: 'error' };
		case 'reading':
			return { text: t('manualTime.DURATION.READING'), tone: 'busy' };
		case 'proposed': {
			const start = timeFormatter.format(phase.interval.start);
			const end = timeFormatter.format(phase.interval.end);
			return { text: t('manualTime.DURATION.PROPOSED', { start, end }), tone: 'hint' };
		}
		case 'noRoom': {
			const duration = formatDurationShort(phase.seconds);
			return { text: t('manualTime.DURATION.NO_ROOM', { duration }), tone: 'error' };
		}
		case 'closedDay':
			return { text: t('dashboard.timesheets.SHEET.EDIT.LOCK_FUTURE'), tone: 'error' };
		case 'failed':
			return { text: t('manualTime.DURATION.READ_FAILED'), tone: 'error' };
		default:
			return { text: t('manualTime.DURATION.HINT'), tone: 'hint' };
	}
}

export function DurationField({ entry, className }: Readonly<{ entry: DurationEntry; className?: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const inputId = useId();
	const noticeId = useId();
	const timeFormatter = useMemo(
		() => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
		[locale]
	);
	const notice = noticeOf(entry.phase, t, timeFormatter);
	const isError = notice.tone === 'error';
	const isBusy = notice.tone === 'busy';
	const canRetry = entry.phase.kind === 'failed';

	const commitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter') {
			return;
		}
		// Enter in a form's text field would submit the form: here it asks for the proposal instead
		event.preventDefault();
		entry.commit();
	};

	return (
		<div className={cn('flex flex-col gap-1.5 rounded-lg bg-foreground/[0.03] px-3 py-2', className)}>
			<div className="flex items-center justify-between gap-3">
				<label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
					{t('manualTime.DURATION.LABEL')}
				</label>
				<Input
					id={inputId}
					type="text"
					inputMode="text"
					enterKeyHint="done"
					autoComplete="off"
					value={entry.text}
					placeholder={t('manualTime.DURATION.PLACEHOLDER')}
					onChange={(event) => entry.change(event.target.value)}
					onBlur={entry.commit}
					onKeyDown={commitOnEnter}
					aria-invalid={isError}
					aria-describedby={noticeId}
					className="h-8 w-32 shrink-0 text-end tabular-nums"
				/>
			</div>
			<p
				id={noticeId}
				aria-live="polite"
				className={cn('flex flex-wrap items-start gap-x-1.5 gap-y-0.5 text-xs', NOTICE_TONE_CLASS[notice.tone])}
			>
				{isError && <CircleAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true" />}
				{isBusy && <Spinner className="mt-0.5 size-3 shrink-0 animate-spin" aria-hidden="true" />}
				<span className="min-w-0 flex-1">{notice.text}</span>
				{canRetry && (
					<button
						type="button"
						onClick={entry.retry}
						className="rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25"
					>
						{t('manualTime.DURATION.RETRY')}
					</button>
				)}
			</p>
		</div>
	);
}
