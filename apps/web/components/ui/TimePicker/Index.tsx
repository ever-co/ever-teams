import React, { useState, useEffect } from 'react';
import TimeKeeper from 'react-timekeeper';
import { FaClock } from 'react-icons/fa';
import { FaCheck } from "react-icons/fa";
import { RiArrowDropDownLine } from "react-icons/ri";

const CustomTimePicker = ({ selectedTime, containerStyle, disabledTimeRange }:
    { selectedTime: (timeVal: string) => void; containerStyle: string; disabledTimeRange?: { from: string, to: string } | null }) => {
    const getCurrentTime = (): string => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(Math.round(now.getMinutes() / 10) * 10).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const [value, setValue] = useState(getCurrentTime());
    const [isOpen, setIsOpen] = useState(false);

    const formatTime = (time:String) => {
        const [hours, minutes] = time.split(':').map((part:any) => part.padStart(2, '0'));
        return `${hours}:${minutes}`;
    };

    const handleChange = (newValue: { minute: number, hour: number }) => {
        const formatedTime = formatTime(`${newValue.hour}:${newValue.minute}`)
        setValue(formatedTime);
        selectedTime(formatedTime);
    };

    useEffect(() => {
        selectedTime(value);
    }, []);

    return (
        <div className={`relative ${containerStyle}`}>
            <div
                className="flex items-center justify-between p-2 border border-gray-300 rounded-[10px] cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <FaClock className="text-gray-500" />
                <span className="ml-2 text-[13px] font-bold">{value.replace(':', 'h')}</span>
                <RiArrowDropDownLine size={30} className="text-gray-500 ml-auto" />
            </div>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    <TimeKeeper
                        time={value}
                        onChange={(newTime) => handleChange(newTime)}
                        switchToMinuteOnHourSelect
                        closeOnMinuteSelect
                        forceCoarseMinutes
                        coarseMinutes={10}
                        disabledTimeRange={disabledTimeRange? {...disabledTimeRange} : null}
                        doneButton={() => <button
                            className="flex items-center border-[1px] border-gray-300 rounded-[12px] px-[12px] font-bold text-[#25b15d]"
                            onClick={() => setIsOpen(false)}>
                            <FaCheck fill={"#25b15d"} size={20} className="mr-[8px]" /> Done</button>
                        }
                    />
                </div>
            )}
        </div>
    );
};

export default CustomTimePicker;
