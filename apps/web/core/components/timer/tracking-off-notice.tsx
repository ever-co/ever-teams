'use client';

import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { TimerOff } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

const TOOLTIP_DELAY_MS = 400;

/** The compact timer's pill, muted: same height and shape, so the top bar keeps its rhythm. */
const PILL =
	'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-card px-2.5 text-[13px] text-muted-foreground hairline-ring ring-border sm:px-3 dark:ring-foreground/15';

/** Where the timer would be for a member whose time tracking is turned off: why it is not there, and who can turn it on. */
export function TrackingOffNotice({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	return (
		<p className={cn('flex items-start gap-2 text-[13px] leading-5 text-pretty text-muted-foreground', className)}>
			<TimerOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
			<span>{t('timer.TRACKING_DISABLED_MESSAGE')}</span>
		</p>
	);
}

/**
 * The same reason in the top bar, where the compact timer would be: a short label (only the icon on phones), the
 * whole sentence on hover and for screen readers.
 */
export function TrackingOffPill({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	const reason = t('timer.TRACKING_DISABLED_MESSAGE');
	return (
		<Tooltip>
			<TooltipTrigger asChild delay={TOOLTIP_DELAY_MS}>
				<span className={cn(PILL, className)}>
					<TimerOff aria-hidden="true" className="size-4 shrink-0" />
					<span aria-hidden="true" className="hidden whitespace-nowrap sm:inline">
						{t('timer.TRACKING_OFF')}
					</span>
					<span className="sr-only">{reason}</span>
				</span>
			</TooltipTrigger>
			<TooltipContent side="bottom" className="max-w-64 text-pretty">
				{reason}
			</TooltipContent>
		</Tooltip>
	);
}
