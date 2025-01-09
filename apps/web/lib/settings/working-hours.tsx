import React from 'react';
import { TimePicker } from '@/components/ui/time-picker';
import { Button } from '@/components/ui/button';
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
    const t = useTranslations();
    const [schedule, setSchedule] = React.useState<WorkDay[]>(
        initialSchedule || defaultWorkDays
    );

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

    const handleSave = () => {
        console.log('Saving work schedule:', schedule);
    };

    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold mb-4"></h2>
            <div className="space-y-4">
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
            <div className="mt-6">
                <Button onClick={handleSave} className="w-full">
                    {t('common.SAVE_CHANGES')}
                </Button>
            </div>
        </div>
    );
};
