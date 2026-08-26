import React from 'react';
import { TimePicker } from '@/core/components/common/time-picker';
import { TimezoneDropDown } from '../../../settings/timezone-dropdown';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	getActiveLanguageIdCookie,
	getActiveTimezoneIdCookie,
	setActiveTimezoneCookie,
	userTimezone
} from '@/core/lib/helpers/index';
import { useForm } from 'react-hook-form';

import { useTranslations } from 'next-intl';

interface TimeSlot {
	id?: string;
	startTime: string;
	endTime: string;
}

interface WorkDay {
	day: string;
	timeSlots: TimeSlot[];
	enabled: boolean;
}

interface WorkScheduleProps {
	initialSchedule?: WorkDay[];
}

export const WorkingHours: React.FC<WorkScheduleProps> = ({ initialSchedule }) => {
	const [currentTimezone, setCurrentTimezone] = React.useState('');
	const { data: user } = useUserQuery();
	const t = useTranslations();
	const { setValue } = useForm();

	const defaultWorkDays: WorkDay[] = [
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

	const [schedule, setSchedule] = React.useState<WorkDay[]>(initialSchedule || defaultWorkDays);
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
		newSchedule[dayIndex].timeSlots.push({ id: `slot-${Date.now()}`, startTime: '09:00', endTime: '17:00' });
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
		<div className="w-full">
			<div>
				<div className="grid grid-cols-[10rem_minmax(0,1fr)] items-center gap-3 pb-4">
					<p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.TIME_ZONE')}</p>
					<div className="max-w-sm">
						<TimezoneDropDown
							currentTimezone={currentTimezone}
							onChange={(t: string) => {
								handleChangeTimezone(t);
							}}
						/>
					</div>
				</div>
				{schedule.map((workDay, dayIndex) => (
					<div
						key={workDay.day}
						className="grid grid-cols-[10rem_minmax(0,1fr)_2rem] items-start gap-x-3 border-t py-3 dark:border-white/10"
					>
						<div className="pt-1">
							<div>
								<ToggleSwitch
									enabled={workDay.enabled}
									onToggle={() => handleToggleDay(dayIndex)}
									label={workDay.day}
								/>
							</div>
						</div>
						{workDay.enabled && (
							<button
								onClick={() => handleAddTimeSlot(dayIndex)}
								className="col-start-3 row-start-1 ml-auto flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/15"
								aria-label={`Add hours for ${workDay.day}`}
							>
								<span className="text-2xl leading-none">+</span>
							</button>
						)}
						{workDay.enabled &&
							workDay.timeSlots.map((timeSlot, slotIndex) => (
								<div
									key={timeSlot.id || `${workDay.day}-${timeSlot.startTime}-${timeSlot.endTime}`}
									className="col-start-2 flex items-center gap-2 pb-2"
								>
									<TimePicker
										value={timeSlot.startTime}
										onChange={(value) => handleTimeChange(dayIndex, slotIndex, 'startTime', value)}
										className="w-24 text-sm bg-white dark:bg-gray-700/50 dark:text-gray-300 rounded-md"
									/>
									<span className="mx-1 text-gray-400 dark:text-gray-500">-</span>
									<TimePicker
										value={timeSlot.endTime}
										onChange={(value) => handleTimeChange(dayIndex, slotIndex, 'endTime', value)}
										className="w-24 text-sm bg-white dark:bg-dark--theme-light dark:text-gray-400"
									/>
									{workDay.timeSlots.length > 1 && (
										<button
											onClick={() => handleRemoveTimeSlot(dayIndex, slotIndex)}
											className="flex justify-center items-center w-7 h-7 text-gray-400 rounded-md hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-600/30"
											aria-label={`Remove hours for ${workDay.day}`}
										>
											<span className="text-xl font-medium leading-none">×</span>
										</button>
									)}
								</div>
							))}
						{!workDay.enabled && (
							<div className="col-start-2 py-2 text-sm text-gray-400 dark:text-gray-500">Unavailable</div>
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
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onToggle, label }) => (
	<div className="flex items-center">
		<button
			type="button"
			className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? 'bg-[#DBD3FA] dark:bg-purple-400/30' : 'bg-[#EDEDED] dark:bg-gray-600'}`}
			onClick={onToggle}
		>
			<span
				className={`${enabled ? 'bg-[#3826A6] dark:bg-purple-500' : 'bg-white dark:bg-gray-300'} pointer-events-none absolute left-0.5 top-0.5 inline-block h-4 w-4 transform rounded-full shadow-xs ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
			/>
		</button>
		{label && (
			<button
				type="button"
				className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-400"
				onClick={onToggle}
			>
				{label}
			</button>
		)}
	</div>
);
