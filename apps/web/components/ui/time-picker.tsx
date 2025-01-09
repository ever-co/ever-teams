import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Input } from './input';

interface TimePickerProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}

const generateTimeOptions = () => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 10) {
            const formattedHour = hour.toString().padStart(2, '0');
            const formattedMinute = minute.toString().padStart(2, '0');
            options.push(`${formattedHour}:${formattedMinute}`);
        }
    }
    return options;
};

const isValidTimeFormat = (time: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
};

const formatTime = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const formattedHours = hours.padStart(2, '0');
    const formattedMinutes = minutes ? minutes.padStart(2, '0') : '00';
    return `${formattedHours}:${formattedMinutes}`;
};

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, disabled }) => {
    const [inputValue, setInputValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);
    const timeOptions = generateTimeOptions();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        // Auto-format as user types
        if (newValue.length === 2 && !newValue.includes(':')) {
            setInputValue(newValue + ':');
        }
    };

    const handleInputBlur = () => {
        setIsEditing(false);
        if (isValidTimeFormat(inputValue)) {
            const formattedTime = formatTime(inputValue);
            setInputValue(formattedTime);
            onChange(formattedTime);
        } else {
            setInputValue(value);
        }
    };

    const handleSelectChange = (newValue: string) => {
        setInputValue(newValue);
        onChange(newValue);
    };

    return (
        <div className="relative bg-light--theme-light dark:bg-dark--theme-light dark:text-white font-normal">
            {isEditing ? (
                <Input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    placeholder="HH:MM"
                    className="w-[120px]"
                    maxLength={5}
                    disabled={disabled}
                    pattern="[0-2][0-9]:[0-5][0-9]"
                />
            ) : (
                <Select
                    value={value}
                    onValueChange={handleSelectChange}
                    disabled={disabled}
                    onOpenChange={(open) => {
                        if (!open) {
                            setIsEditing(false);
                        }
                    }}>
                    <SelectTrigger
                        className="w-[120px] bg-light--theme-light dark:bg-dark--theme-light dark:text-white font-normal border-[#0000001A] dark:border-[#26272C] "
                        onClick={() => setIsEditing(true)}>
                        <SelectValue placeholder="Select time">
                            {value}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto ">
                        <div className="p-2 border-b">
                            <Input
                                type="text"
                                value={inputValue}
                                onChange={handleInputChange}
                                onBlur={handleInputBlur}
                                placeholder="HH:MM"
                                className="mb-2 bg-light--theme-light dark:bg-dark--theme-light dark:text-white font-normal "
                                maxLength={5}
                            />
                        </div>
                        <div className="overflow-y-auto">
                            {timeOptions.map((time) => (
                                <SelectItem
                                    key={time}
                                    value={time}
                                    className="hover:bg-gray-100 dark:hover:bg-gray-800 bg-light--theme-light dark:bg-dark--theme-light dark:text-white font-normal ">
                                    {time}
                                </SelectItem>
                            ))}
                        </div>
                    </SelectContent>
                </Select>
            )}
        </div>
    );
};
