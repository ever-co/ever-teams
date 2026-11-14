'use client';

import { useTranslations } from 'next-intl';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Button } from '@/core/components/duplicated-components/_button';
import { Break, Stop } from '@/core/components/icons';
import { useBreakElapsedSeconds } from '@/core/hooks/timer/use-timer-break';
import { cn } from '@/core/lib/helpers';
import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { pad } from '@/core/lib/helpers/number';
import { TIMER_ENTRY_TOGGLE, TIMER_ENTRY_TOGGLE_GLYPH, TIMER_TOOLTIP_DELAY_MS } from './timer-toggle-recipe';

function breakLabelKeyOf(isOnBreak: boolean) {
	if (isOnBreak) {
		return 'breaks.END_BREAK' as const;
	}
	return 'breaks.TAKE_BREAK' as const;
}

function BreakButtonGlyph({ isOnBreak }: Readonly<{ isOnBreak: boolean }>) {
	if (isOnBreak) {
		return <Stop aria-hidden="true" className={TIMER_ENTRY_TOGGLE_GLYPH} />;
	}
	return <Break aria-hidden="true" className={TIMER_ENTRY_TOGGLE_GLYPH} />;
}

/**
 * The timer's secondary round button beside its main one, in the entry toggles' style: "Take a break" while work
 * runs, "End break" during a break, which ends it without starting work (the end of the day, for one).
 */
export function TimerBreakButton({
	isOnBreak,
	pending,
	disabled = false,
	onTakeBreak,
	onEndBreak,
	className
}: Readonly<{
	isOnBreak: boolean;
	pending: boolean;
	disabled?: boolean;
	onTakeBreak: () => void;
	onEndBreak: () => void;
	className?: string;
}>) {
	const t = useTranslations();
	const label = t(breakLabelKeyOf(isOnBreak));
	const isUnavailable = pending || disabled;

	const handleClick = () => {
		if (isUnavailable) {
			return;
		}
		if (isOnBreak) {
			onEndBreak();
			return;
		}
		onTakeBreak();
	};

	return (
		<Tooltip>
			<TooltipTrigger delay={TIMER_TOOLTIP_DELAY_MS} render={<span className="inline-flex rounded-full" />}>
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					aria-label={label}
					aria-disabled={isUnavailable}
					aria-busy={pending}
					onClick={handleClick}
					className={cn(TIMER_ENTRY_TOGGLE, pending && 'animate-pulse', className)}
				>
					<BreakButtonGlyph isOnBreak={isOnBreak} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

/** The break's running time, ticking once per second on its own so the timer around it does not re-render. */
export function BreakClock({ startedAtMs }: Readonly<{ startedAtMs: number | null }>) {
	const { hours, minutes, seconds } = secondsToTime(useBreakElapsedSeconds(startedAtMs));
	return <>{`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`}</>;
}
