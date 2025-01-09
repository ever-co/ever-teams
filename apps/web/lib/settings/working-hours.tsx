import React from 'react';
import { TimePicker } from '@/components/ui/time-picker';
import { TimezoneDropDown } from './timezone-dropdown';
import { getActiveLanguageIdCookie, getActiveTimezoneIdCookie, setActiveTimezoneCookie, userTimezone } from '@/app/helpers';
import { useForm } from 'react-hook-form';
import { useAtom } from 'jotai';
import { userState } from '@/app/stores';

interface WorkDay {
    day: string;
    startTime: string;
    endTime: string;
    enabled: boolean;
}

interface WorkScheduleProps {
    initialSchedule?: WorkDay[];
}

const defaultWorkDays: WorkDay[] = [
    { day: 'Monday', startTime: '09:00', endTime: '17:00', enabled: true },
    { day: 'Tuesday', startTime: '09:00', endTime: '17:00', enabled: true },
    { day: 'Wednesday', startTime: '09:00', endTime: '17:00', enabled: true },
    { day: 'Thursday', startTime: '09:00', endTime: '17:00', enabled: true },
    { day: 'Friday', startTime: '09:00', endTime: '17:00', enabled: true },
    { day: 'Saturday', startTime: '09:00', endTime: '17:00', enabled: false },
    { day: 'Sunday', startTime: '09:00', endTime: '17:00', enabled: false },
];

export const WorkingHours: React.FC<WorkScheduleProps> = ({ initialSchedule }) => {
    const [currentTimezone, setCurrentTimezone] = React.useState('');
    const [user] = useAtom(userState);

    const { setValue } = useForm();

    const [schedule, setSchedule] = React.useState<WorkDay[]>(
        initialSchedule || defaultWorkDays
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
    }, [currentTimezone, setValue, handleChangeTimezone]);

    React.useEffect(() => {
        setValue(
            'preferredLanguage',
            user?.preferredLanguage || getActiveLanguageIdCookie()
        );
    }, [user, user?.preferredLanguage, setValue]);

    const handleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
        const newSchedule = [...schedule];
        newSchedule[index] = {
            ...newSchedule[index],
            [field]: value,
        };
        setSchedule(newSchedule);
    };

    const handleToggleDay = (index: number) => {
        const newSchedule = [...schedule];
        newSchedule[index] = {
            ...newSchedule[index],
            enabled: !newSchedule[index].enabled,
        };
        setSchedule(newSchedule);
    };

    return (
        <div className="p-6">
            <div className="space-y-4">
                <div className='flex items-center space-x-4'>
                    <span className='text-2xl'>Timezone</span>
                    <TimezoneDropDown
                        currentTimezone={currentTimezone}
                        onChangeTimezone={(t: string) => {
                            handleChangeTimezone(t);
                        }}
                    />
                </div>
                {schedule.map((workDay, index) => (
                    <div key={workDay.day} className="flex items-center space-x-4">
                        <div className="w-32">
                            <label className="inline-flex items-center">
                                <input
                                    type="checkbox"
                                    checked={workDay.enabled}
                                    onChange={() => handleToggleDay(index)}
                                    className="form-checkbox h-5 w-5 text-primary"
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
            {/* <div className="mt-6">
                <Button onClick={handleSave} className="w-full">
                    {t('common.SAVE_CHANGES')}
                </Button>
            </div> */}
        </div>
    );
};
