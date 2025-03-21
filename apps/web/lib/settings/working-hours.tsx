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
		<div className="p-6 bg-white dark:bg-dark--theme-light rounded-lg shadow">
			<div className="space-y-3">
				<div className="flex items-center mb-8">
					<p className="w-40 text-lg font-semibold text-gray-900 dark:text-white">Timezone</p>
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
					<div
						key={workDay.day}
						className={`relative ${workDay.enabled ? 'bg-purple-50/50 dark:bg-purple-50/5 rounded-lg' : ''}`}
					>
						<div className="flex items-center mb-3 px-4 pt-3">
							<div className="w-40 flex items-center relative">
								<div className="flex items-center">
									<button
										type="button"
										className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${workDay.enabled ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'}`}
										onClick={() => handleToggleDay(dayIndex)}
									>
										<span
											className={`pointer-events-none relative inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${workDay.enabled ? 'translate-x-3.5' : 'translate-x-0'}`}
										/>
									</button>
									<label
										className="ml-2.5 cursor-pointer select-none"
										onClick={() => handleToggleDay(dayIndex)}
									>
										<span className="font-medium text-gray-700 dark:text-gray-400">
											{workDay.day}
										</span>
									</label>
								</div>
							</div>
							{workDay.enabled && (
								<button
									onClick={() => handleAddTimeSlot(dayIndex)}
									className="ml-auto w-5 h-5 flex items-center justify-center text-purple-600 hover:text-purple-700 rounded-sm hover:bg-purple-50/50"
								>
									<span className="text-xl leading-none">+</span>
								</button>
							)}
						</div>
						{workDay.enabled &&
							workDay.timeSlots.map((timeSlot, slotIndex) => (
								<div key={slotIndex} className="flex items-center mb-2 pl-14 space-x-2">
									<TimePicker
										value={timeSlot.startTime}
										onChange={(value) => handleTimeChange(dayIndex, slotIndex, 'startTime', value)}
										className="w-[104px] text-sm bg-white dark:bg-dark--theme-light dark:text-gray-400"
									/>
									<span className="text-gray-500 mx-2">-</span>
									<TimePicker
										value={timeSlot.endTime}
										onChange={(value) => handleTimeChange(dayIndex, slotIndex, 'endTime', value)}
										className="w-[104px] text-sm bg-white dark:bg-dark--theme-light dark:text-gray-400"
									/>
									{workDay.timeSlots.length > 1 && (
										<button
											onClick={() => handleRemoveTimeSlot(dayIndex, slotIndex)}
											className="w-5 h-5 flex items-center justify-center text-gray-400 dark:text-gray-400 hover:text-gray-600 rounded-sm hover:bg-gray-50/50"
										>
											<span className="text-lg leading-none">×</span>
										</button>
									)}
								</div>
							))}
						{!workDay.enabled && <div className="pl-14 text-gray-400 text-sm py-2">Unavailable</div>}
					</div>
				))}
			</div>
		</div>
	);
};

interface ToggleSwitchProps {
	enabled: boolean;
	onToggle: () => void;
	renderTrackingIcon: (enabled: boolean) => React.ReactNode;
}

/**
 * A toggle switch component that can be used to toggle a setting on and off.
 * The component takes in three props: enabled, onToggle, and renderTrackingIcon.
 * The enabled prop is a boolean that indicates whether the setting is currently enabled or not.
 * The onToggle prop is a function that is called when the user clicks on the toggle switch.
 * The renderTrackingIcon prop is a function that is called to render the icon that is displayed
 * on the toggle switch. The function takes a boolean argument indicating whether the setting
 * is enabled or not.
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onToggle, renderTrackingIcon }) => {
	return (
		<div
			className={`flex items-center p-1 w-14 h-6 rounded-full transition-colors cursor-pointer`}
			onClick={onToggle}
			style={
				enabled
					? { background: '#2ead805b' }
					: { background: 'linear-gradient(to right, #ea31244d, #ea312479)' }
			}
		>
			<div
				className={`w-4 h-4 rounded-full shadow-md transform transition-transform  ${enabled ? 'translate-x-0 bg-[#2ead81]' : 'translate-x-8 bg-[#ea3124]'}`}
			>
				{renderTrackingIcon(!enabled)}
			</div>
		</div>
	);
};
