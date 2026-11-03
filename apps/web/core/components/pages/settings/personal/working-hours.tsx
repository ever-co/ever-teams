import React from 'react';
import { TimePicker } from '@/core/components/common/time-picker';
import { TimezoneDropDown } from '../../../settings/timezone-dropdown';
import { Button } from '@/core/components/duplicated-components/_button';
import { Plus, X } from '@/core/components/icons';
import { SWITCH_THUMB_CLASS, SWITCH_TRACK_CLASS } from '../switch-recipe';
import { SETTINGS_LABEL_CLASS, SETTINGS_ROW_CLASS } from '../settings-section';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	getActiveLanguageIdCookie,
	getActiveTimezoneIdCookie,
	setActiveTimezoneCookie
} from '@/core/lib/helpers/index';
import { userTimezone } from '@/core/lib/helpers/user-timezone';
import { useForm } from 'react-hook-form';

import { useTranslations } from 'next-intl';
import { initializeWorkSchedule, type WorkDay, type WorkDayInput, WORKDAY_ROW_CLASS } from './working-hours-utils';

interface WorkScheduleProps {
	initialSchedule?: WorkDayInput[];
}

export const WorkingHours: React.FC<WorkScheduleProps> = ({ initialSchedule }) => {
	const [currentTimezone, setCurrentTimezone] = React.useState('');
	const { data: user } = useUserQuery();
	const t = useTranslations();
	const { setValue } = useForm();

	const defaultWorkDays: WorkDayInput[] = [
		{
			day: t('common.DAYOFWEEK.Monday'),
			timeSlots: [
				{ startTime: '09:00', endTime: '14:00' },
				{ startTime: '15:00', endTime: '16:00' },
				{ startTime: '16:30', endTime: '19:30' }
			],
			enabled: true
		},
		{
			day: t('common.DAYOFWEEK.Tuesday'),
			timeSlots: [{ startTime: '09:00', endTime: '14:00' }],
			enabled: true
		},
		{
			day: t('common.DAYOFWEEK.Wednesday'),
			timeSlots: [{ startTime: '09:00', endTime: '14:00' }],
			enabled: true
		},
		{
			day: t('common.DAYOFWEEK.Thursday'),
			timeSlots: [{ startTime: '09:00', endTime: '14:00' }],
			enabled: true
		},
		{
			day: t('common.DAYOFWEEK.Friday'),
			timeSlots: [{ startTime: '09:00', endTime: '14:00' }],
			enabled: true
		},
		{
			day: t('common.DAYOFWEEK.Saturday'),
			timeSlots: [{ startTime: '09:00', endTime: '14:00' }],
			enabled: true
		},
		{
			day: t('common.DAYOFWEEK.Sunday'),
			timeSlots: [],
			enabled: false
		}
	];

	const [schedule, setSchedule] = React.useState<WorkDay[]>(() =>
		initializeWorkSchedule(initialSchedule || defaultWorkDays)
	);
	const handleChangeTimezone = React.useCallback(
		(newTimezone: string | undefined) => {
			setActiveTimezoneCookie(newTimezone || userTimezone());
			setCurrentTimezone(newTimezone || userTimezone());
			setValue('timeZone', newTimezone || userTimezone());
		},
		[setCurrentTimezone, setValue]
	);
	React.useEffect(() => {
		setCurrentTimezone(user?.timeZone || getActiveTimezoneIdCookie());
		setValue('timeZone', user?.timeZone || getActiveTimezoneIdCookie());
	}, [setCurrentTimezone, setValue, user, user?.timeZone]);
	React.useEffect(() => {
		/**
		 * Set Default current timezone.
		 * User can change it anytime if wants
		 */
		if (!user?.timeZone) {
			handleChangeTimezone(undefined);
		}
	}, [currentTimezone, setValue, handleChangeTimezone, user?.timeZone]);

	React.useEffect(() => {
		setValue('preferredLanguage', user?.preferredLanguage || getActiveLanguageIdCookie());
	}, [user, user?.preferredLanguage, setValue]);

	const handleTimeChange = (dayIndex: number, slotIndex: number, field: 'startTime' | 'endTime', value: string) => {
		const newSchedule = [...schedule];
		newSchedule[dayIndex].timeSlots[slotIndex] = {
			...newSchedule[dayIndex].timeSlots[slotIndex],
			[field]: value
		};
		setSchedule(newSchedule);
	};

	const handleAddTimeSlot = (dayIndex: number) => {
		const newSchedule = [...schedule];
		newSchedule[dayIndex].timeSlots.push({
			id: `slot-${crypto.randomUUID()}`,
			startTime: '09:00',
			endTime: '17:00'
		});
		setSchedule(newSchedule);
	};

	const handleRemoveTimeSlot = (dayIndex: number, slotIndex: number) => {
		const newSchedule = [...schedule];
		newSchedule[dayIndex].timeSlots.splice(slotIndex, 1);
		setSchedule(newSchedule);
	};

	const handleToggleDay = (index: number) => {
		const newSchedule = [...schedule];
		newSchedule[index] = {
			...newSchedule[index],
			enabled: !newSchedule[index].enabled
		};
		setSchedule(newSchedule);
	};

	return (
		<div className="flex w-full flex-col gap-4">
			<div className={SETTINGS_ROW_CLASS}>
				<p className={SETTINGS_LABEL_CLASS}>{t('common.TIME_ZONE')}</p>
				<div className="max-w-sm">
					<TimezoneDropDown
						currentTimezone={currentTimezone}
						onChange={(t: string) => {
							handleChangeTimezone(t);
						}}
					/>
				</div>
			</div>
			<div className="flex flex-col hairline-divide-y divide-border">
				{schedule.map((workDay, dayIndex) => (
					<div key={workDay.day} className={WORKDAY_ROW_CLASS}>
						<div className="pt-1">
							<ToggleSwitch
								enabled={workDay.enabled}
								onToggle={() => handleToggleDay(dayIndex)}
								label={workDay.day}
								ariaLabel={t('pages.settingsPersonal.TOGGLE_AVAILABILITY_FOR', {
									day: workDay.day
								})}
							/>
						</div>
						{workDay.enabled && (
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								onClick={() => handleAddTimeSlot(dayIndex)}
								className="col-start-2 row-start-1 ml-auto text-muted-foreground sm:col-start-3"
								aria-label={t('pages.settingsPersonal.ADD_HOURS_FOR', { day: workDay.day })}
							>
								<Plus />
							</Button>
						)}
						{workDay.enabled &&
							workDay.timeSlots.map((timeSlot, slotIndex) => (
								<div
									key={timeSlot.id}
									className="col-span-2 col-start-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] items-center gap-2 pb-2 sm:col-span-1 sm:col-start-2 sm:flex"
								>
									<TimePicker
										value={timeSlot.startTime}
										onChange={(value) => handleTimeChange(dayIndex, slotIndex, 'startTime', value)}
										className="h-9 w-full rounded-md hairline-border border-border bg-card text-sm sm:w-24"
									/>
									<span className="mx-1 text-muted-foreground">–</span>
									<TimePicker
										value={timeSlot.endTime}
										onChange={(value) => handleTimeChange(dayIndex, slotIndex, 'endTime', value)}
										className="h-9 w-full rounded-md hairline-border border-border bg-card text-sm sm:w-24"
									/>
									{workDay.timeSlots.length > 1 && (
										<Button
											type="button"
											variant="ghost"
											size="icon-sm"
											onClick={() => handleRemoveTimeSlot(dayIndex, slotIndex)}
											className="text-muted-foreground"
											aria-label={t('pages.settingsPersonal.REMOVE_HOURS_FOR', {
												day: workDay.day
											})}
										>
											<X />
										</Button>
									)}
								</div>
							))}
						{!workDay.enabled && (
							<div className="col-span-2 py-2 text-sm text-muted-foreground sm:col-span-1 sm:col-start-2">
								{t('pages.settingsPersonal.UNAVAILABLE')}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
};

interface ToggleSwitchProps {
	enabled: boolean;
	onToggle: () => void;
	label?: string;
	ariaLabel: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onToggle, label, ariaLabel }) => (
	<div className="flex items-center">
		<button
			type="button"
			role="switch"
			aria-checked={enabled}
			aria-label={ariaLabel}
			className={SWITCH_TRACK_CLASS}
			onClick={onToggle}
		>
			<span className={SWITCH_THUMB_CLASS} />
		</button>
		{label && (
			<button
				type="button"
				className="ml-2 rounded-sm text-sm font-medium text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
				onClick={onToggle}
			>
				{label}
			</button>
		)}
	</div>
);
