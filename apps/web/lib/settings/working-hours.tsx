import React from 'react';
import { TimePicker } from '@/components/ui/time-picker';
import { TimezoneDropDown } from './timezone-dropdown';
import {
	getActiveLanguageIdCookie,
	getActiveTimezoneIdCookie,
	setActiveTimezoneCookie,
	userTimezone
} from '@/app/helpers';
import { useForm } from 'react-hook-form';
import { useAtom } from 'jotai';
import { userState } from '@/app/stores';

import { useTranslations } from 'next-intl';

interface TimeSlot {
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
	const [user] = useAtom(userState);
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
		newSchedule[dayIndex].timeSlots.push({ startTime: '09:00', endTime: '17:00' });
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
		<div className="p-6 bg-white dark:bg-dark--theme-light rounded-lg shadow-sm">
			<div className="space-y-2">
				<div className="flex items-center mb-6">
					<p className="w-40 text-base font-medium text-gray-700 dark:text-gray-300">
						{t('common.TIME_ZONE')}
					</p>
					<div className="md:w-72">
						<TimezoneDropDown
							currentTimezone={currentTimezone}
							onChange={(t: string) => {
								handleChangeTimezone(t);
							}}
						/>
					</div>
				</div>
				{schedule.map((workDay, dayIndex) => (
					<div key={workDay.day} className={`relative rounded-lg`}>
						<div className="flex items-center px-4 py-2.5 gap-2 justify-between absolute -top-1 ">
							<div className="w-[180px]">
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
								className="ml-auto w-7 h-7 flex items-center justify-center bg-[#D8D0F84D] text-[#3826A6] hover:text-[#3826A6]/80 rounded hover:bg-[#DBD3FA]/20 top-2 right-0 absolute"
							>
								<span className="text-2xl leading-none">+</span>
							</button>
						)}
						{workDay.enabled &&
							workDay.timeSlots.map((timeSlot, slotIndex) => (
								<div key={slotIndex} className="flex items-center mb-3 pl-[180px] gap-x-5 ">
									<TimePicker
										value={timeSlot.startTime}
										onChange={(value) => handleTimeChange(dayIndex, slotIndex, 'startTime', value)}
										className="w-[100px] text-sm bg-white dark:bg-gray-700/50 dark:text-gray-300 rounded-md"
									/>
									<span className="text-gray-400 dark:text-gray-500 mx-1">-</span>
									<TimePicker
										value={timeSlot.endTime}
										onChange={(value) => handleTimeChange(dayIndex, slotIndex, 'endTime', value)}
										className="w-[100px] text-sm bg-white dark:bg-dark--theme-light dark:text-gray-400 "
									/>
									{workDay.timeSlots.length > 1 && (
										<button
											onClick={() => handleRemoveTimeSlot(dayIndex, slotIndex)}
											className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100/80 dark:hover:bg-gray-600/30"
										>
											<span className="text-xl leading-none font-medium">×</span>
										</button>
									)}
								</div>
							))}
						{!workDay.enabled && (
							<div className="pl-[180px] text-gray-400 dark:text-gray-500 text-sm py-3">Unavailable</div>
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
			className={`relative inline-flex h-[32px] w-16 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? 'bg-[#DBD3FA] dark:bg-purple-400/30' : 'bg-[#EDEDED] dark:bg-gray-600'}`}
			onClick={onToggle}
		>
			<span
				className={`${enabled ? 'bg-[#3826A6] dark:bg-purple-500' : 'bg-white dark:bg-gray-300'} pointer-events-none absolute left-1 top-[0.9px] inline-block h-6 w-6 transform rounded-full shadow-sm ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-7' : 'translate-x-0'}`}
			/>
		</button>
		{label && (
			<label className="ml-3 cursor-pointer select-none" onClick={onToggle}>
				<span className="font-medium text-gray-700 dark:text-gray-400">{label}</span>
			</label>
		)}
	</div>
);
