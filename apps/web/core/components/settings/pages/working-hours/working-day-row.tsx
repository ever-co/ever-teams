'use client';

import { ChangeEvent, Fragment, useId } from 'react';
import { useTranslations } from 'next-intl';
import { controlRecipe } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { ArrowRight, Plus, X } from '@/core/components/icons';
import { SETTINGS_ROW_LABEL } from '@/core/components/settings/kit/settings-page';
import { SettingsSwitch } from '@/core/components/settings/kit/settings-switch';
import { cn } from '@/core/lib/helpers';
import { formatHoursLabel } from '@/core/lib/utils/dashboard-figures';
import {
	daySeconds,
	minutesOfTime,
	SlotField,
	SlotProblem,
	slotProblemOf,
	Weekday,
	WorkingDay
} from '@/core/lib/utils/settings-working-hours';

const TIME_FIELD = cn(controlRecipe, 'h-8 w-[6.75rem] px-2 text-[13px] tabular-nums');

const PROBLEM_KEYS: Record<SlotProblem, 'settings.workingHours.RANGE_ORDER' | 'settings.workingHours.RANGE_OVERLAP'> = {
	order: 'settings.workingHours.RANGE_ORDER',
	overlap: 'settings.workingHours.RANGE_OVERLAP'
};

type WorkingDayRowProps = {
	day: WorkingDay;
	dayLabel: string;
	onWorkingChange: (day: Weekday, isWorking: boolean) => void;
	onSlotChange: (day: Weekday, slotId: string, field: SlotField, value: string) => void;
	onSlotAdd: (day: Weekday) => void;
	onSlotRemove: (day: Weekday, slotId: string) => void;
};

function describedByOf(problem: SlotProblem | null, errorId: string) {
	if (!problem) {
		return undefined;
	}
	return errorId;
}

function durationOf(day: WorkingDay): string | null {
	const seconds = daySeconds(day);
	if (seconds === 0) {
		return null;
	}
	return formatHoursLabel(seconds);
}

export function WorkingDayRow({
	day,
	dayLabel,
	onWorkingChange,
	onSlotChange,
	onSlotAdd,
	onSlotRemove
}: Readonly<WorkingDayRowProps>) {
	const t = useTranslations();
	const switchId = useId();
	const duration = durationOf(day);
	const slotCount = day.slots.length;
	const canRemoveSlot = slotCount > 1;
	const lastIndex = slotCount - 1;
	const hasNoSlot = slotCount === 0;
	const showsLoneAdd = day.isWorking && hasNoSlot;
	const addLabel = t('pages.settingsPersonal.ADD_HOURS_FOR', { day: dayLabel });

	const changeTime = (slotId: string, field: SlotField) => (event: ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		const isComplete = minutesOfTime(value) !== null;
		if (!isComplete) {
			return;
		}
		onSlotChange(day.day, slotId, field, value);
	};

	return (
		<div className="flex min-h-14 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
			<div className="flex items-center gap-3 sm:h-8 sm:w-36 sm:shrink-0">
				<SettingsSwitch
					id={switchId}
					checked={day.isWorking}
					onCheckedChange={(isWorking) => onWorkingChange(day.day, isWorking)}
				/>
				<label htmlFor={switchId} className={cn(SETTINGS_ROW_LABEL, 'cursor-pointer')}>
					{dayLabel}
				</label>
				{duration && (
					<span className="ml-auto text-xs text-muted-foreground tabular-nums sm:hidden">{duration}</span>
				)}
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				{!day.isWorking && (
					<span className="flex h-8 items-center text-[13px] text-muted-foreground">
						{t('settings.workingHours.NOT_WORKING')}
					</span>
				)}
				{showsLoneAdd && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => onSlotAdd(day.day)}
						className="w-fit text-muted-foreground"
					>
						<Plus />
						{addLabel}
					</Button>
				)}
				{day.isWorking &&
					day.slots.map((slot, index) => {
						const problem = slotProblemOf(day, index);
						const position = index + 1;
						const isLast = index === lastIndex;
						const errorId = `${switchId}-${slot.id}-error`;
						return (
							<Fragment key={slot.id}>
								<div className="flex flex-wrap items-center gap-2">
									<input
										type="time"
										value={slot.start}
										onChange={changeTime(slot.id, 'start')}
										aria-label={t('settings.workingHours.START_OF', { day: dayLabel, position })}
										className={TIME_FIELD}
									/>
									<ArrowRight
										aria-hidden="true"
										className="size-3.5 shrink-0 text-muted-foreground"
									/>
									<input
										type="time"
										value={slot.end}
										onChange={changeTime(slot.id, 'end')}
										aria-label={t('settings.workingHours.END_OF', { day: dayLabel, position })}
										aria-invalid={Boolean(problem) || undefined}
										aria-describedby={describedByOf(problem, errorId)}
										className={TIME_FIELD}
									/>
									{canRemoveSlot && (
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											onClick={() => onSlotRemove(day.day, slot.id)}
											aria-label={t('pages.settingsPersonal.REMOVE_HOURS_FOR', { day: dayLabel })}
											className="text-muted-foreground"
										>
											<X />
										</Button>
									)}
									{isLast && (
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											onClick={() => onSlotAdd(day.day)}
											aria-label={addLabel}
											className="text-muted-foreground"
										>
											<Plus />
										</Button>
									)}
								</div>
								{problem && (
									<p id={errorId} role="alert" className="-mt-1 text-xs text-destructive-ink">
										{t(PROBLEM_KEYS[problem])}
									</p>
								)}
							</Fragment>
						);
					})}
			</div>
			<span className="hidden h-8 w-14 shrink-0 items-center justify-end text-[13px] text-muted-foreground tabular-nums sm:flex">
				{duration}
			</span>
		</div>
	);
}
