import type { CSSProperties } from 'react';
import { cn } from '@/core/lib/helpers';
import {
	activityBandOf,
	type ActivityBand,
	type LimitVerdict,
	limitVerdictOf
} from '@/core/lib/utils/dashboard-figures';

const TRACK = 'hsl(var(--foreground) / 0.1)';
const PRIMARY = 'hsl(var(--primary))';
const WARNING = 'hsl(var(--warning))';
const DESTRUCTIVE = 'hsl(var(--destructive))';
const SUCCESS = 'hsl(var(--success))';

/** Thin ticks drawn by one element: a gradient for the fill, a repeating mask for the gaps. */
function tickMaskOf(tickWidth: number, gap: number): CSSProperties {
	const pattern = `repeating-linear-gradient(to right, #000 0 ${tickWidth}px, transparent ${tickWidth}px ${tickWidth + gap}px)`;
	return { maskImage: pattern, WebkitMaskImage: pattern };
}

const WITHIN_TONES: Record<LimitVerdict, string> = {
	within: PRIMARY,
	near: WARNING,
	over: PRIMARY
};

/**
 * Used time against a limit as a bar of ticks: the ticks fill up to the time used, and past the limit the scale
 * grows and the extra ticks turn destructive, so going over reads without a legend. The figure and the verdict are
 * always written next to it, colour is never the only signal.
 */
export function LimitMeter({ used, limit, className }: Readonly<{ used: number; limit: number; className?: string }>) {
	const verdict = limitVerdictOf(used, limit);
	const scale = Math.max(limit, used, 1);
	const withinEnd = (Math.min(used, limit) / scale) * 100;
	const usedEnd = (used / scale) * 100;
	const withinTone = WITHIN_TONES[verdict];
	const background = `linear-gradient(to right, ${withinTone} 0 ${withinEnd}%, ${DESTRUCTIVE} ${withinEnd}% ${usedEnd}%, ${TRACK} ${usedEnd}% 100%)`;

	return (
		<span
			aria-hidden="true"
			className={cn('block h-3 w-full min-w-16 rounded-[2px]', className)}
			style={{ background, ...tickMaskOf(3, 2) }}
		/>
	);
}

const VERDICT_TEXT: Record<LimitVerdict, string> = {
	within: 'text-muted-foreground',
	near: 'text-warning-foreground',
	over: 'text-destructive-ink'
};

export function limitVerdictTextClassOf(verdict: LimitVerdict) {
	return VERDICT_TEXT[verdict];
}

const BAND_TONES: Record<ActivityBand, string> = {
	low: DESTRUCTIVE,
	medium: WARNING,
	high: SUCCESS
};

/** Activity as a short meter of five ticks in the band's tone, next to the written percentage. */
export function ActivityMeter({ percent, className }: Readonly<{ percent: number; className?: string }>) {
	const safePercent = Math.min(Math.max(percent, 0), 100);
	const tone = BAND_TONES[activityBandOf(safePercent)];
	const background = `linear-gradient(to right, ${tone} 0 ${safePercent}%, ${TRACK} ${safePercent}% 100%)`;
	return (
		<span
			aria-hidden="true"
			className={cn('block h-2.5 w-11 shrink-0 rounded-[2px]', className)}
			style={{ background, ...tickMaskOf(7, 2) }}
		/>
	);
}

export function ActivityFigure({ percent, className }: Readonly<{ percent: number; className?: string }>) {
	const rounded = Math.round(percent);
	return (
		<span className={cn('inline-flex items-center justify-end gap-2', className)}>
			<ActivityMeter percent={rounded} />
			<span className="w-9 text-right text-[13px] tabular-nums text-foreground">{rounded}%</span>
		</span>
	);
}

/** A thin share meter: one track, one fill, for ranked rows. */
export function ShareMeter({ share, className }: Readonly<{ share: number; className?: string }>) {
	const width = `${Math.min(Math.max(share, 0), 100)}%`;
	return (
		<span
			aria-hidden="true"
			className={cn('block h-1 w-full overflow-hidden rounded-full bg-foreground/[0.07]', className)}
		>
			<span className="block h-full rounded-full bg-primary/80" style={{ width }} />
		</span>
	);
}
