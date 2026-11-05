'use client';

import { Switch } from '@headlessui/react';
import { useTranslations } from 'next-intl';

import { SWITCH_THUMB_RECIPE, SWITCH_TRACK_RECIPE } from '@/core/components/common/switch';
import { useTimerBillable } from '@/core/hooks/timer/use-timer-billable';
import { cn } from '@/core/lib/helpers';

const BILLABLE_TRACK_CLASS_NAME = cn(
	SWITCH_TRACK_RECIPE,
	'h-5 w-8.5 data-disabled:cursor-not-allowed data-disabled:opacity-50'
);

const BILLABLE_THUMB_CLASS_NAME = cn(SWITCH_THUMB_RECIPE, 'size-3.5 group-data-checked:translate-x-3.5');

export function TimerBillableSwitch({ locked = false }: Readonly<{ locked?: boolean }>) {
	const t = useTranslations();
	const { isBillable, isLocked, setIsBillable } = useTimerBillable();
	const isDisabled = locked || isLocked;
	const label = t('timer.BILLABLE');

	return (
		<div className="flex items-center gap-2">
			<span className="text-xs text-muted-foreground">{label}</span>
			<Switch
				checked={isBillable}
				onChange={setIsBillable}
				disabled={isDisabled}
				aria-label={label}
				className={BILLABLE_TRACK_CLASS_NAME}
			>
				<span aria-hidden="true" className={BILLABLE_THUMB_CLASS_NAME} />
			</Switch>
		</div>
	);
}
