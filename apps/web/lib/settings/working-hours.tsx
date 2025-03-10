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
import { renderTrackingIcon } from './table-action-popover';
import { useTranslations } from 'next-intl';

interface WorkDay {
	day: string;
	startTime: string;
	endTime: string;
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
		{ day: t('common.DAYOFWEEK.Monday'), startTime: '09:00', endTime: '17:00', enabled: true },
		{ day: t('common.DAYOFWEEK.Tuesday'), startTime: '09:00', endTime: '17:00', enabled: true },
		{ day: t('common.DAYOFWEEK.Wednesday'), startTime: '09:00', endTime: '17:00', enabled: true },
		{ day: t('common.DAYOFWEEK.Thursday'), startTime: '09:00', endTime: '17:00', enabled: true },
		{ day: t('common.DAYOFWEEK.Friday'), startTime: '09:00', endTime: '17:00', enabled: true },
		{ day: t('common.DAYOFWEEK.Saturday'), startTime: '09:00', endTime: '17:00', enabled: false },
		{ day: t('common.DAYOFWEEK.Sunday'), startTime: '09:00', endTime: '17:00', enabled: false }
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

	const handleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
		const newSchedule = [...schedule];
		newSchedule[index] = {
			...newSchedule[index],
			[field]: value
		};
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
		<div className="p-6">
			<div className="space-y-4">
				<div className="flex items-center space-x-4">
					<span className="text-2xl">Timezone</span>
					<TimezoneDropDown
						currentTimezone={currentTimezone}
						onChangeTimezone={(t: string) => {
							handleChangeTimezone(t);
						}}
					/>
				</div>
				{schedule.map((workDay, index) => (
					<div key={workDay.day} className="flex gap-4 items-center space-x-4">
						<div className="w-32">
							<label className="inline-flex items-center">
								<ToggleSwitch
									key={index}
									enabled={workDay.enabled}
									onToggle={() => handleToggleDay(index)}
									renderTrackingIcon={renderTrackingIcon}
								/>
								<span className="ml-2">{workDay.day}</span>
							</label>
						</div>
						<div className="flex items-center space-x-4">
							<TimePicker
								value={workDay.startTime}
								onChange={(value) => handleTimeChange(index, 'startTime', value)}
								disabled={!workDay.enabled}
							/>
							<span>to</span>
							<TimePicker
								value={workDay.endTime}
								onChange={(value) => handleTimeChange(index, 'endTime', value)}
								disabled={!workDay.enabled}
							/>
						</div>
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
				className={`w-4 h-4 rounded-full shadow-md transform transition-transform  ${enabled ? 'translate-x-0 bg-[#2ead81]' : 'translate-x-9 bg-[#ea3124]'}`}
			>
				{renderTrackingIcon(!enabled)}
			</div>
		</div>
	);
};
