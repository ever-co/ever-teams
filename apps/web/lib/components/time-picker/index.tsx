"use client"
import React, { useCallback, useState } from 'react'
import { TimerIcon } from "lucide-react"
import { cn } from "lib/utils"
import { Button } from "@components/ui/button"

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@components/ui/popover"
import { clsxm } from '@app/utils'

export type TimePickerValue = {
    hours: string;
    minute: string;
    meridiem: 'AM' | 'PM';
};

interface IPopoverTimepicker {
    defaultValue?: TimePickerValue;
    onChange?: (value: TimePickerValue) => void;
}

export function TimePicker({ onChange, defaultValue }: IPopoverTimepicker) {
    const [time, setTime] = useState({
        hours: defaultValue?.hours,
        minute: defaultValue?.minute,
        meridiem: defaultValue?.meridiem,
    });

    const handleTimeChange = (newTime: any) => {
        setTime(newTime);
        onChange!(newTime)
    };
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal dark:bg-dark--theme-light",
                        !time.minute && "text-muted-foreground"
                    )}
                >
                    <div className='flex items-center justify-between w-full text-[16px] font-medium'>
                        {time.hours !== '--' && time.minute !== '--' ? `${time.hours}:${time.minute} ${time.meridiem}` : <span>Time picker</span>}
                        <TimerIcon className="mr-2 h-4 w-4" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="flex items-start !w-52 left-0 dark:bg-dark--theme-light border border-transparent">
                <Timepicker onTimeChange={handleTimeChange} />
            </PopoverContent>
        </Popover>
    );
}



const Timepicker = ({ onTimeChange }: { onTimeChange: (_: any) => void }) => {
    const [time, setTime] = useState({
        hours: 0,
        minutes: 0,
        meridiem: true,
    });

    const handleHoursClick = useCallback((index: number) => {
        setTime((prev) => {
            const newTime = { ...prev, hours: index };
            onTimeChange({
                ...newTime,
                hours: String(index + 1).padStart(2, '0'),
                minute: String(newTime.minutes).padStart(2, '0'),
                meridiem: newTime.meridiem ? 'PM' : 'AM',
            });
            return newTime;
        });
    }, [onTimeChange]);

    const handleMinutesClick = useCallback((index: number) => {
        setTime((prev) => {
            const newTime = { ...prev, minutes: index };
            onTimeChange({
                ...newTime,
                hours: String(newTime.hours + 1).padStart(2, '0'),
                minute: String(index).padStart(2, '0'),
                meridiem: newTime.meridiem ? 'PM' : 'AM',
            });
            return newTime;
        });
    }, [onTimeChange]);

    const handleMeridiemClick = useCallback((isAM: any) => {
        setTime((prev) => {
            const newTime = { ...prev, meridiem: isAM };
            onTimeChange({
                ...newTime,
                hours: String(newTime.hours + 1).padStart(2, '0'),
                minute: String(newTime.minutes).padStart(2, '0'),
                meridiem: isAM ? 'PM' : 'AM',
            });
            return newTime;
        });
    }, [onTimeChange]);

    const renderButtons = (length: number, clickHandler: any, selectedIndex: number) => {
        return Array.from({ length }, (_, index) => (
            <TimerPickerButton
                key={index}
                title={String(length == 12 ? index + 1 : index).padStart(2, '0')}
                onClick={() => clickHandler(index)} // deepscan-disable-line
                variant={selectedIndex === index ? 'default' : 'outline'}
            />
        ));
    };

    return (
        <div className='h-48 justify-normal '>
            <div className='flex items-start justify-center h-48 w-full p-1'>
                <div
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                        overflow: '-moz-scrollbars-none',
                    }} className='flex flex-col h-48  overflow-scroll  p-1'>
                    {renderButtons(12, handleHoursClick, time.hours)}
                </div>
                <div style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    overflow: '-moz-scrollbars-none',
                }} className='flex flex-col h-48  overflow-scroll  p-1'>
                    {renderButtons(60, handleMinutesClick, time.minutes)}
                </div>
                <div className='flex flex-col py-1 p-1'>
                    <TimerPickerButton
                        onClick={() => handleMeridiemClick(!time.meridiem)} // deepscan-disable-line
                        variant={time.meridiem ? 'outline' : 'default'}
                        title={'AM'}
                    />
                    <TimerPickerButton
                        onClick={() => handleMeridiemClick(!time.meridiem)} // deepscan-disable-line REACT_INEFFICIENT_PURE_COMPONENT_PROP
                        variant={time.meridiem ? 'default' : 'outline'}
                        title={'PM'}
                    />
                </div>
            </div>
        </div>
    );
};

export default Timepicker;



interface TimerPickerButtonProps {
    title?: string;
    className?: string;
    onClick?: () => void;
    loading?: boolean;
    variant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null;
}

// eslint-disable-next-line react/display-name
const TimerPickerButton: React.FC<TimerPickerButtonProps> = React.memo(({
    title = '',
    className = 'border-none border-gray-100 ',
    onClick = () => null,
    loading = false,
    variant = 'default',
}) => {
    return (
        <Button
            disabled={loading}
            className={clsxm(className, { 'opacity-50 cursor-not-allowed': loading })}
            onClick={onClick}
            variant={variant}>
            {title}
        </Button>
    );
});
