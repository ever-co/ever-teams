'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import { ShineBorder } from '@/core/components/common/shine-border';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Button } from '@/core/components/duplicated-components/_button';
import { Dollar } from '@/core/components/icons';
import { useTimerBillable } from '@/core/hooks/timer/use-timer-billable';
import { cn } from '@/core/lib/helpers';
import { TIMER_ENTRY_TOGGLE, TIMER_ENTRY_TOGGLE_GLYPH, TIMER_TOOLTIP_DELAY_MS } from './timer-toggle-recipe';

function stateLabelKeyOf(isBillable: boolean) {
	if (isBillable) {
		return 'timer.BILLABLE' as const;
	}
	return 'timer.NOT_BILLABLE' as const;
}

/**
 * Whether the entry is billable, as a $ toggle: its name stays "Billable" and `aria-pressed` tells the state. A billable
 * entry gets the brand tint and the shine ring.
 */
export function TimerBillableToggle({ locked = false, className }: Readonly<{ locked?: boolean; className?: string }>) {
	const t = useTranslations();
	const { isBillable, isLocked, setIsBillable } = useTimerBillable();
	const isDisabled = locked || isLocked;

	const toggle = useCallback(() => {
		setIsBillable(!isBillable);
	}, [isBillable, setIsBillable]);

	return (
		<Tooltip>
			<TooltipTrigger delay={TIMER_TOOLTIP_DELAY_MS} asChild>
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					aria-label={t('timer.BILLABLE')}
					aria-pressed={isBillable}
					disabled={isDisabled}
					onClick={toggle}
					className={cn(TIMER_ENTRY_TOGGLE, className)}
				>
					<Dollar aria-hidden="true" className={TIMER_ENTRY_TOGGLE_GLYPH} />
					<ShineBorder active={isBillable} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{t(stateLabelKeyOf(isBillable))}</TooltipContent>
		</Tooltip>
	);
}
