import React, { useState, useEffect } from 'react';
import TimeKeeper from 'react-timekeeper';
import { FaClock, FaCaretDown } from 'react-icons/fa';
import { FaCheck } from "react-icons/fa";

const CustomTimePicker = ({ selectedTime, containerStyle }:
    { selectedTime: (timeVal: string) => void; containerStyle: string }) => {
    const getCurrentTime = (): string => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(Math.round(now.getMinutes() / 10) * 10).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const [value, setValue] = useState(getCurrentTime());
    const [isOpen, setIsOpen] = useState(false);

    const handleChange = (newValue: { minute: number, hour: number, meridiem: string }) => {

        const { min, h } = roundTimeToNearest10({ h: newValue.hour, min: newValue.minute });

        setValue(`${h}:${min}`);
    };

    const roundTimeToNearest10 = ({ h, min }: { h: number; min: number }) => {
        const roundedMinute = Math.round(min / 10) * 10;

        let hour = `${h % 24}`; let minute = `${roundedMinute}`;
        if (roundedMinute === 60) {
            if (h === 23) {
                hour = "00";
            } else {
                hour = `${(h + 1) % 24}`;
            }
            minute = "00";
        } else if (h === 24) {
            hour = "00";
        } else if(min === 0){
            minute = "00";
        }else {
            hour = `${h % 24}`;
            minute = `${roundedMinute}`;
        }
        return {
            h: hour,
            min: minute
        };
    }

    useEffect(() => {
        selectedTime(value);
    }, []);

    return (
        <div className={`relative ${containerStyle}`}>
            <div
                className="flex items-center justify-between p-2 border border-gray-300 rounded-md cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <FaClock className="text-gray-500" />
                <span className="ml-2">{value.replace(':', 'h')}</span>
                <FaCaretDown className="text-gray-500 ml-auto" />
            </div>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    <TimeKeeper
                        time={value}
                        onChange={(newTime) => handleChange(newTime)}
                        switchToMinuteOnHourSelect
                        closeOnMinuteSelect
                        coarseMinutes={10}
                        doneButton={() => <button
                            onClick={() => setIsOpen(false)}>
                            <FaCheck fill={"#"} /> Done</button>
                        }
                    />
                </div>
            )}
        </div>
    );
};

export default CustomTimePicker;
